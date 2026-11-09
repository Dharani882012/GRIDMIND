import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet'
import {
  Activity, AlertTriangle, Bell, CarFront, Droplets, Gauge, Layers3, Zap,
  Route, BrainCircuit, BarChart3, Menu, Search, ArrowUpRight, Wind,
  ShieldCheck, Clock3, MapPin, ChevronRight, Siren, Recycle, TrendingUp,
  Crosshair, Navigation, RotateCcw, CheckCircle2, Plus, ListChecks, X, UserRound, Settings2
} from 'lucide-react'
import 'leaflet/dist/leaflet.css'

const API = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const center = [11.0168, 76.9558]
const colors = { low: '#20c997', medium: '#f4bd50', high: '#ff647c' }
const nav = [
  { id: 'overview', label: 'Command Center', icon: Gauge, group: 'OPERATIONS' },
  { id: 'traffic', label: 'Traffic Intelligence', icon: CarFront },
  { id: 'emergency', label: 'Emergency Response', icon: Siren },
  { id: 'routes', label: 'Route Optimizer', icon: Route, group: 'CITY SYSTEMS' },
  { id: 'energy', label: 'Energy Network', icon: Zap },
  { id: 'water', label: 'Water Systems', icon: Droplets },
  { id: 'waste', label: 'Waste Operations', icon: Recycle },
  { id: 'insights', label: 'AI Predictions', icon: BrainCircuit, group: 'INTELLIGENCE' },
  { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
]

function MapResize() {
  const map = useMap()
  useEffect(() => { const t = setTimeout(() => map.invalidateSize(), 180); return () => clearTimeout(t) }, [map])
  return null
}

function MapBase({ children, mapCenter = center, zoom = 12.5 }) {
  return <MapContainer center={mapCenter} zoom={zoom} scrollWheelZoom className="city-map">
    <MapResize />
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    {children}
  </MapContainer>
}

function AccidentMarkers({ accidents = [] }) {
  return accidents.map(a => <CircleMarker key={a.id} center={[a.latitude, a.longitude]} radius={11}
    pathOptions={{ color: '#fff', weight: 2, fillColor: '#ff334f', fillOpacity: 1 }}>
    <Popup><b>{a.title}</b><br />{a.location_name}<br />{a.affected_road}<br />Status: {a.status}<br />Severity: {a.severity}</Popup>
  </CircleMarker>)
}

function TrafficMap({ traffic, accidents = [] }) {
  return <div className="map-frame">
    <MapBase>
      {traffic.map(s => <Polyline key={s.id} positions={s.coords} pathOptions={{ color: colors[s.level], weight: 6, opacity: .85 }}>
        <Popup><b>{s.name}</b><br />Traffic: {s.level}<br />Estimated speed: {s.speed} km/h<br /><em>Illustrative traffic data</em></Popup>
      </Polyline>)}
      <AccidentMarkers accidents={accidents} />
    </MapBase>
    <div className="map-chip"><span className="pulse-dot" /> COIMBATORE GIS · USER REPORTS</div>
    <div className="map-legend"><b>MAP LEGEND</b><span><i className="green" /> Smooth traffic</span><span><i className="yellow" /> Moderate</span><span><i className="red" /> Accident / congested</span></div>
  </div>
}

function Metric({ label, value, unit, icon: Icon, tone, delta, sub }) {
  return <article className="metric-card"><div className="metric-head"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={17} /></span></div>
    <div className="metric-value">{value}<small>{unit}</small></div><div className="metric-foot"><span className="metric-delta">{delta}</span><span>{sub}</span></div></article>
}

function RoadTable({ traffic }) {
  return <div className="road-table"><div className="road-table-head"><span>ROAD / ZONE</span><span>STATUS</span><span>SPEED</span><span>LOAD</span></div>
    {traffic.map(r => <div className="road-row" key={r.id}><div><b>{r.name}</b><small>Coimbatore corridor</small></div><span className={`traffic-status ${r.level}`}><i />{r.level}</span><b>{r.speed} <small>km/h</small></b><div className="load-track"><i style={{ width: `${r.level === 'high' ? 90 : r.level === 'medium' ? 60 : 34}%` }} /></div></div>)}
  </div>
}

function AccidentReportForm({ onCreated }) {
  const [form, setForm] = useState({ title: 'Road accident report', location_name: '', latitude: '', longitude: '', affected_road: '', severity: 'Medium', description: '' })
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const set = (key, value) => setForm(old => ({ ...old, [key]: value }))

  async function locate() {
    if (!form.location_name.trim()) { setNote('Enter a location name first.'); return }
    setBusy(true); setNote('Finding location…')
    try {
      const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(form.location_name + ', Coimbatore, India')}&limit=1`)
      if (!res.ok) throw new Error('Location search is unavailable.')
      const data = await res.json()
      const feature = data.features?.[0]
      if (!feature) throw new Error('Location not found. Try a nearby landmark or road name.')
      const [longitude, latitude] = feature.geometry.coordinates
      setForm(old => ({ ...old, latitude: String(latitude), longitude: String(longitude), location_name: [feature.properties.name, feature.properties.street, feature.properties.city].filter(Boolean).join(', ') || old.location_name }))
      setNote(`Location pinned: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
    } catch (e) { setNote(e.message) } finally { setBusy(false) }
  }

  async function submit(e) {
    e.preventDefault()
    if (form.latitude === '' || form.longitude === '') { setNote('Search and pin the accident location before submitting.'); return }
    setBusy(true); setNote('Submitting report…')
    try {
      const res = await fetch(`${API}/api/accidents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Could not submit report.')
      setNote('Accident report submitted successfully.')
      setForm({ title: 'Road accident report', location_name: '', latitude: '', longitude: '', affected_road: '', severity: 'Medium', description: '' })
      onCreated()
    } catch (e) { setNote(e.message) } finally { setBusy(false) }
  }

  const field = { width: '100%', padding: 12, borderRadius: 9, border: '1px solid var(--border, #293247)', background: '#0d1a29', color: '#fff', marginTop: 7 }
  return <form onSubmit={submit} className="surface report-form">
    <div className="eyebrow">NEW USER REPORT</div><h3>Report a road accident</h3><p className="muted-copy">Enter the accident location, pin it on the map, and submit. New reports start as Pending.</p>
    <label>Accident title<input style={field} value={form.title} onChange={e => set('title', e.target.value)} required /></label>
    <label style={{ display: 'block', marginTop: 13 }}>Location / landmark<input style={field} placeholder="e.g. Trichy Road, Ramanathapuram" value={form.location_name} onChange={e => { set('location_name', e.target.value); set('latitude', ''); set('longitude', '') }} required /></label>
    <button type="button" className="outline-btn" style={{ marginTop: 9 }} onClick={locate} disabled={busy}><Search size={14} /> Search & pin location</button>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
      <label>Latitude<input style={field} value={form.latitude} readOnly placeholder="Auto-filled" /></label>
      <label>Longitude<input style={field} value={form.longitude} readOnly placeholder="Auto-filled" /></label>
    </div>
    <label style={{ display: 'block', marginTop: 13 }}>Affected road<input style={field} value={form.affected_road} onChange={e => set('affected_road', e.target.value)} placeholder="e.g. Trichy Road" /></label>
    <label style={{ display: 'block', marginTop: 13 }}>Severity<select style={field} value={form.severity} onChange={e => set('severity', e.target.value)}><option>Low</option><option>Medium</option><option>High</option></select></label>
    <label style={{ display: 'block', marginTop: 13 }}>Description<textarea style={{ ...field, minHeight: 80, resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional details" /></label>
    <button className="primary-btn" style={{ width: '100%', marginTop: 16 }} disabled={busy}><Plus size={15} /> {busy ? 'Please wait…' : 'Submit accident report'}</button>
    {note && <p className="muted-copy" role="status" style={{ marginTop: 10 }}>{note}</p>}
  </form>
}

function AccidentList({ accidents, onStatus }) {
  return <section className="surface wide-surface"><div className="surface-head"><div><div className="eyebrow">INCIDENT REGISTER</div><h3>Reported accidents</h3><p>Every submitted report is stored by the backend.</p></div><span className="severity-tag">{accidents.length} TOTAL</span></div>
    {!accidents.length ? <div className="calm-state large"><ShieldCheck size={26} /><b>No accident reports yet</b><small>Reports submitted through this form will appear here.</small></div> : accidents.map(a => <article key={a.id} className="incident-detail" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}><div><span className={`status ${a.status === 'Pending' ? 'danger' : 'ready'}`}>{a.status.toUpperCase()}</span><h3 style={{ marginTop: 10 }}>{a.title}</h3><p>{a.location_name} · {a.affected_road}</p></div><b style={{ color: a.status === 'Pending' ? '#ff647c' : '#20c997' }}>{a.severity}</b></div>
      {a.description && <p style={{ marginTop: 8 }}>{a.description}</p>}<small>{new Date(a.created_at).toLocaleString()}</small>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}><button className="outline-btn" disabled={a.status === 'Pending'} onClick={() => onStatus(a.id, 'Pending')}>Mark Pending</button><button className="primary-btn" disabled={a.status === 'Resolved'} onClick={() => onStatus(a.id, 'Resolved')}><CheckCircle2 size={14} /> Mark Resolved</button></div>
    </article>)}
  </section>
}

const haversine = (a, b) => {
  const R = 6371000, rad = v => v * Math.PI / 180
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng), lat1 = rad(a.lat), lat2 = rad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function RouteOptimizer({ accidents, overview }) {
  const [origin, setOrigin] = useState(''), [destination, setDestination] = useState('')
  const [startPoint, setStartPoint] = useState(null), [endPoint, setEndPoint] = useState(null)
  const [routes, setRoutes] = useState([]), [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(false), [message, setMessage] = useState('')
  const pending = useMemo(() => accidents.filter(a => a.status === 'Pending'), [accidents])

  async function searchPlace(query, type) {
    if (!query.trim()) { setMessage('Enter a location first.'); return }
    setLoading(true); setMessage(`Searching ${query}…`)
    try {
      const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query + ', Coimbatore, India')}&limit=1`)
      if (!res.ok) throw new Error('Location search failed.')
      const data = await res.json(), f = data.features?.[0]
      if (!f) throw new Error('Location not found. Try a road or landmark name.')
      const point = { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }
      const label = [f.properties.name, f.properties.street, f.properties.city].filter(Boolean).join(', ') || query
      if (type === 'start') { setStartPoint(point); setOrigin(label) } else { setEndPoint(point); setDestination(label) }
      setRoutes([]); setMessage(`${label} selected.`)
    } catch (e) { setMessage(e.message) } finally { setLoading(false) }
  }

  function useGPS() {
    if (!navigator.geolocation) { setMessage('GPS is not supported in this browser.'); return }
    setLoading(true); navigator.geolocation.getCurrentPosition(p => { setStartPoint({ lat: p.coords.latitude, lng: p.coords.longitude }); setOrigin('My Current Location'); setRoutes([]); setMessage('Current location detected.'); setLoading(false) }, () => { setMessage('Location permission denied.'); setLoading(false) }, { enableHighAccuracy: true, timeout: 15000 })
  }

  async function findRoute() {
    if (!startPoint || !endPoint) { setMessage('Select both start and destination.'); return }
    setLoading(true); setRoutes([]); setMessage('Calculating road routes and checking pending accident locations…')
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?overview=full&geometries=geojson&alternatives=true&steps=true`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Routing service is unavailable.')
      const data = await res.json()
      if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No driving route found between these locations.')
      const computed = data.routes.map((r, i) => {
        const points = r.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))
        const clearances = pending.map(a => Math.min(...points.map(p => haversine(p, { lat: a.latitude, lng: a.longitude }))))
        return { id: i, coords: points.map(p => [p.lat, p.lng]), distance: (r.distance / 1000).toFixed(2), eta: Math.ceil(r.duration / 60), clearance: clearances.length ? Math.min(...clearances) : Infinity, geometry: r.geometry }
      })
      computed.sort((a, b) => b.clearance - a.clearance)
      const safe = computed.filter(r => r.clearance >= 200)
      if (pending.length && !safe.length) setMessage('OSRM returned routes, but none is at least 200 m from every pending accident. No route is marked as safe. Try another start/destination or verify the report locations.')
      else if (pending.length) setMessage(`Selected the route with the greatest clearance from pending accident reports. ${safe.length} returned route(s) are at least 200 m clear. Verify road conditions before travel.`)
      else setMessage('Route calculated. No Pending accident reports currently exist.')
      setRoutes(computed.map((r, i) => ({ ...r, name: i === 0 ? (pending.length ? 'Best available accident-aware option' : 'Fastest available route') : `Alternative route ${i}` })))
      setSelected(0)
    } catch (e) { setMessage(e.message) } finally { setLoading(false) }
  }

  const pendingKey = pending.map(a => `${a.id}:${a.latitude}:${a.longitude}`).join('|')
  useEffect(() => { if (startPoint && endPoint && pending.length) findRoute() /* refresh after reports change */ }, [pendingKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = routes[selected]
  const field = { flex: 1, minWidth: 190, padding: 12, borderRadius: 9, border: '1px solid var(--border, #293247)', background: '#0d1a29', color: '#fff' }

  return <div className="module-grid">
    <section className="surface module-hero"><span className="module-icon"><Route size={22} /></span><div className="eyebrow">MOBILITY OPTIMIZATION</div><h3>Smart route optimizer</h3><p>Choose your starting point and destination. Pending user-reported accidents are plotted in red and considered when comparing routes.</p><span className="demo-note">OPENSTREETMAP · OSRM ROAD ROUTING</span>
      <label style={{ display: 'block', marginTop: 22 }}>STARTING LOCATION</label><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}><input style={field} value={origin} placeholder="Enter starting location" onChange={e => { setOrigin(e.target.value); setStartPoint(null) }} /><button className="outline-btn" onClick={useGPS} disabled={loading}><Crosshair size={14} /> Use GPS</button><button className="outline-btn" onClick={() => searchPlace(origin, 'start')} disabled={loading}><Search size={14} /> Search</button></div>
      <label style={{ display: 'block', marginTop: 18 }}>DESTINATION</label><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}><input style={field} value={destination} placeholder="Where do you want to go?" onChange={e => { setDestination(e.target.value); setEndPoint(null) }} /><button className="outline-btn" onClick={() => searchPlace(destination, 'end')} disabled={loading}><Search size={14} /> Search</button></div>
      <button className="primary-btn" style={{ width: '100%', marginTop: 18 }} onClick={findRoute} disabled={loading || !startPoint || !endPoint}><Navigation size={15} /> {loading ? 'Calculating…' : 'Find Best Route'}</button>
      {message && <p className="muted-copy" style={{ marginTop: 12 }}>{message}</p>}
      <div className="kpi-list" style={{ marginTop: 18 }}><div><span>Pending accidents</span><b>{pending.length}</b></div><div><span>Resolved reports</span><b>{accidents.length - pending.length}</b></div></div>
    </section>
    <section className="surface"><div className="surface-head"><div><div className="eyebrow">MAP COORDINATES</div><h3>Journey markers</h3></div></div><div className="kpi-list"><div><span>Starting point</span><b style={{ color: '#367dff' }}>● Blue</b></div><div><span>Destination</span><b style={{ color: '#367dff' }}>● Blue</b></div><div><span>Pending accidents</span><b style={{ color: '#ff334f' }}>● Red</b></div><div><span>Selected route</span><b style={{ color: '#20c997' }}>● Green</b></div></div></section>
    {routes.length > 0 && <section className="surface wide-surface"><div className="surface-head"><div><div className="eyebrow">ROUTE INTELLIGENCE</div><h3>Available route options</h3><p>{origin} → {destination}</p></div></div>{routes.map((r, i) => <button key={r.id} onClick={() => setSelected(i)} style={{ width: '100%', textAlign: 'left', padding: 16, marginBottom: 10, borderRadius: 12, border: selected === i ? '1px solid #20c997' : '1px solid var(--border, #293247)', background: selected === i ? 'rgba(32,201,151,.08)' : 'transparent', color: 'inherit', cursor: 'pointer' }}><b>{r.name}</b><div style={{ display: 'flex', gap: 30, marginTop: 12 }}><span>{r.distance} km</span><span>{r.eta} min</span><span>{Number.isFinite(r.clearance) ? `${Math.round(r.clearance)} m clearance` : 'No active accident'}</span></div></button>)}</section>}
    <section className="surface wide-surface"><div className="surface-head"><div><div className="eyebrow">GEOSPATIAL NAVIGATION</div><h3>Route map</h3><p>{chosen?.name || 'Your calculated route will appear here.'}</p></div></div><div className="map-frame"><MapBase mapCenter={startPoint ? [startPoint.lat, startPoint.lng] : center} zoom={12}>
      {startPoint && <CircleMarker center={[startPoint.lat, startPoint.lng]} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#367dff', fillOpacity: 1 }}><Popup>Starting point: {origin}</Popup></CircleMarker>}
      {endPoint && <CircleMarker center={[endPoint.lat, endPoint.lng]} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#367dff', fillOpacity: 1 }}><Popup>Destination: {destination}</Popup></CircleMarker>}
      <AccidentMarkers accidents={pending} />
      {routes.map((r, i) => <Polyline key={r.id} positions={r.coords} pathOptions={{ color: selected === i ? '#20c997' : '#a78bfa', weight: selected === i ? 8 : 5, opacity: selected === i ? 1 : .25, dashArray: selected === i ? undefined : '8 8' }}><Popup>{r.name} · {r.distance} km · {r.eta} min</Popup></Polyline>)}
    </MapBase><div className="map-chip"><span className="pulse-dot" /> ROUTE VIEW</div><div className="map-legend"><b>MAP LEGEND</b><span><i style={{ background: '#367dff' }} /> Start / destination</span><span><i style={{ background: '#20c997' }} /> Selected route</span><span><i className="red" /> Pending accident</span></div></div></section>
  </div>
}
function EnergyNetwork() {
  const emptyStatus = { modules: { energy: { records: 0 } }, prediction_minimum_records: 10 }
  const [data, setData] = useState({ outages: [], active_outages: 0 })
  const [history, setHistory] = useState({ records: [], count: 0, source: 'NO DATA' })
  const [status, setStatus] = useState(emptyStatus)
  const [zone, setZone] = useState('Peelamedu')
  const [metric, setMetric] = useState('consumption')
  const [prediction, setPrediction] = useState(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [note, setNote] = useState('')
  const [form, setForm] = useState({ zone: '', location: '', affected_area: '', issue: '', priority: 'Medium' })
  const [lastRefresh, setLastRefresh] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(0)

  const field = { width: '100%', padding: 11, borderRadius: 9, border: '1px solid var(--border, #293247)', background: '#0d1a29', color: '#fff', marginTop: 7 }
  const setFormField = (key, value) => setForm(old => ({ ...old, [key]: value }))

  const areaCoordinates = {
    'Peelamedu': [11.0302, 77.0166], 'Gandhipuram': [11.0183, 76.9670],
    'RS Puram': [11.0116, 76.9558], 'Singanallur': [11.0000, 77.0320],
    'Saibaba Colony': [11.0250, 76.9440], 'Saravanampatti': [11.0800, 76.9980],
    'Hopes College': [11.0230, 77.0060], 'Ramanathapuram': [10.9980, 77.0120],
    'Vadavalli': [11.0300, 76.9000], 'Ganapathy': [11.0450, 76.9820],
    'Ukkadam': [10.9920, 76.9610], 'Kuniyamuthur': [10.9520, 76.9520],
    'Sulur': [11.0240, 77.1250], 'Kalapatti': [11.0800, 77.0400],
    'Thudiyalur': [11.0800, 76.9400]
  }

  const zones = [...new Set(history.records.map(r => r.zone).filter(Boolean))].sort()
  const metrics = [...new Set(history.records.map(r => r.metric).filter(Boolean))].sort()
  const recordsFor = (area, metricName) => history.records
    .filter(r => r.zone === area && r.metric === metricName)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  const selectedRecords = recordsFor(zone, metric)
  const latestValue = area => {
    const rows = recordsFor(area, metric)
    return rows.length ? Number(rows[rows.length - 1].value) : null
  }
  const averageValue = (area, metricName) => {
    const rows = recordsFor(area, metricName)
    return rows.length ? rows.reduce((sum, r) => sum + Number(r.value), 0) / rows.length : null
  }
  const areaStats = zones.map(area => {
    const consumption = averageValue(area, 'consumption')
    const production = averageValue(area, 'production')
    const supply = averageValue(area, 'supply')
    return { area, consumption, production, supply }
  }).filter(item => item.consumption !== null)
  const sortedConsumption = areaStats.map(item => item.consumption).sort((a, b) => a - b)
  const lowCut = sortedConsumption.length ? sortedConsumption[Math.floor((sortedConsumption.length - 1) / 3)] : 0
  const highCut = sortedConsumption.length ? sortedConsumption[Math.ceil((sortedConsumption.length - 1) * 2 / 3)] : 0
  const levelFor = value => value === null ? 'unavailable' : value <= lowCut ? 'low' : value <= highCut ? 'moderate' : 'high'
  const colorFor = level => level === 'high' ? '#ff647c' : level === 'moderate' ? '#20c997' : level === 'low' ? '#f4bd50' : '#8a98a8'
  const selectedArea = areaStats.find(item => item.area === zone)
  const pendingOutages = data.outages.filter(item => item.status === 'Pending').length
  const totalRecords = status.modules?.energy?.records || history.count || 0
  const latestReading = selectedRecords[selectedRecords.length - 1]
  const firstReading = selectedRecords[0]
  const change = firstReading && latestReading && Number(firstReading.value) !== 0
    ? ((Number(latestReading.value) - Number(firstReading.value)) / Math.abs(Number(firstReading.value))) * 100 : null
  const shortage = selectedArea?.supply !== null && selectedArea?.supply !== undefined && selectedArea?.consumption !== null
    ? selectedArea.supply - selectedArea.consumption : null

  const load = useCallback(async () => {
    try {
      const [energyRes, statusRes, recordsRes] = await Promise.all([
        fetch(`${API}/api/energy`),
        fetch(`${API}/api/intelligence/status`),
        fetch(`${API}/api/intelligence/records/energy?limit=2000`)
      ])
      if (!energyRes.ok) throw new Error('Energy service is unavailable.')
      const energy = await energyRes.json()
      setData({ outages: energy.outages || [], active_outages: energy.active_outages || 0 })
      if (statusRes.ok) setStatus(await statusRes.json())
      if (recordsRes.ok) {
        const result = await recordsRes.json()
        setHistory(result)
        const foundZones = [...new Set((result.records || []).map(r => r.zone).filter(Boolean))].sort()
        setZone(current => current && foundZones.includes(current) ? current : (foundZones[0] || ''))
      }
      setLastRefresh(new Date())
      setNote('')
    } catch (error) {
      setNote(`${error.message} Check that the FastAPI backend is running.`)
    }
  }, [])

  useEffect(() => { load(); const timer = setInterval(load, 15000); return () => clearInterval(timer) }, [load])

  async function importCsv() {
    if (!selectedFile) { setNote('Choose a CSV file first.'); return }
    setUploading(true)
    setNote('Validating and importing historical readings…')
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      const res = await fetch(`${API}/api/intelligence/import/energy`, { method: 'POST', body: formData })
      const body = await res.json()
      if (!res.ok) throw new Error(body.detail || 'CSV import failed.')
      setSelectedFile(null)
      setFileInputKey(key => key + 1)
      await load()
      setNote(`Import complete: ${body.rows_inserted ?? 0} imported · ${body.duplicates_skipped ?? 0} duplicates skipped · 0 failed · ${body.rows_received ?? 0} rows checked.`)
    } catch (error) {
      setNote(error.message)
    } finally {
      setUploading(false)
    }
  }

  async function runPrediction() {
    if (!zone || !metric) { setNote('Select an area and metric first.'); return }
    setBusy(true)
    setPrediction(null)
    try {
      const res = await fetch(`${API}/api/intelligence/predict/energy?zone=${encodeURIComponent(zone)}&metric=${encodeURIComponent(metric)}&horizon=7`)
      const body = await res.json()
      if (!res.ok) throw new Error(body.detail || 'Prediction request failed.')
      setPrediction(body)
    } catch (error) {
      setNote(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setNote('Submitting power issue…')
    try {
      const res = await fetch(`${API}/api/energy/outages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.detail || 'Could not submit power issue.')
      setNote('Power issue submitted. It is now in Pending status.')
      setForm({ zone: '', location: '', affected_area: '', issue: '', priority: 'Medium' })
      await load()
    } catch (error) {
      setNote(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function updateStatus(id, nextStatus) {
    try {
      const res = await fetch(`${API}/api/energy/outages/${id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus })
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.detail || 'Could not update report status.')
      await load()
    } catch (error) {
      setNote(error.message)
    }
  }

  const displayMetric = metric.replaceAll('_', ' ').toUpperCase()
  const mapCenter = [11.0168, 76.9558]

  return <div className="module-grid energy-full">
    <section className="surface module-hero energy-hero">
      <span className="module-icon"><Zap size={22} /></span>
      <div className="eyebrow">DISTRICT ENERGY INTELLIGENCE · மின்சார மேலாண்மை</div>
      <h3>Coimbatore Energy Network</h3>
      <p>Explore area-wise consumption, compare energy production and supply, and review potential supply pressure using the imported project dataset.</p>
      <span className="energy-source-pill"><i /> SIMULATED PROJECT DATA · NOT LIVE UTILITY DATA</span>
    </section>

    <section className="surface energy-status-card">
      <div className="eyebrow">DATA CONNECTIVITY</div><h3>Network data status</h3>
      <div className="energy-status-list">
        <div><span>Live utility / smart-meter feed</span><b className="energy-unavailable">NOT CONNECTED</b></div>
        <div><span>IoT sensor network</span><b className="energy-unavailable">NOT CONNECTED</b></div>
        <div><span>Project historical dataset</span><b className={totalRecords ? 'energy-normal' : 'energy-unavailable'}>{totalRecords ? 'CSV LOADED' : 'NO DATA'}</b></div>
      </div>
      <small className="energy-footnote">Map and analytics use the clearly labelled simulated CSV dataset. Live grid data is not connected.</small>
    </section>

    <section className="surface wide-surface energy-map-section">
      <div className="surface-head">
        <div><div className="eyebrow">COIMBATORE DISTRICT · AREA-WISE MONITORING</div><h3>Energy consumption map</h3><p>Select an area or click a marker to inspect its monthly energy profile.</p></div>
        <label className="energy-district-select">DISTRICT<select style={field} value="Coimbatore" disabled><option>Coimbatore</option></select></label>
      </div>
      <div className="energy-map-layout">
        <div className="map-frame energy-map-frame">
          <MapBase mapCenter={mapCenter} zoom={11}>
            {areaStats.map(item => {
              const coords = areaCoordinates[item.area]
              if (!coords) return null
              const level = levelFor(item.consumption)
              return <CircleMarker key={item.area} center={coords} radius={zone === item.area ? 13 : 10}
                pathOptions={{ color: '#ffffff', weight: zone === item.area ? 3 : 2, fillColor: colorFor(level), fillOpacity: .92 }}>
                <Popup>
                  <b>{item.area}</b><br />
                  Avg. consumption: {item.consumption.toFixed(1)} kWh<br />
                  Production: {item.production === null ? 'Unavailable' : `${item.production.toFixed(1)} kWh`}<br />
                  Supply: {item.supply === null ? 'Unavailable' : `${item.supply.toFixed(1)} kWh`}
                  <br /><button type="button" onClick={() => setZone(item.area)}>View area</button>
                </Popup>
              </CircleMarker>
            })}
          </MapBase>
          <div className="map-chip"><span className="pulse-dot" /> COIMBATORE · ENERGY HEAT LAYER</div>
          <div className="map-legend"><b>AVERAGE CONSUMPTION</b><span><i className="red" /> High</span><span><i className="green" /> Moderate</span><span><i className="yellow" /> Low</span></div>
        </div>
        <aside className="surface energy-area-panel">
          <div className="eyebrow">AREA DETAILS</div>
          <h3>{zone || 'Select an area'}</h3>
          <label>Area<select style={field} value={zone} onChange={e => { setZone(e.target.value); setPrediction(null) }}>
            {zones.map(area => <option key={area} value={area}>{area}</option>)}
          </select></label>
          {selectedArea ? <>
            <div className="energy-area-level" style={{ borderColor: colorFor(levelFor(selectedArea.consumption)) }}>
              <span>Consumption level</span><b style={{ color: colorFor(levelFor(selectedArea.consumption)) }}>{levelFor(selectedArea.consumption).toUpperCase()}</b>
              <strong>{selectedArea.consumption.toFixed(1)} <small>kWh average / day</small></strong>
            </div>
            <div className="energy-area-stat"><span>Average production</span><b>{selectedArea.production === null ? '—' : `${selectedArea.production.toFixed(1)} kWh`}</b></div>
            <div className="energy-area-stat"><span>Average available supply</span><b>{selectedArea.supply === null ? '—' : `${selectedArea.supply.toFixed(1)} kWh`}</b></div>
            <div className="energy-area-stat"><span>Supply minus consumption</span><b style={{ color: shortage !== null && shortage < 0 ? '#ff647c' : '#20c997' }}>{shortage === null ? '—' : `${shortage.toFixed(1)} kWh`}</b></div>
            <div className={`energy-risk ${shortage !== null && shortage < 0 ? 'risk-high' : 'risk-normal'}`}>
              <b>{shortage === null ? 'SUPPLY DATA INCOMPLETE' : shortage < 0 ? 'POTENTIAL SUPPLY PRESSURE' : 'NO MODELLED SUPPLY GAP'}</b>
              <small>{shortage === null ? 'Import supply and consumption records to compare.' : shortage < 0 ? 'In this simulated dataset, average supply is below average consumption. This is not confirmation of an actual power cut.' : 'Modelled average supply meets or exceeds consumption. This does not guarantee uninterrupted service.'}</small>
            </div>
          </> : <div className="energy-empty-state">No consumption records for this area.</div>}
          <small className="energy-footnote">All map values are simulated project estimates, not official area-level utility measurements.</small>
        </aside>
      </div>
      <div className="energy-map-summary">
        <span><b>{areaStats.length}</b> areas with imported records</span>
        <span><b>{zones.length}</b> zones in dataset</span>
        <span><b>{pendingOutages}</b> pending citizen power reports</span>
      </div>
    </section>

    <section className="surface wide-surface">
      <div className="surface-head"><div><div className="eyebrow">ENERGY PERFORMANCE · மின்சார பயன்பாடு</div><h3>Area consumption trends</h3><p>Daily readings for the selected area and metric.</p></div><span className="energy-data-badge">{totalRecords.toLocaleString('en-IN')} RECORDS</span></div>
      <div className="energy-filter-row">
        <label>Area<select style={field} value={zone} onChange={e => { setZone(e.target.value); setPrediction(null) }}>{zones.map(item => <option key={item}>{item}</option>)}</select></label>
        <label>Metric<select style={field} value={metric} onChange={e => { setMetric(e.target.value); setPrediction(null) }}>{metrics.map(item => <option key={item}>{item}</option>)}</select></label>
      </div>
      {selectedRecords.length ? <div className="energy-chart-wrap">
        <div className="energy-chart-head"><b>{zone} · {displayMetric}</b><span>{selectedRecords.length} readings · {latestReading?.unit || 'kWh'}</span></div>
        <div className="energy-chart-bars">{selectedRecords.slice(-30).map((item, index) => {
          const values = selectedRecords.slice(-30).map(r => Number(r.value))
          const max = Math.max(...values, 0), min = Math.min(...values, 0), range = max - min || 1
          const height = Math.max(5, ((Number(item.value) - min) / range) * 100)
          return <div className="energy-bar-column" key={`${item.timestamp}-${index}`} title={`${new Date(item.timestamp).toLocaleDateString()} · ${item.value} ${item.unit || ''}`}>
            <i style={{ height: `${height}%` }} /><small>{new Date(item.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</small>
          </div>
        })}</div>
        <div className="energy-chart-caption">First-to-latest change: {change === null ? 'Not available' : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`} · Dataset is simulated.</div>
      </div> : <div className="energy-empty-state"><Zap size={25}/><b>DATA UNAVAILABLE</b><span>No records for this area and metric.</span></div>}
    </section>

    <section className="surface energy-import-card">
      <div className="eyebrow">HISTORICAL DATA INGESTION · தரவு பதிவேற்றம்</div><h3>Import energy readings</h3>
      <p className="muted-copy">Upload a CSV using the backend's multipart file upload. Simulated and real datasets must be clearly labelled by their source.</p>
      <div className="energy-csv-schema"><b>Required CSV columns</b><code>timestamp,zone,metric,value</code><code>2026-10-01T00:00:00Z,Peelamedu,consumption,982.43</code><small>Optional column: unit. This example describes the format; use your selected dataset.</small></div>
      <input key={fileInputKey} className="energy-file-input" type="file" accept=".csv,text/csv" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
      {selectedFile && <small className="energy-selected-file">Selected: {selectedFile.name}</small>}
      <button className="primary-btn" type="button" onClick={importCsv} disabled={!selectedFile || uploading}><Plus size={14}/>{uploading ? 'Importing…' : 'Validate & import CSV'}</button>
      <div className="energy-source-note"><ShieldCheck size={15}/> Imported records are tagged HISTORICAL_CSV by the backend.</div>
    </section>

    <section className="surface energy-prediction-card">
      <div className="eyebrow">AI / STATISTICAL FORECAST · கணிப்பு</div><h3>7-day energy forecast</h3>
      <p className="muted-copy">Baseline linear regression using the selected area's historical metric records.</p>
      <div className="energy-prediction-rule"><b>Minimum data requirement</b><span>At least 10 timestamped records for the selected area and metric.</span></div>
      <button className="primary-btn" type="button" onClick={runPrediction} disabled={busy || !zone || selectedRecords.length < 10}><Activity size={14}/>{busy ? 'Analysing…' : 'Generate 7-day forecast'}</button>
      {prediction && <div className="energy-prediction-result">
        <b>{prediction.status === 'PREDICTION_AVAILABLE' ? 'FORECAST AVAILABLE' : 'INSUFFICIENT DATA'}</b>
        <p>{prediction.message || prediction.disclaimer}</p>
        {prediction.prediction?.map(point => <div key={point.timestamp}><span>{new Date(point.timestamp).toLocaleDateString()}</span><strong>{Number(point.predicted_value).toFixed(2)} {prediction.unit}</strong></div>)}
        <small>{prediction.method} · {prediction.source} · Statistical estimate, not official utility forecast.</small>
      </div>}
      {!prediction && <div className="energy-empty-mini">Forecast appears here after analysis.</div>}
    </section>

    <section className="surface energy-supply-card">
      <div className="eyebrow">SUPPLY & DEMAND · விநியோகம் மற்றும் தேவை</div><h3>Area comparison</h3>
      <p className="muted-copy">Compare average daily consumption, production and available supply across areas in the imported dataset.</p>
      <div className="energy-area-table">
        <div className="energy-area-table-head"><span>AREA</span><span>CONSUMPTION</span><span>PRODUCTION</span><span>SUPPLY</span></div>
        {areaStats.map(item => <button type="button" key={item.area} className={`energy-area-row ${zone === item.area ? 'selected' : ''}`} onClick={() => setZone(item.area)}>
          <b>{item.area}</b><span>{item.consumption.toFixed(0)}</span><span>{item.production === null ? '—' : item.production.toFixed(0)}</span><span>{item.supply === null ? '—' : item.supply.toFixed(0)}</span>
        </button>)}
      </div>
      <small className="energy-footnote">Values are daily averages from the simulated CSV. Production and supply are modelled dataset fields, not measured utility values.</small>
    </section>

    <form className="surface report-form" onSubmit={submit}>
      <div className="eyebrow">CITIZEN SERVICE REQUEST · புகார் பதிவு</div><h3>Report a power issue</h3><p className="muted-copy">Citizen reports are stored separately from measured grid data. Every new report starts as Pending.</p>
      <label>Service zone<input style={field} value={form.zone} onChange={e => setFormField('zone', e.target.value)} placeholder="Enter area / zone" required /></label>
      <label className="energy-form-label">Location / landmark<input style={field} value={form.location} onChange={e => setFormField('location', e.target.value)} placeholder="Street, area or landmark" required /></label>
      <label className="energy-form-label">Affected area<input style={field} value={form.affected_area} onChange={e => setFormField('affected_area', e.target.value)} placeholder="Optional" /></label>
      <label className="energy-form-label">Issue details<textarea style={{...field,minHeight:82}} value={form.issue} onChange={e => setFormField('issue', e.target.value)} placeholder="Power cut, voltage fluctuation, damaged cable…" required /></label>
      <label className="energy-form-label">Priority<select style={field} value={form.priority} onChange={e => setFormField('priority', e.target.value)}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label>
      <button className="primary-btn" type="submit" style={{marginTop:16}} disabled={busy}><Plus size={14}/>{busy ? 'Submitting…' : 'Submit power issue'}</button>
    </form>

    <section className="surface wide-surface">
      <div className="surface-head"><div><div className="eyebrow">OUTAGE MANAGEMENT · மின்தடை மேலாண்மை</div><h3>Power issue register</h3><p>Only user-submitted reports appear here; these are not utility-confirmed outages.</p></div><span className="energy-data-badge">{data.outages.length} REPORTS</span></div>
      {!data.outages.length ? <div className="energy-empty-state"><ShieldCheck size={25}/><b>No power issue reports</b><span>Submitted citizen requests will appear here.</span></div> : data.outages.map(outage => <article className="incident-detail" key={outage.id} style={{marginBottom:13}}>
        <div className="energy-report-heading"><div><span className={`status ${outage.status === 'Pending' ? 'danger' : 'ready'}`}>{outage.status.toUpperCase()}</span><h3 style={{marginTop:10}}>{outage.zone} · {outage.location}</h3><p>{outage.issue}</p><small>{outage.affected_area || 'Area not specified'} · {outage.priority} priority · {new Date(outage.created_at).toLocaleString()}</small></div><b style={{color:outage.status === 'Pending' ? '#ff647c' : '#20c997'}}>{outage.priority}</b></div>
        <div className="energy-report-actions"><button type="button" className="outline-btn" disabled={outage.status === 'Pending'} onClick={() => updateStatus(outage.id,'Pending')}>Mark Pending</button><button type="button" className="primary-btn" disabled={outage.status === 'Resolved'} onClick={() => updateStatus(outage.id,'Resolved')}><CheckCircle2 size={14}/> Mark Resolved</button></div>
      </article>)}
    </section>
    {note && <div className="surface energy-message" role="status">{note}</div>}
    <div className="energy-footer wide-surface"><span>Last sync: {lastRefresh ? lastRefresh.toLocaleTimeString() : 'Waiting…'}</span><span>Dataset: SIMULATED CSV</span><span>Live grid API: NOT CONNECTED</span><button type="button" className="refresh-btn" onClick={load}><RotateCcw size={13}/> Refresh data</button></div>
  </div>
}


const AREA_COORDINATES = {
  'Peelamedu': [11.0302, 77.0166], 'Gandhipuram': [11.0183, 76.9670],
  'RS Puram': [11.0116, 76.9558], 'Singanallur': [11.0000, 77.0320],
  'Saibaba Colony': [11.0250, 76.9440], 'Saravanampatti': [11.0800, 76.9980],
  'Hopes College': [11.0230, 77.0060], 'Ramanathapuram': [10.9980, 77.0120],
  'Vadavalli': [11.0300, 76.9000], 'Ganapathy': [11.0450, 76.9820],
  'Ukkadam': [10.9920, 76.9610], 'Kuniyamuthur': [10.9520, 76.9520],
  'Sulur': [11.0240, 77.1250], 'Kalapatti': [11.0800, 77.0400],
  'Thudiyalur': [11.0800, 76.9400]
}

function ResourceOperations({ kind }) {
  const isWater = kind === 'water'
  const moduleName = isWater ? 'water' : 'waste'
  const title = isWater ? 'Water Systems' : 'Waste Operations'
  const [history, setHistory] = useState({ records: [], count: 0, source: 'NO DATA' })
  const [zone, setZone] = useState('')
  const [metric, setMetric] = useState(isWater ? 'water_level' : 'bin_fill_level')
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [prediction, setPrediction] = useState(null)
  const [note, setNote] = useState('')
  const [reports, setReports] = useState([])
  const [form, setForm] = useState({ zone: '', street: '', location: '', issue: isWater ? 'Leakage' : 'Missed collection', severity: 'Medium', eta: '', details: '' })
  const [statusInfo, setStatusInfo] = useState(null)

  const metricOptions = isWater
    ? ['water_level', 'water_inflow', 'water_consumption', 'water_supply', 'water_quality_ph', 'leakage_reports']
    : ['bin_fill_level', 'waste_quantity', 'collection_count', 'missed_collection', 'recyclable_quantity']
  const zones = [...new Set(history.records.map(r => r.zone).filter(Boolean))].sort()
  const metrics = [...new Set(history.records.map(r => r.metric).filter(Boolean))].sort()
  const activeMetrics = metrics.length ? metrics : metricOptions
  const recordsFor = (area, metricName) => history.records.filter(r => r.zone === area && r.metric === metricName).sort((a,b) => new Date(a.timestamp)-new Date(b.timestamp))
  const selectedRecords = recordsFor(zone, metric)
  const latest = selectedRecords[selectedRecords.length - 1]
  const avg = selectedRecords.length ? selectedRecords.reduce((n,r)=>n+Number(r.value),0)/selectedRecords.length : null
  const areaRows = zones.map(area => {
    const rows = recordsFor(area, metric)
    return { area, latest: rows.length ? Number(rows[rows.length-1].value) : null, count: rows.length, timestamp: rows.at(-1)?.timestamp }
  })
  const coords = AREA_COORDINATES
  // Show every submitted report in the register, regardless of the currently selected map area.
  // The KPI count is global too, so the register and count stay consistent.
  const areaReports = reports

  const load = useCallback(async () => {
    try {
      const [r, st] = await Promise.all([
        fetch(`${API}/api/intelligence/records/${moduleName}?limit=2000`),
        fetch(`${API}/api/intelligence/status`)
      ])
      if (!r.ok) throw new Error('Could not load historical records.')
      const rd = await r.json(); setHistory({ records: rd.records || [], count: rd.count || 0, source: rd.source || 'HISTORICAL_CSV' })
      if (st.ok) setStatusInfo(await st.json())
      setNote('Data refreshed.')
    } catch (e) { setNote(`${e.message} Check that the backend is running.`) }
  }, [moduleName])

  useEffect(() => {
    load()
    try { setReports(JSON.parse(localStorage.getItem(`gridmind-${moduleName}-reports`) || '[]')) } catch { setReports([]) }
  }, [load, moduleName])

  useEffect(() => {
    if (zones.length && (!zone || !zones.includes(zone))) setZone(zones[0])
  }, [zones.join('|')])

  async function importCsv() {
    if (!selectedFile) return
    setUploading(true); setNote('Validating and importing CSV…')
    try {
      const fd = new FormData(); fd.append('file', selectedFile)
      const res = await fetch(`${API}/api/intelligence/import/${moduleName}`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'CSV import failed.')
      setSelectedFile(null); setFileInputKey(key => key + 1); await load()
      setNote(`Import complete: ${data.rows_inserted ?? 0} imported · ${data.duplicates_skipped ?? 0} duplicates skipped · 0 failed · ${data.rows_received ?? 0} rows checked.`)
    } catch (e) { setNote(e.message) } finally { setUploading(false) }
  }

  async function runPrediction() {
    if (!zone || selectedRecords.length < 10) { setPrediction({ status: 'INSUFFICIENT_DATA', message: 'At least 10 historical records are required for this area and metric.' }); return }
    setBusy(true); setPrediction(null)
    try {
      const res = await fetch(`${API}/api/intelligence/predict/${moduleName}?zone=${encodeURIComponent(zone)}&metric=${encodeURIComponent(metric)}`)
      const data = await res.json(); if (!res.ok) throw new Error(data.detail || 'Prediction request failed.')
      setPrediction(data)
    } catch (e) { setPrediction({ status: 'UNAVAILABLE', message: e.message }) } finally { setBusy(false) }
  }

  function submitReport(e) {
    e.preventDefault()
    const item = { ...form, id: `${Date.now()}`, created_at: new Date().toISOString(), status: 'Reported' }
    const next = [item, ...reports]; setReports(next); localStorage.setItem(`gridmind-${moduleName}-reports`, JSON.stringify(next))
    setForm({ zone: '', street: '', location: '', issue: isWater ? 'Leakage' : 'Missed collection', severity: 'Medium', eta: '', details: '' })
    setNote('Report saved in this browser. It is not yet sent to a municipal system.')
  }

  function updateReport(id, status) {
    const next = reports.map(r => r.id === id ? { ...r, status } : r)
    setReports(next); localStorage.setItem(`gridmind-${moduleName}-reports`, JSON.stringify(next))
  }

  const labelFor = m => ({ water_level:'Tank water level', water_inflow:'Water inflow', water_consumption:'Water consumption', water_supply:'Water supplied', water_quality_ph:'Water quality pH', leakage_reports:'Leakage reports', bin_fill_level:'Bin fill level', waste_quantity:'Waste quantity', collection_count:'Collection count', missed_collection:'Missed collections', recyclable_quantity:'Recyclable waste' }[m] || m.replaceAll('_',' '))
  const unit = latest?.unit || (metric.includes('level') ? '%' : metric.includes('quantity') || metric.includes('consumption') || metric.includes('supply') || metric.includes('inflow') ? 'L / kg (check CSV unit)' : '')
  const format = v => v === null || v === undefined || !Number.isFinite(Number(v)) ? 'DATA UNAVAILABLE' : `${Number(v).toLocaleString(undefined,{maximumFractionDigits:2})}${unit ? ` ${unit}` : ''}`

  return <div className="resource-module">
    <section className="resource-hero surface">
      <div><div className="eyebrow">COIMBATORE SMART CITY · {isWater ? 'நீர் மேலாண்மை' : 'கழிவு மேலாண்மை'}</div><h2>{title}</h2>
      <p>{isWater ? 'Tank-to-street distribution, supply status, leakage and shortage monitoring.' : 'Street-wise bins, waste hotspots, daily collection schedules and missed-pickup reporting.'}</p></div>
      <div className="resource-status"><span className="pulse-dot"/> HISTORICAL DATA: {history.count ? 'AVAILABLE' : 'NO DATA'}<small>Live municipal integration: NOT CONNECTED</small></div>
    </section>

    <section className="surface resource-map-card">
      <div className="surface-head"><div><div className="eyebrow">GEOSPATIAL OPERATIONS · வரைபடம்</div><h3>{isWater ? 'Water network & distribution map' : 'Waste collection network map'}</h3><p>Map markers show approximate area centres only. Exact tank, pipeline, bin and street locations require verified asset data.</p></div>
        <select value={zone} onChange={e=>setZone(e.target.value)} disabled={!zones.length}><option value="">Select area</option>{zones.map(z=><option key={z}>{z}</option>)}</select>
      </div>
      <div className="resource-map-layout">
        <div className="map-frame resource-map-frame"><MapBase mapCenter={center} zoom={11}>
          {areaRows.map(row => { const point=coords[row.area]; if(!point) return null; const color=row.latest===null?'#8995a5':isWater?(metric==='water_level' && row.latest<25?'#ff647c':'#35b8ed'):(metric==='bin_fill_level' && row.latest>=80?'#ff647c':'#20c997'); return <CircleMarker key={row.area} center={point} radius={zone===row.area?11:8} pathOptions={{color:'#fff',weight:2,fillColor:color,fillOpacity:.9}}><Popup><b>{row.area}</b><br/>{labelFor(metric)}: {row.latest===null?'Unavailable':row.latest}<br/>Records: {row.count}</Popup></CircleMarker> })}
        </MapBase><div className="map-chip"><span className="pulse-dot"/> AREA DATA MAP · APPROXIMATE CENTRES</div></div>
        <aside className="resource-map-side"><div className="eyebrow">SELECTED AREA</div><h3>{zone || 'No imported area'}</h3>
          <div className="resource-stat"><span>{labelFor(metric)}</span><b>{format(latest?.value)}</b></div>
          <div className="resource-stat"><span>Average recorded value</span><b>{format(avg)}</b></div>
          <div className="resource-stat"><span>Historical records</span><b>{selectedRecords.length}</b></div>
          {isWater && metric === 'water_level' && <div className="water-reading-guide">
            <b>How to read this tank level</b>
            <p>{latest && (unit === '%' || unit.toLowerCase().includes('percent')) ? `The latest recorded level is ${Number(latest.value).toLocaleString(undefined,{maximumFractionDigits:1})}% of the tank's stated capacity.` : 'The latest value is the most recent uploaded tank-level reading. Check the CSV unit to understand its scale.'}</p>
            {latest && (unit === '%' || unit.toLowerCase().includes('percent')) && <div className="water-level-meter"><i style={{width:`${Math.max(0,Math.min(100,Number(latest.value)||0))}%`}} /></div>}
            <p>{avg === null ? 'An average will appear after readings are uploaded.' : `Average of ${selectedRecords.length} uploaded readings: ${Number(avg).toLocaleString(undefined,{maximumFractionDigits:2})} ${unit}.`}</p>
            <small>Latest = newest timestamp · Average = arithmetic mean of the selected historical records. This is not a live tank sensor.</small>
          </div>}
          <div className="resource-stat"><span>Street / asset mapping</span><b>DATA REQUIRED</b></div>
          <small>Exact street counts and tank/bin positions will appear after verified street and asset data is added.</small>
        </aside>
      </div>
      <div className="resource-area-grid">{areaRows.length ? areaRows.map(row=><button key={row.area} className={`resource-area-chip ${zone===row.area?'active':''}`} onClick={()=>setZone(row.area)}><b>{row.area}</b><span>{row.latest===null?'No reading':`${row.latest} ${unit}`}</span><small>{row.count} records</small></button>) : <div className="resource-empty">No area records imported yet.</div>}</div>
    </section>

    <div className="resource-kpis">
      <article className="surface"><span>{isWater?'AREAS WITH RECORDS':'AREAS WITH WASTE DATA'}</span><b>{zones.length || '—'}</b><small>From uploaded CSV only</small></article>
      <article className="surface"><span>{isWater?'SELECTED TANK / LEVEL':'SELECTED BIN / FILL LEVEL'}</span><b>{latest ? format(latest.value) : 'DATA UNAVAILABLE'}</b><small>{zone || 'Select an imported area'}</small></article>
      <article className="surface"><span>{isWater?'LEAKAGE / SHORTAGE REPORTS':'COLLECTION / OVERFLOW REPORTS'}</span><b>{reports.length}</b><small>Locally submitted reports</small></article>
      <article className="surface"><span>HISTORICAL RECORDS</span><b>{history.count}</b><small>{history.source}</small></article>
    </div>

    <div className="resource-two-col">
      <section className="surface"><div className="eyebrow">HISTORICAL MONITORING · தரவு கண்காணிப்பு</div><h3>{isWater?'Tank & water usage readings':'Bin fill & waste quantity readings'}</h3><p className="muted-copy">Choose a metric to inspect imported records. No readings are generated automatically.</p>
        <label className="resource-field">Metric<select value={metric} onChange={e=>{setMetric(e.target.value);setPrediction(null)}}>{activeMetrics.map(m=><option key={m} value={m}>{labelFor(m)}</option>)}</select></label>
        <div className="resource-record-list">{selectedRecords.slice(-8).reverse().map((r,i)=><div key={`${r.timestamp}-${i}`}><span>{new Date(r.timestamp).toLocaleString()}</span><b>{r.value} {r.unit || ''}</b></div>)}{!selectedRecords.length && <div className="resource-empty">DATA UNAVAILABLE — import a CSV containing this area and metric.</div>}</div>
      </section>
      <section className="surface"><div className="eyebrow">CSV DATA INGESTION · தரவு பதிவேற்றம்</div><h3>Import {isWater?'water':'waste'} records</h3><p className="muted-copy">Use verified readings or clearly identified project test data. Required columns: timestamp, zone, metric, value. Optional: unit.</p>
        <div className="resource-code">timestamp,zone,metric,value,unit<br/>{isWater?'2026-11-01,Peelamedu,water_level,75,percent':'2026-11-01,Peelamedu,bin_fill_level,75,percent'}</div>
        <input key={fileInputKey} className="energy-file-input" type="file" accept=".csv,text/csv" onChange={e=>setSelectedFile(e.target.files?.[0]||null)}/>{selectedFile&&<small className="energy-selected-file">Selected: {selectedFile.name}</small>}
        <button className="primary-btn" disabled={!selectedFile||uploading} onClick={importCsv}>{uploading?'Importing…':'Validate & import CSV'}</button>
        <button className="outline-btn" onClick={load}>Refresh records</button>
      </section>
    </div>

    <div className="resource-two-col">
      <section className="surface"><div className="eyebrow">AI / STATISTICAL FORECAST · கணிப்பு</div><h3>{isWater?'Water level / demand prediction':'Bin filling / waste prediction'}</h3><p className="muted-copy">Forecast only when at least 10 timestamped records exist for the selected area and metric.</p>
        <button className="primary-btn" disabled={busy||selectedRecords.length<10||!zone} onClick={runPrediction}>{busy?'Analysing…':'Generate 7-day prediction'}</button>
        {prediction&&<div className="resource-prediction"><b>{prediction.status||'PREDICTION'}</b><p>{prediction.message||prediction.disclaimer}</p>{prediction.prediction?.map(p=><div key={p.timestamp}><span>{new Date(p.timestamp).toLocaleDateString()}</span><b>{Number(p.predicted_value).toFixed(2)} {prediction.unit||unit}</b></div>)}{prediction.prediction?.length>0&&<small>Read this as an estimated future value for each date, calculated from the uploaded history. It is not a live tank reading.</small>}<small>Statistical estimate only; not an official utility / corporation forecast.</small></div>}
        {!prediction&&<div className="resource-empty">{selectedRecords.length<10?'INSUFFICIENT DATA — minimum 10 records required.':'Prediction is ready to run.'}</div>}
      </section>
      <section className="surface"><div className="eyebrow">AREA COMPARISON · பகுதி ஒப்பீடு</div><h3>{isWater?'Water readings by area':'Waste readings by area'}</h3><div className="resource-record-list">{areaRows.map(row=><button key={row.area} onClick={()=>setZone(row.area)} className="resource-comparison-row"><b>{row.area}</b><span>{row.latest===null?'—':`${row.latest} ${unit}`}</span><small>{row.count} records</small></button>)}{!areaRows.length&&<div className="resource-empty">No comparable area data available.</div>}</div></section>
    </div>

    <section className="surface"><div className="eyebrow">OPERATIONS REPORTING · புகார் பதிவு</div><h3>{isWater?'Report leakage / water shortage':'Report overflow / missed waste collection'}</h3><p className="muted-copy">Reports are saved in this browser for the prototype. They are not dispatched to municipal staff.</p>
      <form className="resource-report-form" onSubmit={submitReport}>
        <label>Area<input required value={form.zone} onChange={e=>setForm({...form,zone:e.target.value})} placeholder="e.g. Peelamedu"/></label>
        <label>Street<input value={form.street} onChange={e=>setForm({...form,street:e.target.value})} placeholder="Street name"/></label>
        <label>Location / landmark<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Landmark or collection point"/></label>
        <label>Issue<select value={form.issue} onChange={e=>setForm({...form,issue:e.target.value})}>{(isWater?['Leakage','Water shortage','Low pressure','Supply delay','Water quality concern']:['Bin overflow','Missed collection','Vehicle delay','Waste hotspot','Damaged bin']).map(v=><option key={v}>{v}</option>)}</select></label>
        <label>Severity<select value={form.severity} onChange={e=>setForm({...form,severity:e.target.value})}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label>
        <label>{isWater?'Estimated repair / restoration':'Revised vehicle arrival'}<input value={form.eta} onChange={e=>setForm({...form,eta:e.target.value})} placeholder="e.g. 6 hours / 5 Nov, 10 AM"/></label>
        <label className="resource-report-wide">Details<textarea value={form.details} onChange={e=>setForm({...form,details:e.target.value})} placeholder="Describe the issue…"/></label>
        <button className="primary-btn" type="submit">Save report</button>
      </form>
    </section>

    <section className="surface"><div className="surface-head"><div><div className="eyebrow">INCIDENT / SERVICE REGISTER</div><h3>{isWater?'Leakage & shortage register':'Collection & overflow register'}</h3></div><b>{reports.length} REPORTS</b></div>
      {areaReports.length?areaReports.map(r=><article className="resource-report-item" key={r.id}><div><b>{r.issue} · {r.zone}</b><p>{r.street||'Street not specified'} {r.location?`· ${r.location}`:''}</p><small>{new Date(r.created_at).toLocaleString()} · {r.severity} · ETA: {r.eta||'Not provided'}</small>{r.details&&<p>{r.details}</p>}</div><div><span className={`resource-report-status ${r.status==='Resolved'?'done':''}`}>{r.status}</span><select value={r.status} onChange={e=>updateReport(r.id,e.target.value)}><option>Reported</option><option>Assigned</option><option>In Progress</option><option>Resolved</option></select></div></article>):<div className="resource-empty">No reports submitted yet.</div>}
    </section>
    {note&&<div className="surface resource-note" role="status">{note}</div>}
    <div className="resource-disclaimer">DATA TRANSPARENCY: No live water / waste authority feed is connected. Exact tank, pipeline, bin and street maps, schedules, repair ETAs and GPS tracking require verified municipal / sensor data. Current reports are browser-local; imported CSV records are historical.</div>
  </div>
}

function WaterSystems() { return <ResourceOperations kind="water" /> }
function WasteOperations() { return <ResourceOperations kind="waste" /> }


function linearForecast(records, horizon = 7) {
  const rows = records
    .map(r => ({ x: new Date(r.timestamp).getTime(), y: Number(r.value), timestamp: r.timestamp }))
    .filter(r => Number.isFinite(r.x) && Number.isFinite(r.y))
    .sort((a, b) => a.x - b.x)
  if (rows.length < 10) return { status: 'INSUFFICIENT_DATA', count: rows.length }
  const origin = rows[0].x
  const xs = rows.map(r => (r.x - origin) / 86400000)
  const ys = rows.map(r => r.y)
  const mx = xs.reduce((a,b)=>a+b,0)/xs.length
  const my = ys.reduce((a,b)=>a+b,0)/ys.length
  const denominator = xs.reduce((a,x)=>a+(x-mx)**2,0)
  if (!denominator) return { status: 'INSUFFICIENT_DATA', count: rows.length }
  const slope = xs.reduce((a,x,i)=>a+(x-mx)*(ys[i]-my),0)/denominator
  const intercept = my - slope*mx
  const lastDay = xs[xs.length-1]
  const lastTime = rows[rows.length-1].x
  const forecast = Array.from({length:horizon},(_,i)=>{
    const value = intercept + slope*(lastDay+i+1)
    return { date: new Date(lastTime+(i+1)*86400000).toISOString().slice(0,10), value: Math.max(0,value) }
  })
  return { status:'PREDICTION_AVAILABLE', count:rows.length, slope, latest:ys[ys.length-1], average:my, forecast, next:forecast[0]?.value }
}

function MiniBarChart({ title, rows, unit = '', empty = 'No records available.' }) {
  const max = Math.max(1, ...rows.map(r => Number(r.value)||0))
  return <section className="surface intelligence-chart">
    <div className="surface-head"><div><div className="eyebrow">DATA VISUALIZATION</div><h3>{title}</h3></div><small>{unit}</small></div>
    {rows.length ? <div className="intelligence-bars">
      {rows.map((r,i)=><div className="intelligence-bar-item" key={`${r.label}-${i}`} title={`${r.label}: ${r.value} ${unit}`}>
        <b>{Number(r.value).toLocaleString(undefined,{maximumFractionDigits:1})}</b>
        <div className="intelligence-bar-track"><i style={{height:`${Math.max(3,(Number(r.value)||0)/max*100)}%`}} /></div>
        <span>{r.label}</span>
      </div>)}
    </div> : <div className="resource-empty">{empty}</div>}
  </section>
}

function downloadCsv(filename, rows) {
  if (!rows.length) return
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))]
  const quote = value => `"${String(value ?? '').replaceAll('"','""')}"`
  const csv = [columns.map(quote).join(','), ...rows.map(row=>columns.map(col=>quote(row[col])).join(','))].join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], {type:'text/csv;charset=utf-8;'})
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = filename; link.click()
  URL.revokeObjectURL(url)
}

