
"""GRIDMIND Data Intelligence API
CSV upload, historical records and baseline predictions.
No demo data is generated.
"""

import csv
import io
import math
import sqlite3

from pathlib import Path
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from .storage import DATA_DIR

router = APIRouter(
    prefix="/api/intelligence",
    tags=["Data Intelligence"]
)

DB_PATH = DATA_DIR / "gridmind_history.sqlite3"

MODULES = {"energy", "water", "waste", "traffic"}
MIN_POINTS = 10
MAX_UPLOAD_SIZE = 5 * 1024 * 1024


def get_connection():
    connection = sqlite3.connect(DB_PATH, timeout=20)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                module TEXT NOT NULL,
                zone TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                metric TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT DEFAULT '',
                source TEXT NOT NULL,
                imported_at TEXT NOT NULL,
                UNIQUE(module, zone, timestamp, metric)
            )
        """)


initialize_database()


def validate_timestamp(value):
    try:
        parsed = datetime.fromisoformat(
            value.strip().replace("Z", "+00:00")
        )

        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)

        return parsed.astimezone(timezone.utc)

    except (ValueError, AttributeError):
        raise ValueError(f"Invalid timestamp: {value}")


@router.get("/status")
def data_status():

    with get_connection() as connection:
        rows = connection.execute("""
            SELECT
                module,
                COUNT(*) AS records,
                MIN(timestamp) AS first_record,
                MAX(timestamp) AS last_record
            FROM readings
            GROUP BY module
        """).fetchall()

    modules = {
        module: {
            "records": 0,
            "first_record": None,
            "last_record": None,
            "source": "NO DATA"
        }
        for module in MODULES
    }

    for row in rows:
        modules[row["module"]] = {
            "records": row["records"],
            "first_record": row["first_record"],
            "last_record": row["last_record"],
            "source": "HISTORICAL CSV"
        }

    return {
        "modules": modules,
        "prediction_minimum_records": MIN_POINTS,
        "demo_data_used": False
    }


@router.post("/import/{module}")
async def import_csv(
    module: str,
    file: UploadFile = File(...)
):

    module = module.lower()

    if module not in MODULES:
        raise HTTPException(
            status_code=404,
            detail="Unknown module. Use energy, water, waste or traffic."
        )

    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a CSV file."
        )

    raw = await file.read(MAX_UPLOAD_SIZE + 1)
    await file.close()

    if not raw:
        raise HTTPException(
            status_code=400,
            detail="CSV file is empty."
        )

    if len(raw) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Maximum CSV upload size is 5 MB."
        )

    try:
        content = raw.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(content))

        required_columns = {
            "timestamp",
            "zone",
            "metric",
            "value"
        }

        headers = {
            header.strip().lower()
            for header in (reader.fieldnames or [])
            if header
        }

        if not required_columns.issubset(headers):
            raise ValueError(
                "Required columns: timestamp, zone, metric, value. "
                "Optional column: unit."
            )

        records = []

        for line_number, item in enumerate(reader, start=2):

            row = {
                str(key).strip().lower(): (value or "").strip()
                for key, value in item.items()
                if key
            }

            if not any(row.values()):
                continue

            timestamp = validate_timestamp(
                row.get("timestamp", "")
            )

            zone = row.get("zone", "")
            metric = row.get("metric", "")

            if not zone or not metric:
                raise ValueError(
                    f"Line {line_number}: zone and metric are required."
                )

            try:
                value = float(row.get("value", ""))
            except ValueError:
                raise ValueError(
                    f"Line {line_number}: value must be numeric."
                )

            if not math.isfinite(value):
                raise ValueError(
                    f"Line {line_number}: invalid numeric value."
                )

            records.append((
                module,
                zone,
                timestamp.isoformat(),
                metric,
                value,
                row.get("unit", "")
            ))

        if not records:
            raise ValueError("No valid data rows found.")

    except (UnicodeDecodeError, csv.Error, ValueError) as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    inserted = 0
    imported_at = datetime.now(timezone.utc).isoformat()

    with get_connection() as connection:

        for record in records:

            cursor = connection.execute("""
                INSERT OR IGNORE INTO readings (
                    module,
                    zone,
                    timestamp,
                    metric,
                    value,
                    unit,
                    source,
                    imported_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                *record,
                "HISTORICAL_CSV",
                imported_at
            ))

            inserted += cursor.rowcount

    return {
        "module": module,
        "filename": file.filename,
        "rows_received": len(records),
        "rows_inserted": inserted,
        "duplicates_skipped": len(records) - inserted,
        "rows_failed": 0,
        "source": "HISTORICAL_CSV",
        "demo_data_used": False,
        "message": "CSV imported successfully."
    }


