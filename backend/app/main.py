from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from .data import BASE_SEGMENTS
from .storage import DATA_DIR
from .intelligence import router as intelligence_router

app = FastAPI(title="GRIDMIND Coimbatore API", version="2.1.0")
app.include_router(intelligence_router)
import os

_allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    # Allows Vercel production and preview deployments; explicit origins remain configurable above.
    allow_origin_regex=r"https://[a-zA-Z0-9-]+\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = DATA_DIR / "accidents.json"
DATA_LOCK = Lock()
OUTAGE_FILE = DATA_DIR / "energy_outages.json"


def read_accidents() -> list[dict]:
    with DATA_LOCK:
        if not DATA_FILE.exists():
            DATA_FILE.write_text("[]", encoding="utf-8")
        try:
            data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else []
        except (json.JSONDecodeError, OSError):
            return []


def write_accidents(items: list[dict]) -> None:
    with DATA_LOCK:
        temp = DATA_FILE.with_suffix(".tmp")
        temp.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")
        temp.replace(DATA_FILE)


def read_outages() -> list[dict]:
    with DATA_LOCK:
        if not OUTAGE_FILE.exists():
            OUTAGE_FILE.write_text("[]", encoding="utf-8")
        try:
            data = json.loads(OUTAGE_FILE.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else []
        except (json.JSONDecodeError, OSError):
            return []


def write_outages(items: list[dict]) -> None:
    with DATA_LOCK:
        temp = OUTAGE_FILE.with_suffix(".tmp")
        temp.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")
        temp.replace(OUTAGE_FILE)


class AccidentCreate(BaseModel):
    title: str = Field(default="Road accident report", min_length=3, max_length=120)
    location_name: str = Field(min_length=2, max_length=240)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    affected_road: str = Field(default="Not specified", max_length=160)
    severity: str = Field(default="Medium")
    description: str = Field(default="", max_length=1000)

    @field_validator("severity")
    @classmethod
    def valid_severity(cls, value: str) -> str:
        if value not in {"Low", "Medium", "High"}:
            raise ValueError("Severity must be Low, Medium, or High")
        return value


class OutageCreate(BaseModel):
    zone: str = Field(min_length=2, max_length=120)
    location: str = Field(min_length=2, max_length=240)
    issue: str = Field(min_length=3, max_length=500)
    affected_area: str = Field(default="Not specified", max_length=160)
    priority: str = Field(default="Medium")

    @field_validator("priority")
    @classmethod
    def valid_priority(cls, value: str) -> str:
        if value not in {"Low", "Medium", "High", "Critical"}:
            raise ValueError("Priority must be Low, Medium, High, or Critical")
        return value


class StatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def valid_status(cls, value: str) -> str:
        if value not in {"Pending", "Resolved"}:
            raise ValueError("Status must be Pending or Resolved")
        return value


@app.get("/")
def root():
    return {"message": "GRIDMIND Coimbatore API is running", "version": "2.0.0"}


@app.get("/api/traffic")
def get_traffic():
    return {"segments": BASE_SEGMENTS, "simulated": True,
            "note": "Illustrative traffic layer; accident reports are user submitted."}


@app.get("/api/accidents")
def get_accidents():
    return {"accidents": sorted(read_accidents(), key=lambda item: item["created_at"], reverse=True)}


@app.post("/api/accidents", status_code=201)
def create_accident(payload: AccidentCreate):
    item = payload.model_dump()
    item.update({
        "id": f"ACC-{uuid4().hex[:8].upper()}",
        "status": "Pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    records = read_accidents()
    records.append(item)
    write_accidents(records)
    return {"accident": item, "message": "Accident report submitted."}


@app.patch("/api/accidents/{accident_id}/status")
def update_accident_status(accident_id: str, payload: StatusUpdate):
    records = read_accidents()
    for item in records:
        if item["id"] == accident_id:
            item["status"] = payload.status
            item["updated_at"] = datetime.now(timezone.utc).isoformat()
            write_accidents(records)
            return {"accident": item, "message": f"Report marked {payload.status.lower()}."}
    raise HTTPException(status_code=404, detail="Accident report not found")


@app.get("/api/energy")
def get_energy():
    outages = read_outages()
    active = sum(1 for item in outages if item["status"] == "Pending")
    return {
        "zones": [], "outages": sorted(outages, key=lambda item: item["created_at"], reverse=True),
        "total_usage_kwh": None, "active_outages": active,
        "zones_monitored": 0, "grid_health": None,
        "data_mode": "NO VERIFIED LIVE ENERGY FEED CONNECTED"
    }


@app.post("/api/energy/outages", status_code=201)
def create_energy_outage(payload: OutageCreate):
    item = payload.model_dump()
    now = datetime.now(timezone.utc).isoformat()
    item.update({"id": f"EN-{uuid4().hex[:8].upper()}", "status": "Pending", "created_at": now, "updated_at": now})
    records = read_outages()
    records.append(item)
    write_outages(records)
    return {"outage": item, "message": "Power issue report submitted."}


@app.patch("/api/energy/outages/{outage_id}/status")
def update_energy_outage_status(outage_id: str, payload: StatusUpdate):
    records = read_outages()
    for item in records:
        if item["id"] == outage_id:
            item["status"] = payload.status
            item["updated_at"] = datetime.now(timezone.utc).isoformat()
            write_outages(records)
            return {"outage": item, "message": f"Outage marked {payload.status.lower()}."}
    raise HTTPException(status_code=404, detail="Energy outage report not found")


@app.get("/api/overview")
def overview():
    accidents = read_accidents()
    pending = sum(1 for item in accidents if item["status"] == "Pending")
    return {
        "city": "Coimbatore", "traffic_index": 64, "active_alerts": pending,
        "avg_speed": 34, "resource_health": 91,
        "total_accidents": len(accidents), "resolved_accidents": len(accidents) - pending,
        "data_mode": "USER-REPORTED ACCIDENTS · ILLUSTRATIVE TRAFFIC DATA",
    }