function AIPredictions({ traffic, accidents }) {
  const [datasets,setDatasets] = useState({energy:[],water:[],waste:[]})
  const [trafficRecords,setTrafficRecords] = useState([])
  const [trafficZone,setTrafficZone] = useState('')
  const [trafficMetric,setTrafficMetric] = useState('vehicle_count')
  const [trafficFile,setTrafficFile] = useState(null)
  const [trafficUploading,setTrafficUploading] = useState(false)
  const [trafficBusy,setTrafficBusy] = useState(false)
  const [trafficPrediction,setTrafficPrediction] = useState(null)
  const [trafficNote,setTrafficNote] = useState('')
  const [loading,setLoading] = useState(true)
  const [note,setNote] = useState('')
  const [selectedModule,setSelectedModule] = useState('all')
  const load = useCallback(async()=>{
    setLoading(true); setNote('')
    try {
      const modules=['energy','water','waste']
      const results=await Promise.all(modules.map(async name=>{
        const res=await fetch(`${API}/api/intelligence/records/${name}?limit=2000`)
        if(!res.ok) throw new Error(`${name} records unavailable`)
        const data=await res.json()
        return [name,data.records||[]]
      }))
      setDatasets(Object.fromEntries(results))
      const trafficRes = await fetch(`${API}/api/intelligence/records/traffic?limit=5000`)
      if (trafficRes.ok) {
        const trafficData = await trafficRes.json()
        const rows = trafficData.records || []
        setTrafficRecords(rows)
        const zones = [...new Set(rows.map(r => r.zone).filter(Boolean))].sort()
        setTrafficZone(current => current && zones.includes(current) ? current : (zones[0] || ''))
      }
    } catch(e) { setNote(`${e.message}. Check backend and imported CSV records.`) }
    finally { setLoading(false) }
  },[])
  useEffect(()=>{load()},[load])

  async function importTrafficCsv() {
    if (!trafficFile) { setTrafficNote('Choose a traffic CSV file first.'); return }
    setTrafficUploading(true); setTrafficNote('Validating and importing traffic history…'); setTrafficPrediction(null)
    try {
      const fd = new FormData(); fd.append('file', trafficFile)
      const res = await fetch(`${API}/api/intelligence/import/traffic`, { method: 'POST', body: fd })
      const body = await res.json()
      if (!res.ok) throw new Error(body.detail || 'Traffic CSV import failed.')
      setTrafficNote(`Import complete · ${body.rows_inserted ?? body.inserted ?? body.imported ?? 'Records'} added · ${body.duplicates_skipped ?? 0} duplicates skipped.`)
      setTrafficFile(null)
      await load()
    } catch (e) { setTrafficNote(e.message) } finally { setTrafficUploading(false) }
  }

  async function predictTraffic() {
    if (!trafficZone) { setTrafficNote('Upload traffic history and select a road first.'); return }
    const usable = trafficRecords.filter(r => r.zone === trafficZone && r.metric === trafficMetric)
    if (usable.length < 10) { setTrafficPrediction({ status:'INSUFFICIENT_DATA', message:`${usable.length} records found. At least 10 timestamped records are required for this road and metric.` }); return }
    setTrafficBusy(true); setTrafficPrediction(null); setTrafficNote('')
    try {
      const res = await fetch(`${API}/api/intelligence/predict/traffic?zone=${encodeURIComponent(trafficZone)}&metric=${encodeURIComponent(trafficMetric)}&horizon=7`)
      const body = await res.json()
      if (!res.ok) throw new Error(body.detail || 'Traffic prediction failed.')
      setTrafficPrediction(body)
    } catch (e) { setTrafficPrediction({ status:'UNAVAILABLE', message:e.message }) } finally { setTrafficBusy(false) }
  }

  const trafficZones = [...new Set(trafficRecords.map(r => r.zone).filter(Boolean))].sort()
  const trafficMetricOptions = [...new Set(trafficRecords.filter(r => !trafficZone || r.zone === trafficZone).map(r => r.metric).filter(Boolean))].sort()
  const trafficSelectedRecords = trafficRecords.filter(r => r.zone === trafficZone && r.metric === trafficMetric)
  const trafficForecastRows = (trafficPrediction?.prediction || []).map(point => ({ label:new Date(point.timestamp).toLocaleDateString(undefined,{day:'numeric',month:'short'}), value:Number(point.predicted_value) || 0 }))

  const configs=[
    {module:'energy',metric:'consumption',label:'Energy demand',unit:'kWh',action:'Review additional energy capacity'},
    {module:'water',metric:'water_consumption',label:'Water demand',unit:'litres',action:'Review tank refill and supply schedule'},
    {module:'waste',metric:'waste_quantity',label:'Waste generation',unit:'kg',action:'Review collection capacity and vehicle allocation'},
    {module:'waste',metric:'bin_fill_level',label:'Bin fill level',unit:'%',action:'Prioritize collection / assess additional bins'}
  ]
  const forecasts=configs.filter(c=>selectedModule==='all'||c.module===selectedModule).flatMap(config=>{
    const grouped={}
    ;(datasets[config.module]||[]).filter(r=>r.metric===config.metric).forEach(r=>(grouped[r.zone]??=[]).push(r))
    return Object.entries(grouped).map(([zone,records])=>{
      const result=linearForecast(records)
      const vals=result.forecast?.map(x=>x.value)||[]
      const next=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null
      return {...config,zone,result,next}
    }).filter(x=>x.result.status==='PREDICTION_AVAILABLE')
  })
  // Rank only within the same module + metric; never compare kWh, litres, kg and percentages.
  const forecastGroups={}
  forecasts.forEach(item=>{
    const key=`${item.module}:${item.metric}`
    ;(forecastGroups[key]??=[]).push(item)
  })
  const ranked=Object.values(forecastGroups).flatMap(group=>{
    const sorted=[...group].sort((a,b)=>(b.next??0)-(a.next??0))
    const highCount=Math.max(1,Math.ceil(sorted.length*0.25))
    return sorted.map((item,index)=>({...item,isHigherForecast:index<highCount}))
  })
  const accidentGroups={}
  accidents.forEach(a=>{const key=a.location_name||a.affected_road||'Location not specified'; accidentGroups[key]=(accidentGroups[key]||0)+1})
  const accidentHotspots=Object.entries(accidentGroups).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value).slice(0,6)
  const trafficHotspots=[...traffic].map(t=>({label:t.name,value:t.level==='high'?3:t.level==='medium'?2:1,detail:t.level})).sort((a,b)=>b.value-a.value).slice(0,6)
  const availableModules=['energy','water','waste'].filter(m=>datasets[m]?.length)
  return <div className="intelligence-page">
    <section className="surface intelligence-hero">
      <div><div className="eyebrow">GRIDMIND · RESOURCE INTELLIGENCE</div><h2>AI Predictions & Resource Planning</h2>
      <p>Uploaded Energy, Water and Waste CSV history base panni next 7 days trend estimate pannum. Traffic and accident information separate-ah show pannuvom.</p></div>
      <div className="intelligence-hero-status"><span className="pulse-dot"/>{loading?'ANALYSING DATA':'CSV ANALYSIS READY'}<small>Forecast method: Linear regression baseline</small></div>
    </section>
    <div className="intelligence-toolbar">
      <label>Resource module<select value={selectedModule} onChange={e=>setSelectedModule(e.target.value)}><option value="all">All modules</option><option value="energy">Energy</option><option value="water">Water</option><option value="waste">Waste</option></select></label>
      <button className="ghost-btn" onClick={load}><RotateCcw size={14}/> Refresh data</button>
    </div>
    {note&&<div className="surface resource-note">{note}</div>}
    <div className="resource-kpis">
      <article className="surface"><span>ENERGY CSV RECORDS</span><b>{datasets.energy.length.toLocaleString()}</b><small>{datasets.energy.length?'Historical CSV':'NO DATA'}</small></article>
      <article className="surface"><span>WATER CSV RECORDS</span><b>{datasets.water.length.toLocaleString()}</b><small>{datasets.water.length?'Historical CSV':'NO DATA'}</small></article>
      <article className="surface"><span>WASTE CSV RECORDS</span><b>{datasets.waste.length.toLocaleString()}</b><small>{datasets.waste.length?'Historical CSV':'NO DATA'}</small></article>
      <article className="surface"><span>ACCIDENT REPORTS</span><b>{accidents.length}</b><small>User-submitted records</small></article>
    </div>
    <section className="surface"><div className="surface-head"><div><div className="eyebrow">7-DAY RESOURCE FORECAST</div><h3>Which areas may need more resources?</h3><p className="muted-copy">Area ranking uses the next 7-day average forecast for each metric.</p></div><span className="ai-tag">CSV BASED</span></div>
      {loading?<div className="resource-empty">Analysing historical records…</div>:ranked.length?<div className="intelligence-prediction-grid">{ranked.slice(0,16).map((item,i)=><article className="intelligence-prediction-card" key={`${item.module}-${item.metric}-${item.zone}`}><div className="intelligence-card-top"><span>{item.module.toUpperCase()}</span><span className={`intelligence-risk ${item.isHigherForecast?'high':'normal'}`}>{item.isHigherForecast?'HIGHER IN THIS METRIC':'FORECAST'}</span></div><h3>{item.zone}</h3><b className="intelligence-forecast-value">{item.next.toLocaleString(undefined,{maximumFractionDigits:1})} <small>{item.unit}</small></b><p>{item.label} · next 7-day average</p><small>{item.result.count} historical records used</small><div className="intelligence-action"><strong>Planning insight</strong>{item.action}{item.module==='waste'?' Exact bin / vehicle counts need verified bin capacity and route data.':''}</div></article>)}</div>:<div className="resource-empty">INSUFFICIENT DATA — each area and metric needs at least 10 historical records.</div>}
      <p className="resource-disclaimer">These are baseline statistical estimates from uploaded CSV records, not official utility forecasts. Synthetic sample CSVs produce test-only predictions.</p>
    </section>
    <div className="resource-two-col">
      <MiniBarChart title="Accident report hotspots" rows={accidentHotspots} unit="reports" empty="No accident reports submitted yet."/>
      <MiniBarChart title="Current traffic congestion ranking" rows={trafficHotspots} unit="illustrative level (low=1, medium=2, high=3)" empty="Traffic segment data unavailable."/>
    </div>
    <section className="surface traffic-ai-panel">
      <div className="surface-head"><div><div className="eyebrow">TRAFFIC INTELLIGENCE · HISTORICAL CSV</div><h3>Traffic CSV Upload & 7-Day Prediction</h3><p className="muted-copy">Upload timestamped road-level traffic measurements. Forecasts are generated separately for each road and metric.</p></div><span className="ai-tag">{trafficRecords.length.toLocaleString()} CSV RECORDS</span></div>
      <div className="energy-csv-schema"><b>Required CSV columns</b><code>timestamp,zone,metric,value</code><code>2026-11-01T09:00:00,Avinashi Road,vehicle_count,450</code><code>2026-11-01T10:00:00,Avinashi Road,vehicle_count,520</code><small>Optional column: unit. Supported metrics can include vehicle_count, traffic_density, average_speed. Use consistent units for each road and metric. Minimum 10 timestamped records per selected road + metric.</small></div>
      <div className="traffic-upload-row"><input className="energy-file-input" type="file" accept=".csv,text/csv" onChange={e=>setTrafficFile(e.target.files?.[0]||null)}/><button className="primary-btn" type="button" onClick={importTrafficCsv} disabled={!trafficFile||trafficUploading}><Plus size={14}/>{trafficUploading?'Importing…':'Validate & import traffic CSV'}</button></div>
      {trafficFile&&<small className="energy-selected-file">Selected: {trafficFile.name}</small>}
      {trafficNote&&<div className="resource-note" role="status">{trafficNote}</div>}
      <div className="traffic-predict-controls">
        <label>Road / Zone<select value={trafficZone} onChange={e=>{const nextZone=e.target.value;const nextMetrics=[...new Set(trafficRecords.filter(r=>r.zone===nextZone).map(r=>r.metric).filter(Boolean))].sort();setTrafficZone(nextZone);setTrafficMetric(nextMetrics[0]||'vehicle_count');setTrafficPrediction(null)}}><option value="">Select road</option>{trafficZones.map(z=><option key={z} value={z}>{z}</option>)}</select></label>
        <label>Traffic metric<select value={trafficMetric} onChange={e=>{setTrafficMetric(e.target.value);setTrafficPrediction(null)}}>{(trafficMetricOptions.length?trafficMetricOptions:['vehicle_count','traffic_density','average_speed']).map(m=><option key={m} value={m}>{m.replaceAll('_',' ')}</option>)}</select></label>
        <div className="traffic-record-count"><b>{trafficSelectedRecords.length}</b><small>historical records for selection</small></div>
        <button className="primary-btn" type="button" onClick={predictTraffic} disabled={trafficBusy||!trafficZone||trafficSelectedRecords.length<10}><Activity size={14}/>{trafficBusy?'Predicting…':'Generate 7-day traffic forecast'}</button>
      </div>
      {trafficPrediction&&<div className="traffic-prediction-output">
        <div className="surface-head"><div><div className="eyebrow">FORECAST RESULT · {trafficZone}</div><h3>{trafficPrediction.status==='PREDICTION_AVAILABLE'?'7-day traffic forecast':'Prediction not available'}</h3></div><span className={`intelligence-risk ${trafficPrediction.status==='PREDICTION_AVAILABLE'?'normal':'high'}`}>{trafficPrediction.status||'UNAVAILABLE'}</span></div>
        {trafficPrediction.message&&<p>{trafficPrediction.message}</p>}
        {trafficPrediction.disclaimer&&<p>{trafficPrediction.disclaimer}</p>}
        {trafficForecastRows.length>0?<MiniBarChart title={`Predicted ${trafficMetric.replaceAll('_',' ')} · next 7 days`} rows={trafficForecastRows} unit={trafficPrediction.unit||trafficSelectedRecords[0]?.unit||'CSV unit'}/>:<div className="resource-empty">No forecast points returned. Check that this road has at least 10 valid timestamped records.</div>}
        {trafficPrediction.prediction?.length>0&&<div className="traffic-forecast-list">{trafficPrediction.prediction.map(point=><div key={point.timestamp}><span>{new Date(point.timestamp).toLocaleString()}</span><b>{Number(point.predicted_value).toLocaleString(undefined,{maximumFractionDigits:2})} {trafficPrediction.unit||trafficSelectedRecords[0]?.unit||''}</b></div>)}</div>}
        <small className="energy-footnote">{trafficPrediction.method||'Historical time-series baseline'} · {trafficPrediction.source||'HISTORICAL_CSV'} · Statistical estimate, not a live traffic feed or official traffic forecast.</small>
      </div>}
      <div className="resource-disclaimer">Traffic prediction uses only uploaded timestamped CSV history. Current illustrative road statuses and user-submitted accident reports are not used as traffic-volume training data. Synthetic CSVs produce test-only predictions.</div>
    </section>
    <div className="resource-empty">Accident hotspot counts above are calculated from submitted website reports only; they do not represent all real-world accidents.</div>
  </div>
}

