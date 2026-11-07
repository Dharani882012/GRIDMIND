# GRIDMIND public deployment

GRIDMIND uses a React/Vite frontend and FastAPI backend. Deploy them separately.

## 1. Deploy the backend on Render
1. Push this project folder to a GitHub repository. Do not commit `frontend/node_modules`, Python virtual environments, or secrets.
2. In Render, choose **New + → Blueprint** and connect the repository. Select the repository root containing `render.yaml`.
3. Render reads `render.yaml` and creates `gridmind-api`. The blueprint uses a persistent disk at `/var/data` so SQLite history, accident reports, and energy outage reports survive service restarts. A persistent disk requires a paid Render service.
4. After deployment, copy the service URL, for example `https://gridmind-api.onrender.com`. Test `https://YOUR-SERVICE.onrender.com/` and `/docs`.

## 2. Deploy the frontend on Vercel
1. In Vercel, import the same GitHub repository. Set the **Root Directory** to `frontend`.
2. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
3. Add environment variable `VITE_API_URL` with the Render service URL (no trailing slash).
4. Deploy. Vercel will provide a public `https://...vercel.app` URL.

## 3. Finish CORS configuration
1. In Render → `gridmind-api` → Environment, set `CORS_ORIGINS` to the exact Vercel production URL, for example `https://gridmind-city.vercel.app` (no trailing slash).
2. Save changes and redeploy/restart the backend.
3. If you later add a custom domain, add that exact origin to `CORS_ORIGINS` as a comma-separated value.

## Important
- The frontend API URL is configurable with `VITE_API_URL`; local development still defaults to `http://127.0.0.1:8000`.
- Do not use `localhost` or `127.0.0.1` as the deployed API URL.
- CSV history and report data are stored on the Render persistent disk. Keep the disk attached to the service.
- User profile details remain browser-local; this project does not implement server-side authentication.
- Public hosting makes the website reachable by anyone with the link; it does not make the data feed live. Traffic remains illustrative unless a real data source is connected.