@router.get("/records/{module}")
def get_records(
    module: str,
    zone: str | None = None,
    metric: str | None = None,
    limit: int = Query(500, ge=1, le=5000)
):

    module = module.lower()

    if module not in MODULES:
        raise HTTPException(
            status_code=404,
            detail="Unknown module."
        )

    query = """
        SELECT * FROM readings
        WHERE module = ?
    """

    parameters = [module]

    if zone:
        query += " AND zone = ?"
        parameters.append(zone)

    if metric:
        query += " AND metric = ?"
        parameters.append(metric)

    query += " ORDER BY timestamp DESC LIMIT ?"
    parameters.append(limit)

    with get_connection() as connection:
        rows = connection.execute(
            query,
            parameters
        ).fetchall()

    return {
        "module": module,
        "count": len(rows),
        "records": [dict(row) for row in rows],
        "source": "HISTORICAL_CSV" if rows else "NO DATA"
    }


def calculate_forecast(points, horizon):

    origin = points[0][0]

    x_values = [
        (timestamp - origin).total_seconds() / 86400
        for timestamp, value in points
    ]

    y_values = [value for timestamp, value in points]

    count = len(x_values)

    x_mean = sum(x_values) / count
    y_mean = sum(y_values) / count

    denominator = sum(
        (x - x_mean) ** 2 for x in x_values
    )

    if denominator == 0:
        return None

    slope = sum(
        (x - x_mean) * (y - y_mean)
        for x, y in zip(x_values, y_values)
    ) / denominator

    intercept = y_mean - slope * x_mean

    intervals = sorted(
        x_values[index] - x_values[index - 1]
        for index in range(1, count)
        if x_values[index] > x_values[index - 1]
    )

    step_days = (
        intervals[len(intervals) // 2]
        if intervals else 1
    )

    forecasts = []

    for step in range(1, horizon + 1):

        future_x = x_values[-1] + step_days * step

        predicted = intercept + slope * future_x

        future_time = points[-1][0] + timedelta(
            days=step_days * step
        )

        forecasts.append({
            "timestamp": future_time.isoformat(),
            "predicted_value": round(predicted, 3)
        })

    return forecasts


@router.get("/predict/{module}")
def predict(
    module: str,
    zone: str,
    metric: str,
    horizon: int = Query(3, ge=1, le=14)
):

    module = module.lower()

    if module not in MODULES:
        raise HTTPException(
            status_code=404,
            detail="Unknown module."
        )

    with get_connection() as connection:

        rows = connection.execute("""
            SELECT timestamp, value, unit
            FROM readings
            WHERE module = ?
            AND zone = ?
            AND metric = ?
            ORDER BY timestamp
        """, (
            module,
            zone,
            metric
        )).fetchall()

    if len(rows) < MIN_POINTS:

        return {
            "status": "INSUFFICIENT_DATA",
            "module": module,
            "zone": zone,
            "metric": metric,
            "records_available": len(rows),
            "records_required": MIN_POINTS,
            "prediction": None,
            "message": (
                "At least 10 genuine historical records are required. "
                "No prediction generated."
            )
        }

    points = [
        (
            validate_timestamp(row["timestamp"]),
            float(row["value"])
        )
        for row in rows
    ]

    forecast = calculate_forecast(
        points,
        horizon
    )

    if forecast is None:
        return {
            "status": "INSUFFICIENT_TIME_VARIATION",
            "records_available": len(rows),
            "prediction": None,
            "message": "Historical timestamps must vary."
        }

    return {
        "status": "PREDICTION_AVAILABLE",
        "module": module,
        "zone": zone,
        "metric": metric,
        "unit": rows[-1]["unit"],
        "records_used": len(rows),
        "method": "LINEAR_REGRESSION_BASELINE",
        "source": "HISTORICAL_CSV",
        "prediction": forecast,
        "disclaimer": (
            "Baseline statistical estimate, not an official utility forecast."
        )
    }