function AnalyticsReports({ traffic, accidents }) {
  const [datasets,setDatasets]=useState({energy:[],water:[],waste:[]})
  const [outages,setOutages]=useState([])
  const [waterReports,setWaterReports]=useState([])
  const [wasteReports,setWasteReports]=useState([])
  const [dateFrom,setDateFrom]=useState('')
  const [dateTo,setDateTo]=useState('')
  const [loading,setLoading]=useState(true)
  const [note,setNote]=useState('')
  const load=useCallback(async()=>{
    setLoading(true);setNote('')
    try{
      const names=['energy','water','waste']
      const [records,energyRes]=await Promise.all([
        Promise.all(names.map(async name=>{const r=await fetch(`${API}/api/intelligence/records/${name}?limit=2000`);if(!r.ok)throw new Error(`${name} data unavailable`);const d=await r.json();return [name,d.records||[]]})),
        fetch(`${API}/api/energy`)
      ])
      setDatasets(Object.fromEntries(records))
      if(energyRes.ok){const d=await energyRes.json();setOutages(d.outages||[])}
      try{setWaterReports(JSON.parse(localStorage.getItem('gridmind-water-reports')||'[]'))}catch{setWaterReports([])}
      try{setWasteReports(JSON.parse(localStorage.getItem('gridmind-waste-reports')||'[]'))}catch{setWasteReports([])}
    }catch(e){setNote(`${e.message}. Some analytics may be unavailable.`)}
    finally{setLoading(false)}
  },[])
  useEffect(()=>{load()},[load])
  const inRange=date=>{if(!date)return true;const d=new Date(date);return (!dateFrom||d>=new Date(`${dateFrom}T00:00:00`))&&(!dateTo||d<=new Date(`${dateTo}T23:59:59`))}
  const filteredAccidents=accidents.filter(a=>inRange(a.created_at))
  const filteredOutages=outages.filter(a=>inRange(a.created_at||a.reported_at))
  const filteredWater=waterReports.filter(a=>inRange(a.created_at))
  const filteredWaste=wasteReports.filter(a=>inRange(a.created_at))
  const groupCount=(items,keyFn)=>{const map={};items.forEach(item=>{const k=keyFn(item)||'Not specified';map[k]=(map[k]||0)+1});return Object.entries(map).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value)}
  const accidentRows=groupCount(filteredAccidents,a=>a.location_name||a.affected_road).slice(0,8)
  const trafficRows=groupCount(traffic,t=>`${t.name} (${t.level})`).slice(0,8)
  const resourceRows=(moduleName,metric)=>{const grouped={};(datasets[moduleName]||[]).filter(r=>r.metric===metric&&inRange(r.timestamp)).forEach(r=>{const z=r.zone||'Unknown';(grouped[z]??=[]).push(Number(r.value))});return Object.entries(grouped).map(([label,vals])=>({label,value:vals.reduce((a,b)=>a+b,0)/vals.length})).sort((a,b)=>b.value-a.value).slice(0,8)}
  const energyRows=resourceRows('energy','consumption')
  const waterRows=resourceRows('water','water_consumption')
  const wasteRows=resourceRows('waste','waste_quantity')
  const allReports=filteredAccidents.length+filteredOutages.length+filteredWater.length+filteredWaste.length
  const statusCount=items=>items.filter(x=>['Resolved','Completed','Fixed'].includes(x.status)).length
  const reportRows=[
    {label:'Accidents',value:filteredAccidents.length},
    {label:'Energy outages',value:filteredOutages.length},
    {label:'Water reports',value:filteredWater.length},
    {label:'Waste reports',value:filteredWaste.length}
  ]
  const exportRows=[
    ...filteredAccidents.map(a=>({category:'Accident',location:a.location_name,road:a.affected_road,status:a.status,severity:a.severity,created_at:a.created_at})),
    ...filteredOutages.map(a=>({category:'Energy outage',location:a.zone||a.location,status:a.status,created_at:a.created_at||a.reported_at})),
    ...filteredWater.map(a=>({category:'Water report',location:a.zone||a.location,status:a.status,issue:a.issue,created_at:a.created_at})),
    ...filteredWaste.map(a=>({category:'Waste report',location:a.zone||a.location,status:a.status,issue:a.issue,created_at:a.created_at}))
  ]
  return <div className="intelligence-page">
    <section className="surface intelligence-hero"><div><div className="eyebrow">GRIDMIND · CITY PERFORMANCE</div><h2>Analytics & Reports</h2><p>Accidents, traffic and Energy / Water / Waste data in one city-wide analytics workspace.</p></div><div className="intelligence-hero-status"><span className="pulse-dot"/>{loading?'LOADING ANALYTICS':'DATA AGGREGATED'}<small>Sources: CSV history + website reports</small></div></section>
    <div className="intelligence-toolbar">
      <label>From<input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></label>
      <label>To<input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}/></label>
      <button className="ghost-btn" onClick={()=>{setDateFrom('');setDateTo('')}}>Clear dates</button>
      <button className="ghost-btn" onClick={load}><RotateCcw size={14}/> Refresh</button>
      <button className="primary-btn" onClick={()=>downloadCsv('GRIDMIND_Incident_Report.csv',exportRows)} disabled={!exportRows.length}>Export reports CSV</button>
      <button className="ghost-btn" onClick={()=>window.print()}>Print / Save PDF</button>
    </div>
    {note&&<div className="surface resource-note">{note}</div>}
    <div className="resource-kpis">
      <article className="surface"><span>TOTAL INCIDENT REPORTS</span><b>{allReports}</b><small>All report categories</small></article>
      <article className="surface"><span>ACCIDENT REPORTS</span><b>{filteredAccidents.length}</b><small>Website submissions</small></article>
      <article className="surface"><span>PENDING REPORTS</span><b>{[...filteredAccidents,...filteredOutages,...filteredWater,...filteredWaste].filter(x=>!['Resolved','Completed','Fixed'].includes(x.status)).length}</b><small>Not marked resolved</small></article>
      <article className="surface"><span>RESOLVED REPORTS</span><b>{statusCount(filteredAccidents)+statusCount(filteredOutages)+statusCount(filteredWater)+statusCount(filteredWaste)}</b><small>Marked completed / resolved</small></article>
    </div>
    <div className="resource-two-col">
      <MiniBarChart title="Accidents by location" rows={accidentRows} unit="reports" empty="No accident reports in selected date range."/>
      <MiniBarChart title="Current traffic by road segment" rows={trafficRows} unit="current status (illustrative)" empty="No traffic segment data."/>
      <MiniBarChart title="Average energy consumption by area" rows={energyRows} unit="CSV unit" empty="No energy consumption records found."/>
      <MiniBarChart title="Average water consumption by area" rows={waterRows} unit="litres (CSV)" empty="No water_consumption records found."/>
      <MiniBarChart title="Average waste quantity by area" rows={wasteRows} unit="kg (CSV)" empty="No waste_quantity records found."/>
      <MiniBarChart title="Reports by category" rows={reportRows} unit="reports"/>
    </div>
    <section className="surface"><div className="surface-head"><div><div className="eyebrow">REPORT SUMMARY</div><h3>Incident report register summary</h3><p className="muted-copy">Counts are taken from the existing report APIs and browser-local Water / Waste report registers.</p></div><b>{allReports} TOTAL</b></div>
      <div className="intelligence-report-table"><div><b>Category</b><b>Total</b><b>Resolved</b><b>Pending / Other</b></div>
        {[
          ['Accidents',filteredAccidents],
          ['Energy outages',filteredOutages],
          ['Water reports',filteredWater],
          ['Waste reports',filteredWaste]
        ].map(([name,items])=><div key={name}><span>{name}</span><b>{items.length}</b><span>{statusCount(items)}</span><span>{items.length-statusCount(items)}</span></div>)}
      </div>
    </section>
    <div className="resource-disclaimer">DATA TRANSPARENCY: Accident counts include only reports submitted through this website. Traffic road-segment values are currently illustrative, not live historical traffic measurements. Resource charts use uploaded CSV records; test CSVs produce test analytics, not verified municipal statistics. Browser-local Water / Waste reports are visible only in this browser.</div>
  </div>
}


