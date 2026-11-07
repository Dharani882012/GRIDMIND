import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet'
import {
  Activity, AlertTriangle, Bell, CarFront, Droplets, Gauge, Layers3, Zap,
  Route, BrainCircuit, BarChart3, Menu, Search, ArrowUpRight, Wind,
  ShieldCheck, Clock3, MapPin, ChevronRight, Siren, Recycle, TrendingUp,
  Crosshair, Navigation, RotateCcw, CheckCircle2, Plus, ListChecks
} from 'lucide-react'
import 'leaflet/dist/leaflet.css'

const API = 'http://127.0.0.1:8000'
const center = [11.0168, 76.9558]
const colors = { low: '#20c997', medium: '#f4bd50', high: '#ff647c' }
const nav = [
  { id: 'overview', label: 'Command Center', icon: Gauge, group: 'OPERATIONS' },
  { id: 'traffic', label: 'Traffic Intelligence', icon: CarFront, badge: 'LIVE' },
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
      setNote(`${body.rows_inserted} records imported · ${body.duplicates_skipped} duplicates skipped.`)
      setSelectedFile(null)
      setFileInputKey(key => key + 1)
      await load()
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

function App() {
  const [traffic, setTraffic] = useState([]), [accidents, setAccidents] = useState([]), [overview, setOverview] = useState(null)
  const [error, setError] = useState(''), [active, setActive] = useState('overview'), [mobileNav, setMobileNav] = useState(false), [lastUpdated, setLastUpdated] = useState(new Date())
  const refresh = useCallback(async () => {
    try {
      const [tr, ac, ov] = await Promise.all([fetch(`${API}/api/traffic`), fetch(`${API}/api/accidents`), fetch(`${API}/api/overview`)])
      if (!tr.ok || !ac.ok || !ov.ok) throw new Error('Backend request failed')
      const [td, ad, od] = await Promise.all([tr.json(), ac.json(), ov.json()])
      setTraffic(td.segments || []); setAccidents(ad.accidents || []); setOverview(od); setError(''); setLastUpdated(new Date())
    } catch { setError('Backend not connected. Start the FastAPI server on port 8000.') }
  }, [])
  useEffect(() => { refresh(); const timer = setInterval(refresh, 7000); return () => clearInterval(timer) }, [refresh])

  async function changeStatus(id, status) {
    try { const res = await fetch(`${API}/api/accidents/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); const data = await res.json(); if (!res.ok) throw new Error(data.detail || 'Status update failed'); await refresh() }
    catch (e) { setError(e.message) }
  }
  const activeNav = nav.find(n => n.id === active), pending = accidents.filter(a => a.status === 'Pending')

  const overviewPage = <>
    <div className="metrics-grid"><Metric label="CITY TRAFFIC INDEX" value={overview?.traffic_index ?? '—'} unit="/100" icon={Activity} tone="violet" delta="ILLUSTRATIVE" sub="traffic layer" /><Metric label="PENDING ACCIDENTS" value={pending.length} unit="" icon={AlertTriangle} tone="coral" delta={pending.length ? 'ACTION REQUIRED' : 'ALL CLEAR'} sub="user reports" /><Metric label="AVG. ROAD SPEED" value={overview?.avg_speed ?? '—'} unit="km/h" icon={CarFront} tone="blue" delta="ESTIMATED" sub="network average" /><Metric label="CITY RESOURCE HEALTH" value={overview?.resource_health ?? '—'} unit="%" icon={Layers3} tone="mint" delta="DEMO" sub="system health" /></div>
    <div className="overview-grid"><section className="surface map-surface"><div className="surface-head"><div><div className="eyebrow">GEOSPATIAL INTELLIGENCE</div><h3>Coimbatore city map</h3><p>User-reported accident locations and illustrative traffic signals</p></div><button className="ghost-btn" onClick={() => setActive('traffic')}>Explore traffic <ArrowUpRight size={14} /></button></div><TrafficMap traffic={traffic} accidents={pending} /><div className="map-meta"><span><MapPin size={13} /> Coimbatore, Tamil Nadu</span><span><Clock3 size={13} /> Updated {lastUpdated.toLocaleTimeString()}</span></div></section><div className="stack"><section className="surface"><div className="surface-head"><div><div className="eyebrow">INCIDENT STATUS</div><h3>Priority alerts</h3></div><span className="alert-count">{String(pending.length).padStart(2, '0')}</span></div>{pending.length ? pending.slice(0, 4).map(a => <div className="alert-item" key={a.id}><span className="alert-symbol"><AlertTriangle size={16} /></span><div><b>{a.title}</b><small>{a.location_name}</small><time>Pending · {a.affected_road}</time></div></div>) : <div className="calm-state"><ShieldCheck size={21} /><b>No pending accidents</b><small>New reports will appear here.</small></div>}<button className="primary-btn" onClick={() => setActive('emergency')} style={{ marginTop: 14 }}>Open Emergency Response <ChevronRight size={15} /></button></section></div></div>
    <div className="bottom-grid"><section className="surface"><div className="surface-head"><div><div className="eyebrow">MOBILITY NETWORK</div><h3>Road performance</h3></div><button className="text-btn" onClick={() => setActive('traffic')}>View all <ChevronRight size={14} /></button></div><RoadTable traffic={traffic} /></section><section className="surface"><div className="surface-head"><div><div className="eyebrow">INCIDENT REGISTER</div><h3>Report summary</h3></div><span className="ai-tag"><ListChecks size={13} /> LIVE DATA</span></div><div className="kpi-list"><div><span>Total reports</span><b>{accidents.length}</b></div><div><span>Pending</span><b>{pending.length}</b></div><div><span>Resolved</span><b>{accidents.length - pending.length}</b></div></div></section></div>
  </>

  const renderSimpleModule = () => <div className="module-grid"><section className="surface module-hero"><div className="eyebrow">GRIDMIND CITY SYSTEMS</div><h3>{activeNav?.label}</h3><p>This module remains part of the GRIDMIND academic prototype. Its displayed values are illustrative and are not connected to live municipal infrastructure.</p><span className="demo-note">ACADEMIC DEMO MODULE</span></section><section className="surface"><div className="eyebrow">SYSTEM STATUS</div><h3>Monitoring active</h3><div className="calm-state large"><ShieldCheck size={28} /><b>Module available</b><small>Use the navigation to switch between city systems.</small></div></section></div>

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}><div className="brand"><div className="brand-mark">G</div><div><b>GRIDMIND</b><small>URBAN INTELLIGENCE</small></div></div><div className="nav-label">WORKSPACE</div>
      {nav.map(item => <div key={item.id}>{item.group && <div className="nav-group-label">{item.group}</div>}<button className={`nav-item ${active === item.id ? 'active' : ''}`} onClick={() => { setActive(item.id); setMobileNav(false) }}><item.icon size={17} /><span>{item.label}</span>{item.badge && <em>{item.badge}</em>}</button></div>)}
      <div className="sidebar-bottom"><div className="system-status"><i /> ALL SYSTEMS OPERATIONAL</div><div className="city-label"><MapPin size={13} /> Coimbatore, India</div><small>GRIDMIND v2.0 · ACADEMIC DEMO</small></div>
    </aside>
    {mobileNav && <div className="nav-scrim" onClick={() => setMobileNav(false)} />}
    <main className="main"><header className="topbar"><div className="heading-left"><button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu size={19} /></button><div><div className="breadcrumb">GRIDMIND <span>/</span> {activeNav?.label.toUpperCase()}</div><h1>{active === 'overview' ? 'City Command Center' : activeNav?.label}</h1><p>{active === 'overview' ? 'A unified operational view of Coimbatore’s urban infrastructure.' : 'Monitor, report and respond to city-wide operations.'}</p></div></div><div className="top-actions"><div className="search-pill"><Search size={14} /><span>Search city systems</span><kbd>⌘ K</kbd></div><span className="demo-badge"><i /> DEMO ENVIRONMENT</span><button className="icon-btn" title="Notifications" onClick={() => setActive('emergency')}><Bell size={17} />{pending.length > 0 && <i />}</button><div className="avatar">GM</div></div></header>
      {error && <div className="error-banner"><AlertTriangle size={15} />{error}</div>}
      <div className="page-content"><div className="page-toolbar"><div className="location-label"><MapPin size={14} /> COIMBATORE METROPOLITAN AREA <span>·</span> TAMIL NADU</div><div className="toolbar-right"><span className="refresh-label"><span className="pulse-dot" /> AUTO REFRESH · 7 SEC</span><button className="refresh-btn" onClick={refresh}><RotateCcw size={14} /> Refresh</button></div></div>
        {active === 'overview' && overviewPage}
        {active === 'traffic' && <div className="page-grid"><section className="surface wide-surface"><div className="surface-head"><div><div className="eyebrow">MOBILITY OPERATIONS</div><h3>Traffic network monitor</h3><p>Illustrative road-level traffic conditions and user-reported accidents</p></div><span className="live-pill"><i /> AUTO REFRESH</span></div><TrafficMap traffic={traffic} accidents={pending} /><div className="map-meta"><span><MapPin size={13} /> Coimbatore arterial roads</span><span>Illustrative traffic layer</span></div></section><section className="surface"><div className="eyebrow">ROAD SEGMENTS</div><h3>Congestion breakdown</h3><RoadTable traffic={traffic} /></section></div>}
        {active === 'emergency' && <div className="module-grid"><section className="surface module-hero"><div className="eyebrow">INCIDENT COMMAND</div><h3>Emergency response center</h3><p>Report multiple accidents, view their exact pinned locations, and update each report between Pending and Resolved.</p><div className="kpi-list" style={{ marginTop: 20 }}><div><span>Pending</span><b style={{ color: '#ff647c' }}>{pending.length}</b></div><div><span>Resolved</span><b>{accidents.length - pending.length}</b></div><div><span>Total reports</span><b>{accidents.length}</b></div></div></section><AccidentReportForm onCreated={refresh} /><section className="surface wide-surface"><div className="surface-head"><div><div className="eyebrow">INCIDENT LOCATION</div><h3>Accident map</h3><p>All user-submitted reports · Pending shown in red</p></div></div><div className="map-frame"><MapBase><AccidentMarkers accidents={accidents} /></MapBase><div className="map-chip"><span className="pulse-dot" /> USER-REPORTED INCIDENTS</div><div className="map-legend"><b>MAP LEGEND</b><span><i className="red" /> Reported accident</span></div></div></section><AccidentList accidents={accidents} onStatus={changeStatus} /></div>}
        {active === 'routes' && <RouteOptimizer accidents={accidents} overview={overview} />}
        {active === 'energy' && <EnergyNetwork />}

        {['water', 'waste', 'insights', 'analytics'].includes(active) && renderSimpleModule()}
      </div><footer><span>GRIDMIND</span> · Smart City Resource Intelligence Platform <b>Academic prototype · Not connected to live municipal infrastructure</b></footer>
    </main>
  </div>
}

export default App
