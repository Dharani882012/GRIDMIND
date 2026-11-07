# GRIDMIND – Coimbatore Smart City Resource Intelligence Platform

GRIDMIND is an academic smart-city prototype built with React + Vite, FastAPI and SQLite.

## Updated in this version

1. **Command Center and Traffic Intelligence:** the Command Center is now an operational summary. The dedicated Traffic Intelligence page owns the traffic map and road-segment breakdown, avoiding repeated traffic panels.
2. **Global Search:** search the nine city workspaces, choose a result to navigate, or press `Ctrl + K` / `Cmd + K` to focus the search.
3. **User profile:** the account control allows a display name and email address. These details are stored in the current browser only. This prototype does **not** implement server-side login, passwords, or authenticated accounts.
4. **Energy CSV import:** displays selected filename and an import summary after the data refresh.
5. **Water CSV import:** uses the backend's actual response fields and displays imported, duplicate and failed counts.
6. **Waste CSV import:** uses the backend's actual response fields and displays imported, duplicate and failed counts.
7. **Duplicate handling:** records are uniquely identified by module + zone + normalized timestamp + metric. Repeated rows are skipped.
8. **Import feedback:** successful imports show rows checked, imported, duplicates skipped and failed. Invalid files show the backend validation error; the selected file remains available for retry.
9. **Water level explanation:** the Water Systems page explains the latest tank-level reading, the average of uploaded readings, and how to interpret a percentage value. Prediction output is labelled as a statistical estimate from uploaded history.

## Run the backend

From the `backend` folder (Windows PowerShell):

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Run the frontend

From the `frontend` folder:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`.

## CSV format

Required columns:

```csv
timestamp,zone,metric,value
2026-11-01T09:00:00,Peelamedu,water_level,75
```

Optional column: `unit`.

- Energy module: `consumption`, `production`, `supply`, or other documented energy metrics.
- Water module: `water_level`, `water_inflow`, `water_consumption`, `water_supply`, etc.
- Waste module: `bin_fill_level`, `waste_quantity`, `collection_count`, etc.
- Traffic module: `vehicle_count`, `traffic_density`, `average_speed`, etc.

Use consistent units within each zone and metric. At least 10 timestamped records for a selected zone + metric are required for a prediction.

## Data and prototype limitations

- No live TANGEDCO, municipal, traffic-sensor, water-sensor or waste-sensor integration is connected.
- Traffic road-segment status is illustrative/static unless historical traffic CSV data is uploaded.
- Energy, Water, Waste and historical Traffic charts use uploaded CSV records.
- Water and Waste citizen reports are saved in browser `localStorage`; they are visible only in that browser.
- Accident and Energy outage reports are stored by the local FastAPI backend.
- Predictions use a simple linear-regression baseline. They are not official forecasts or an advanced trained ML model.
- Profile details are browser-local; there is no real authentication system in this academic prototype.

## Validation performed for this update

- Frontend JSX parsed successfully with the Babel JSX parser.
- Backend Python files passed `py_compile`.
- FastAPI CSV import tests passed for Energy, Water, Waste and Traffic.
- Duplicate-row tests confirmed repeated rows are skipped.
- Invalid CSV validation returned the expected HTTP 400 response.

A full Vite production build could not be completed in the current Linux validation environment because the uploaded `node_modules` did not include Rollup's Linux optional binary. Reinstall dependencies in the target Windows development environment with `npm install`, then run `npm run build` before deployment.

## Deployment

Public deployment is intentionally left as the final project step. Configure the production API URL, persistent backend storage and CORS origins before deploying.