function App() {
  const [traffic, setTraffic] = useState([]), [accidents, setAccidents] = useState([]), [overview, setOverview] = useState(null)
  const [error, setError] = useState(''), [active, setActive] = useState('overview'), [mobileNav, setMobileNav] = useState(false), [lastUpdated, setLastUpdated] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gridmind-profile') || '{"name":"Guest User","email":""}') }
    catch { return { name: 'Guest User', email: '' } }
  })
  const [profileDraft, setProfileDraft] = useState(profile)
  const refresh = useCallback(async () => {
    try {
      const [tr, ac, ov] = await Promise.all([fetch(`${API}/api/traffic`), fetch(`${API}/api/accidents`), fetch(`${API}/api/overview`)])
      if (!tr.ok || !ac.ok || !ov.ok) throw new Error('Backend request failed')
      const [td, ad, od] = await Promise.all([tr.json(), ac.json(), ov.json()])
      setTraffic(td.segments || []); setAccidents(ad.accidents || []); setOverview(od); setError(''); setLastUpdated(new Date())
    } catch { setError('Backend not connected. Start the FastAPI server on port 8000.') }
  }, [])
  useEffect(() => { refresh(); const timer = setInterval(refresh, 7000); return () => clearInterval(timer) }, [refresh])
  useEffect(() => {
    const onKeyDown = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); searchInputRef.current?.focus() }
      if (event.key === 'Escape') { setSearchOpen(false); setProfileOpen(false) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  const searchResults = nav.filter(item => `${item.label} ${item.group || ''}`.toLowerCase().includes(searchQuery.trim().toLowerCase()))
  function openSearchResult(id) { setActive(id); setSearchOpen(false); setSearchQuery('') }
  function saveProfile(event) {
    event.preventDefault()
    const next = { name: profileDraft.name.trim() || 'Guest User', email: profileDraft.email.trim() }
    setProfile(next); localStorage.setItem('gridmind-profile', JSON.stringify(next)); setProfileOpen(false)
  }

  async function changeStatus(id, status) {
    try { const res = await fetch(`${API}/api/accidents/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); const data = await res.json(); if (!res.ok) throw new Error(data.detail || 'Status update failed'); await refresh() }
    catch (e) { setError(e.message) }
  }
  const activeNav = nav.find(n => n.id === active), pending = accidents.filter(a => a.status === 'Pending')

  const overviewPage = <>
    <div className="metrics-grid"><Metric label="CITY TRAFFIC INDEX" value={overview?.traffic_index ?? '—'} unit="/100" icon={Activity} tone="violet" delta="ILLUSTRATIVE" sub="traffic layer" /><Metric label="PENDING ACCIDENTS" value={pending.length} unit="" icon={AlertTriangle} tone="coral" delta={pending.length ? 'ACTION REQUIRED' : 'ALL CLEAR'} sub="user reports" /><Metric label="AVG. ROAD SPEED" value={overview?.avg_speed ?? '—'} unit="km/h" icon={CarFront} tone="blue" delta="ESTIMATED" sub="network average" /><Metric label="CITY RESOURCE HEALTH" value={overview?.resource_health ?? '—'} unit="%" icon={Layers3} tone="mint" delta="DEMO" sub="system health" /></div>
    <div className="overview-grid overview-summary-grid"><section className="surface"><div className="surface-head"><div><div className="eyebrow">CITY OPERATIONS</div><h3>Operational summary</h3><p>Traffic map and road-level details are managed in the dedicated Traffic Intelligence workspace.</p></div><button className="ghost-btn" onClick={() => setActive('traffic')}>Open Traffic Intelligence <ArrowUpRight size={14} /></button></div><div className="command-shortcuts"><button onClick={() => setActive('emergency')}><AlertTriangle size={18}/><span><b>Emergency Response</b><small>Review and update citizen accident reports</small></span><ChevronRight size={16}/></button><button onClick={() => setActive('energy')}><Zap size={18}/><span><b>Energy Network</b><small>Review outage reports and imported readings</small></span><ChevronRight size={16}/></button><button onClick={() => setActive('water')}><Droplets size={18}/><span><b>Water Systems</b><small>Review tank readings and local reports</small></span><ChevronRight size={16}/></button><button onClick={() => setActive('waste')}><Recycle size={18}/><span><b>Waste Operations</b><small>Review uploaded waste records and reports</small></span><ChevronRight size={16}/></button></div></section>
      <div className="stack"><section className="surface"><div className="surface-head"><div><div className="eyebrow">INCIDENT STATUS</div><h3>Priority alerts</h3></div><span className="alert-count">{String(pending.length).padStart(2, '0')}</span></div>{pending.length ? pending.slice(0, 4).map(a => <div className="alert-item" key={a.id}><span className="alert-symbol"><AlertTriangle size={16} /></span><div><b>{a.title}</b><small>{a.location_name}</small><time>Pending · {a.affected_road}</time></div></div>) : <div className="calm-state"><ShieldCheck size={21} /><b>No pending accidents</b><small>New reports will appear here.</small></div>}<button className="primary-btn" onClick={() => setActive('emergency')} style={{ marginTop: 14 }}>Open Emergency Response <ChevronRight size={15} /></button></section><section className="surface"><div className="eyebrow">INCIDENT REGISTER</div><h3>Report summary</h3><div className="kpi-list"><div><span>Total reports</span><b>{accidents.length}</b></div><div><span>Pending</span><b>{pending.length}</b></div><div><span>Resolved</span><b>{accidents.length - pending.length}</b></div></div></section></div></div>
  </>

  const renderSimpleModule = () => <div className="module-grid"><section className="surface module-hero"><div className="eyebrow">GRIDMIND CITY SYSTEMS</div><h3>{activeNav?.label}</h3><p>This module remains part of the GRIDMIND academic prototype. Its displayed values are illustrative and are not connected to live municipal infrastructure.</p><span className="demo-note">ACADEMIC DEMO MODULE</span></section><section className="surface"><div className="eyebrow">SYSTEM STATUS</div><h3>Monitoring active</h3><div className="calm-state large"><ShieldCheck size={28} /><b>Module available</b><small>Use the navigation to switch between city systems.</small></div></section></div>

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}><div className="brand"><div className="brand-mark">G</div><div><b>GRIDMIND</b><small>URBAN INTELLIGENCE</small></div></div><div className="nav-label">WORKSPACE</div>
      {nav.map(item => <div key={item.id}>{item.group && <div className="nav-group-label">{item.group}</div>}<button className={`nav-item ${active === item.id ? 'active' : ''}`} onClick={() => { setActive(item.id); setMobileNav(false) }}><item.icon size={17} /><span>{item.label}</span>{item.badge && <em>{item.badge}</em>}</button></div>)}
      <div className="sidebar-bottom"><div className="system-status"><i /> PROTOTYPE SERVICES AVAILABLE</div><div className="city-label"><MapPin size={13} /> Coimbatore, India</div><small>GRIDMIND v2.0 · ACADEMIC DEMO</small></div>
    </aside>
    {mobileNav && <div className="nav-scrim" onClick={() => setMobileNav(false)} />}
    <main className="main"><header className="topbar"><div className="heading-left"><button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu size={19} /></button><div><div className="breadcrumb">GRIDMIND <span>/</span> {activeNav?.label.toUpperCase()}</div><h1>{active === 'overview' ? 'City Command Center' : activeNav?.label}</h1><p>{active === 'overview' ? 'A unified operational view of Coimbatore’s urban infrastructure.' : 'Monitor, report and respond to city-wide operations.'}</p></div></div><div className="top-actions"><div className="global-search-wrap"><div className="search-pill"><Search size={14} /><input ref={searchInputRef} aria-label="Search city systems" placeholder="Search city systems" value={searchQuery} onFocus={() => setSearchOpen(true)} onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }} onKeyDown={e => { if (e.key === 'Enter' && searchResults[0]) openSearchResult(searchResults[0].id) }} /><kbd>Ctrl K</kbd>{searchQuery && <button className="search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search"><X size={13}/></button>}</div>{searchOpen && <div className="search-results">{searchResults.length ? searchResults.map(item => <button key={item.id} onClick={() => openSearchResult(item.id)}><item.icon size={15}/><span>{item.label}</span><small>{item.group || 'WORKSPACE'}</small></button>) : <div className="search-no-results">No matching city system</div>}</div>}</div><span className="demo-badge"><i /> DEMO ENVIRONMENT</span><button className="icon-btn" title="Notifications" onClick={() => setActive('emergency')}><Bell size={17} />{pending.length > 0 && <i />}</button><div className="profile-wrap"><button className="avatar profile-avatar" title="User account" onClick={() => { setProfileDraft(profile); setProfileOpen(!profileOpen) }}>{(profile.name || 'Guest User').trim().split(/\s+/).map(part => part[0]).slice(0,2).join('').toUpperCase()}</button>{profileOpen && <form className="profile-menu" onSubmit={saveProfile}><div className="profile-menu-title"><UserRound size={16}/> User account</div><label>Display name<input value={profileDraft.name} onChange={e=>setProfileDraft({...profileDraft,name:e.target.value})} placeholder="Your name"/></label><label>Email address<input type="email" value={profileDraft.email} onChange={e=>setProfileDraft({...profileDraft,email:e.target.value})} placeholder="name@example.com"/></label><small>Profile details are saved in this browser. GRIDMIND does not currently have server authentication.</small><div><button type="button" className="outline-btn" onClick={()=>setProfileOpen(false)}>Cancel</button><button className="primary-btn" type="submit">Save profile</button></div></form>}</div></div></header>
      {error && <div className="error-banner"><AlertTriangle size={15} />{error}</div>}
      <div className="page-content"><div className="page-toolbar"><div className="location-label"><MapPin size={14} /> COIMBATORE METROPOLITAN AREA <span>·</span> TAMIL NADU</div><div className="toolbar-right"><span className="refresh-label"><span className="pulse-dot" /> AUTO REFRESH · 7 SEC</span><button className="refresh-btn" onClick={refresh}><RotateCcw size={14} /> Refresh</button></div></div>
        {active === 'overview' && overviewPage}
        {active === 'traffic' && <div className="page-grid"><section className="surface wide-surface"><div className="surface-head"><div><div className="eyebrow">MOBILITY OPERATIONS</div><h3>Traffic network monitor</h3><p>Illustrative road-level traffic conditions and user-reported accidents</p></div><span className="live-pill">ILLUSTRATIVE DATA</span></div><TrafficMap traffic={traffic} accidents={pending} /><div className="map-meta"><span><MapPin size={13} /> Coimbatore arterial roads</span><span>Illustrative traffic layer</span></div></section><section className="surface"><div className="eyebrow">ROAD SEGMENTS</div><h3>Congestion breakdown</h3><RoadTable traffic={traffic} /></section></div>}
        {active === 'emergency' && <div className="module-grid"><section className="surface module-hero"><div className="eyebrow">INCIDENT COMMAND</div><h3>Emergency response center</h3><p>Report multiple accidents, view their exact pinned locations, and update each report between Pending and Resolved.</p><div className="kpi-list" style={{ marginTop: 20 }}><div><span>Pending</span><b style={{ color: '#ff647c' }}>{pending.length}</b></div><div><span>Resolved</span><b>{accidents.length - pending.length}</b></div><div><span>Total reports</span><b>{accidents.length}</b></div></div></section><AccidentReportForm onCreated={refresh} /><section className="surface wide-surface"><div className="surface-head"><div><div className="eyebrow">INCIDENT LOCATION</div><h3>Accident map</h3><p>All user-submitted reports · Pending shown in red</p></div></div><div className="map-frame"><MapBase><AccidentMarkers accidents={accidents} /></MapBase><div className="map-chip"><span className="pulse-dot" /> USER-REPORTED INCIDENTS</div><div className="map-legend"><b>MAP LEGEND</b><span><i className="red" /> Reported accident</span></div></div></section><AccidentList accidents={accidents} onStatus={changeStatus} /></div>}
        {active === 'routes' && <RouteOptimizer accidents={accidents} overview={overview} />}
        {active === 'energy' && <EnergyNetwork />}

        {active === 'water' && <WaterSystems />}
        {active === 'waste' && <WasteOperations />}
         {active === 'insights' && <AIPredictions traffic={traffic} accidents={accidents} />}
        {active === 'analytics' && <AnalyticsReports traffic={traffic} accidents={accidents} />}
      </div><footer><span>GRIDMIND</span> · Smart City Resource Intelligence Platform <b>Academic prototype · Not connected to live municipal infrastructure</b></footer>
    </main>
  </div>
}

export default App
