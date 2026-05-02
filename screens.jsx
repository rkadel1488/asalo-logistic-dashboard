// Tracking, Fleet, Notifications, and other screens

/* ============== LIVE TRACKING ============== */

const CITY_COORDS = {
  "Melbourne DC":          [-37.8136, 144.9631],
  "Melbourne":             [-37.8136, 144.9631],
  "Geelong West":          [-38.1499, 144.3617],
  "Geelong":               [-38.1499, 144.3617],
  "Sydney Hub":            [-33.8688, 151.2093],
  "Sydney":                [-33.8688, 151.2093],
  "Brisbane Hub":          [-27.4698, 153.0251],
  "Brisbane":              [-27.4698, 153.0251],
  "Brisbane — Eagle Farm": [-27.4390, 153.0880],
  "Eagle Farm":            [-27.4390, 153.0880],
  "Adelaide — Hindmarsh":  [-34.9285, 138.6007],
  "Adelaide":              [-34.9285, 138.6007],
  "Perth Yard":            [-31.9505, 115.8605],
  "Perth":                 [-31.9505, 115.8605],
  "Hobart Port":           [-42.8821, 147.3272],
  "Hobart":                [-42.8821, 147.3272],
  "Launceston Market":     [-41.4332, 147.1441],
  "Launceston":            [-41.4332, 147.1441],
  "Kalgoorlie Site B":     [-30.7496, 121.4664],
  "Kalgoorlie":            [-30.7496, 121.4664],
  "Toowoomba — East":      [-27.5598, 151.9507],
  "Toowoomba":             [-27.5598, 151.9507],
  "Newcastle Med Centre":  [-32.9283, 151.7817],
  "Newcastle":             [-32.9283, 151.7817],
  "Bendigo Depot":         [-36.7570, 144.2794],
  "Bendigo":               [-36.7570, 144.2794],
};

function getCoords(cityKey) {
  if (!cityKey) return [-25.2744, 133.7751];
  if (CITY_COORDS[cityKey]) return CITY_COORDS[cityKey];
  const key = Object.keys(CITY_COORDS).find(k => cityKey.startsWith(k) || k.startsWith(cityKey.split(" ")[0]));
  return key ? CITY_COORDS[key] : [-25.2744, 133.7751];
}

function lerpCoords(origin, dest, t) {
  const o = getCoords(origin), d = getCoords(dest);
  return [o[0] + (d[0] - o[0]) * t, o[1] + (d[1] - o[1]) * t];
}

const ORDER_PROGRESS = {
  "ASL-24868": 0.62,
  "ASL-24867": 0.84,
  "ASL-24866": 0.40,
  "ASL-24869": 0.30,
  "ASL-24870": 0.10,
};

function TrackingScreen({ orders, drivers, assignments, onAssign, onRemove }) {
  const inTransit = orders.filter((o) => ["in_transit", "loaded", "delayed"].includes(o.status));
  const [activeId, setActiveId] = React.useState(inTransit[0]?.id || null);
  const [showAssign, setShowAssign] = React.useState(null);

  const mapRef = React.useRef(null);
  const mapInst = React.useRef(null);
  const layersRef = React.useRef({});
  const panToRef = React.useRef(null);

  const allDrivers = drivers || window.DRIVERS || [];
  const getDriver = (dId) => allDrivers.find(d => d.id === dId);
  const assignedIds = Object.values(assignments).filter(Boolean);
  const availableDrivers = allDrivers.filter(d => !assignedIds.includes(d.id) && d.status !== "rest");

  // Init Leaflet map once
  React.useEffect(() => {
    if (!mapRef.current || mapInst.current) return;
    const map = L.map(mapRef.current, { center: [-25.5, 134.0], zoom: 4, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);
    mapInst.current = map;
    panToRef.current = (latlng, zoom) => map.setView(latlng, zoom || map.getZoom(), { animate: true });
    return () => { map.remove(); mapInst.current = null; layersRef.current = {}; };
  }, []);

  // Redraw markers & routes whenever assignments or activeId changes
  React.useEffect(() => {
    const map = mapInst.current;
    if (!map) return;

    Object.values(layersRef.current).forEach(l => { try { l.remove(); } catch(e) {} });
    layersRef.current = {};

    inTransit.forEach(o => {
      const progress = ORDER_PROGRESS[o.id] || 0.1;
      const isActive = o.id === activeId;
      const driverId = assignments[o.id];
      const driver = getDriver(driverId);
      const originLL = getCoords(o.origin);
      const destLL = getCoords(o.destination);
      const truckLL = lerpCoords(o.origin, o.destination, progress);

      const routeColor = isActive ? "#c4a827" : "#555";
      const routeOpacity = isActive ? 0.9 : 0.35;

      // Traveled segment (solid)
      const traveled = L.polyline([originLL, truckLL], {
        color: routeColor, weight: isActive ? 3 : 2, opacity: routeOpacity,
      }).addTo(map);

      // Remaining segment (dashed)
      const remaining = L.polyline([truckLL, destLL], {
        color: routeColor, weight: isActive ? 2 : 1.5, opacity: routeOpacity * 0.6,
        dashArray: "6 6",
      }).addTo(map);

      layersRef.current[o.id + "-t"] = traveled;
      layersRef.current[o.id + "-r"] = remaining;

      // Origin dot
      layersRef.current[o.id + "-o"] = L.circleMarker(originLL, {
        radius: 5, color: "#888", fillColor: "#555", fillOpacity: 1, weight: 1.5,
      }).addTo(map).bindTooltip(`<b>Origin:</b> ${o.origin}`, { className: "leaflet-tt" });

      // Destination dot
      layersRef.current[o.id + "-d"] = L.circleMarker(destLL, {
        radius: 6, color: isActive ? "#c4a827" : "#4ade80",
        fillColor: isActive ? "#c4a827" : "#22c55e", fillOpacity: 1, weight: 2,
      }).addTo(map).bindTooltip(`<b>Destination:</b> ${o.destination}`, { className: "leaflet-tt" });

      // Truck marker — only if vehicle assigned
      if (driver) {
        const html = `<div style="
          background:${isActive ? "#c4a827" : "#1e1e2e"};
          color:${isActive ? "#000" : "#ddd"};
          border:2px solid ${isActive ? "#a38920" : "#444"};
          border-radius:6px; padding:3px 8px;
          font-size:11px; font-weight:700; white-space:nowrap;
          box-shadow:0 2px 8px rgba(0,0,0,0.5); cursor:pointer;
          font-family:monospace;
        ">🚛 ${driver.truck} · ${o.id.slice(-3)}</div>`;
        const icon = L.divIcon({ className: "", html, iconSize: [null, null], iconAnchor: [40, 14] });
        layersRef.current[o.id + "-truck"] = L.marker(truckLL, { icon })
          .addTo(map)
          .bindTooltip(`${driver.name} · ${Math.round(progress * 100)}% · ETA ${o.eta}`)
          .on("click", () => setActiveId(o.id));
      } else {
        // Ghost marker for unassigned
        const html = `<div style="
          background:#2a2a3e; color:#888; border:1.5px dashed #555;
          border-radius:6px; padding:3px 8px; font-size:10px;
          white-space:nowrap; font-family:monospace;
        ">? No vehicle · ${o.id.slice(-3)}</div>`;
        const icon = L.divIcon({ className: "", html, iconSize: [null, null], iconAnchor: [40, 14] });
        layersRef.current[o.id + "-ghost"] = L.marker(truckLL, { icon })
          .addTo(map)
          .on("click", () => { setActiveId(o.id); setShowAssign(o.id); });
      }
    });
  }, [assignments, activeId, inTransit.length]);

  // Pan map to active shipment
  React.useEffect(() => {
    if (!activeId || !panToRef.current) return;
    const o = inTransit.find(x => x.id === activeId);
    if (!o) return;
    const progress = ORDER_PROGRESS[o.id] || 0.1;
    const truckLL = lerpCoords(o.origin, o.destination, progress);
    panToRef.current(truckLL, 6);
  }, [activeId]);

  function assignDriver(orderId, driverId) {
    onAssign(orderId, driverId);
    setShowAssign(null);
  }

  function removeVehicle(orderId) {
    onRemove(orderId);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 14, height: "calc(100vh - 48px)", padding: 18 }}>

      {/* ---- Leaflet map ---- */}
      <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)" }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

        {/* Legend overlay */}
        <div style={{
          position: "absolute", left: 14, bottom: 24, zIndex: 1000,
          background: "rgba(10,10,18,0.88)", border: "1px solid var(--line)",
          borderRadius: 6, padding: "8px 11px", fontSize: 11.5, backdropFilter: "blur(4px)",
        }}>
          <div style={{ fontWeight: 700, marginBottom: 5, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--fg-2)" }}>
            Live · {Object.keys(assignments).filter(id => inTransit.find(o=>o.id===id)).length} tracked / {inTransit.length} active
          </div>
          <div className="row" style={{ gap: 6, marginBottom: 3 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: "#c4a827" }} /> Active route</div>
          <div className="row" style={{ gap: 6, marginBottom: 3 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: "#22c55e" }} /> Destination</div>
          <div className="row" style={{ gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: "#555", border: "1px dashed #888" }} /> Unassigned</div>
        </div>
      </div>

      {/* ---- Side panel ---- */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
        <div className="panel" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div className="panel-h">
            <span className="ttl">Shipments</span>
            <div className="sp" />
            <span className="muted" style={{ fontSize: 10.5 }}>Click to focus map</span>
          </div>
          <div style={{ overflow: "auto", flex: 1 }}>
            {inTransit.map(o => {
              const progress = ORDER_PROGRESS[o.id] || 0.1;
              const driver = getDriver(assignments[o.id]);
              const isActive = o.id === activeId;
              return (
                <div key={o.id}
                  onClick={() => setActiveId(o.id)}
                  style={{
                    padding: "11px 14px", borderBottom: "1px solid var(--line)", cursor: "pointer",
                    background: isActive ? "var(--bg-2)" : "transparent",
                    borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  }}
                >
                  <div className="row" style={{ justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
                    <span className="mono" style={{ fontWeight: 700, fontSize: 12 }}>{o.id}</span>
                    <StatusPill status={o.status} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>{o.customer}</div>
                  <div className="row muted" style={{ gap: 4, fontSize: 11 }}>
                    {o.origin.split(" ")[0]} <Icon name="arrow" size={9} stroke={1.4} /> {o.destination.split(" ")[0]}
                  </div>
                  <div className="bar" style={{ marginTop: 7 }}>
                    <div style={{ width: `${progress * 100}%` }} />
                  </div>

                  {/* Vehicle row */}
                  {driver ? (
                    <div className="row" style={{ marginTop: 6, justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10.5, color: "var(--fg-1)" }}>
                        🚛 {driver.truck} · {driver.name} · {Math.round(progress * 100)}%
                      </span>
                      <button
                        className="btn ghost sm"
                        style={{ fontSize: 10, padding: "1px 6px" }}
                        onClick={e => { e.stopPropagation(); removeVehicle(o.id); }}
                        title="Remove vehicle"
                      >
                        <Icon name="x" size={9} /> Remove
                      </button>
                    </div>
                  ) : (
                    <div className="row" style={{ marginTop: 6, justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10.5, color: "var(--st-delayed)" }}>⚠ No vehicle assigned</span>
                      <button
                        className="btn sm"
                        style={{ fontSize: 10, padding: "1px 7px" }}
                        onClick={e => { e.stopPropagation(); setActiveId(o.id); setShowAssign(o.id); }}
                      >
                        <Icon name="plus" size={9} /> Assign
                      </button>
                    </div>
                  )}
                  <div className="muted mono" style={{ fontSize: 10, marginTop: 3 }}>ETA {o.eta}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---- Assign Vehicle Modal ---- */}
      {showAssign && (() => {
        const o = inTransit.find(x => x.id === showAssign);
        if (!o) return null;
        return (
          <div className="modal-bd" onClick={() => setShowAssign(null)}>
            <div className="modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="truck" />
                <div>
                  <div style={{ fontWeight: 600 }}>Assign vehicle to {o.id}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{o.customer} · {o.origin} → {o.destination}</div>
                </div>
                <div style={{ flex: 1 }} />
                <button className="btn ghost sm" onClick={() => setShowAssign(null)}><Icon name="x" size={14} /></button>
              </div>
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                {availableDrivers.length === 0 ? (
                  <div className="hint">No available drivers at this time. All vehicles are assigned or on rest.</div>
                ) : availableDrivers.map(d => (
                  <div key={d.id}
                    className="row"
                    style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--bg-2)", cursor: "pointer", gap: 12 }}
                    onClick={() => assignDriver(o.id, d.id)}
                  >
                    <div className="sb-avatar" style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}>
                      {d.name.split(" ").map(p => p[0]).join("")}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                      <div className="muted mono" style={{ fontSize: 11 }}>{d.truck} · {d.phone}</div>
                      <div className="muted" style={{ fontSize: 10.5 }}>Currently: {d.route}</div>
                    </div>
                    <div>
                      <span className="chip">
                        <span className="dot" style={{ background: d.status === "available" ? "var(--st-delivered)" : "var(--st-loaded)" }} />
                        {d.status === "available" ? "Available" : "Loading"}
                      </span>
                      <div className="muted mono" style={{ fontSize: 10, marginTop: 4, textAlign: "right" }}>{d.hours}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ============== FLEET ============== */
function AddDriverModal({ open, onClose, onSave }) {
  const blank = { name: "", phone: "", truck: "", location: "", status: "available" };
  const [form, setForm] = React.useState(blank);
  React.useEffect(() => { if (open) setForm(blank); }, [open]);
  if (!open) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  function save() {
    if (!form.name.trim() || !form.truck.trim()) return;
    onSave({
      id: "drv-" + Date.now().toString(36),
      name: form.name.trim(),
      phone: form.phone.trim() || "—",
      truck: form.truck.trim(),
      route: form.location.trim() || "Base",
      status: form.status,
      load: 0,
      hours: "0h 00m / 12h",
    });
    onClose();
  }
  return (
    <div className="modal-bd" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="truck" />
          <div style={{ fontWeight: 600 }}>Add driver</div>
          <div style={{ flex: 1 }} />
          <button className="btn ghost sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="field">
              <label>Full name <span style={{ color: "var(--st-delayed)" }}>*</span></label>
              <input placeholder="e.g. Jamie Pham" value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input placeholder="+61 4…" value={form.phone} onChange={e => set("phone", e.target.value)} className="mono" />
            </div>
            <div className="field">
              <label>Truck / Vehicle ID <span style={{ color: "var(--st-delayed)" }}>*</span></label>
              <input placeholder="e.g. Truck 32" value={form.truck} onChange={e => set("truck", e.target.value)} className="mono" />
            </div>
            <div className="field">
              <label>Current location</label>
              <input placeholder="e.g. Melbourne DC" value={form.location} onChange={e => set("location", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Initial status</label>
            <div className="seg">
              {[["available","Available"],["loading","Loading"],["rest","On rest"]].map(([k,l]) => (
                <button key={k} className={form.status === k ? "on" : ""} onClick={() => set("status", k)} style={{ flex: 1 }}>{l}</button>
              ))}
            </div>
          </div>
          <div className="hint">Fields marked <span style={{ color: "var(--st-delayed)" }}>*</span> are required.</div>
        </div>
        <div style={{ padding: 14, borderTop: "1px solid var(--line)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={!form.name.trim() || !form.truck.trim()}>
            <Icon name="plus" size={13} /> Add driver
          </button>
        </div>
      </div>
    </div>
  );
}

function DriverMessageModal({ driver, onClose, onSend }) {
  const [text, setText] = React.useState("");
  if (!driver) return null;
  return (
    <div className="modal-bd" onClick={onClose}>
      <div className="modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="sms" />
          <div>
            <div style={{ fontWeight: 600 }}>Message {driver.name}</div>
            <div className="muted mono" style={{ fontSize: 11.5 }}>{driver.phone} · {driver.truck}</div>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn ghost sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field">
            <label>Message · {text.length} chars</label>
            <textarea rows={4} placeholder={`Hi ${driver.name.split(" ")[0]}, …`} value={text} onChange={e => setText(e.target.value)} />
          </div>
          <div className="hint">Sent via TransVirtual SMS gateway · sender ID <span className="mono">ASALO</span></div>
        </div>
        <div style={{ padding: 14, borderTop: "1px solid var(--line)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <a href={`sms:${driver.phone.replace(/\s/g,"")}`}
            className="btn"
            style={{ textDecoration: "none" }}
            onClick={onClose}
          >
            <Icon name="sms" size={13} /> Open in Messages
          </a>
          <button className="btn primary" disabled={!text.trim()} onClick={() => { onSend(driver, text); onClose(); }}>
            <Icon name="sms" size={13} /> Send
          </button>
        </div>
      </div>
    </div>
  );
}

function FleetScreen({ drivers, assignments, orders, onAddDriver, onToast }) {
  const [showAdd, setShowAdd] = React.useState(false);
  const [msgDriver, setMsgDriver] = React.useState(null);
  const [statusFilter, setStatusFilter] = React.useState("all");

  const stMap = {
    on_route:  { lbl: "On route",  color: "var(--st-in_transit)" },
    loading:   { lbl: "Loading",   color: "var(--st-loaded)" },
    available: { lbl: "Available", color: "var(--st-delivered)" },
    rest:      { lbl: "On rest",   color: "var(--fg-3)" },
  };

  // Build reverse map: driverId → assigned order
  const driverOrderMap = {};
  Object.entries(assignments || {}).forEach(([orderId, driverId]) => {
    if (driverId) driverOrderMap[driverId] = orderId;
  });

  // Effective status: if driver has an active assignment → on_route
  function effectiveStatus(d) {
    return driverOrderMap[d.id] ? "on_route" : d.status;
  }

  const filtered = drivers.filter(d => statusFilter === "all" || effectiveStatus(d) === statusFilter);
  const onRouteCount = drivers.filter(d => driverOrderMap[d.id]).length;

  function handleSend(driver, text) {
    onToast && onToast({ ttl: `Message sent to ${driver.name}`, sub: `${driver.truck} · ${driver.phone}` });
  }

  return (
    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* KPIs */}
      <div className="kpis">
        <div className="kpi"><div className="lbl">Active drivers</div><div className="val">{drivers.length}</div><div className="delta up">{onRouteCount} on route now</div></div>
        <div className="kpi"><div className="lbl">Fleet utilisation</div><div className="val">78%</div><div className="delta">Target 85%</div><Sparkline data={[60,65,72,68,74,76,78,80,77,78,76,78]} /></div>
        <div className="kpi"><div className="lbl">Reefer trucks</div><div className="val">6 / 8</div><div className="delta">2 in service</div></div>
        <div className="kpi"><div className="lbl">Avg HOS used</div><div className="val">7h 24m</div><div className="delta">of 12h limit</div></div>
      </div>

      {/* Table */}
      <div className="panel" style={{ overflow: "hidden" }}>
        <div className="panel-h">
          <span className="ttl">Drivers</span>
          <span className="sub">{drivers.length} total</span>
          <div className="sp" />
          {/* Status filter */}
          <div className="seg">
            {[["all","All"],["on_route","On route"],["available","Available"],["loading","Loading"],["rest","Rest"]].map(([k,l]) => (
              <button key={k} className={statusFilter === k ? "on" : ""} onClick={() => setStatusFilter(k)}>{l}</button>
            ))}
          </div>
          <button className="btn primary sm" onClick={() => setShowAdd(true)}>
            <Icon name="plus" size={12} /> Add driver
          </button>
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th>Driver</th>
              <th>Vehicle</th>
              <th>Status</th>
              <th>Current assignment</th>
              <th>Load</th>
              <th>Hours of service</th>
              <th style={{ width: 110 }}>Contact</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => {
              const assignedOrderId = driverOrderMap[d.id];
              const assignedOrder = assignedOrderId ? (orders || []).find(o => o.id === assignedOrderId) : null;
              const effStatus = effectiveStatus(d);
              return (
                <tr key={d.id}>
                  {/* Driver */}
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <div className="sb-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
                        {d.name.split(" ").map(p => p[0]).join("")}
                      </div>
                      <div>
                        <div style={{ color: "var(--fg-0)", fontWeight: 500 }}>{d.name}</div>
                        <div className="mono muted" style={{ fontSize: 10.5 }}>{d.phone}</div>
                      </div>
                    </div>
                  </td>

                  {/* Vehicle */}
                  <td className="mono">{d.truck}</td>

                  {/* Status */}
                  <td>
                    <span className="chip">
                      <span className="dot" style={{ background: stMap[effStatus]?.color || "var(--fg-3)" }} />
                      {stMap[effStatus]?.lbl || effStatus}
                    </span>
                  </td>

                  {/* Assignment — live from tracking */}
                  <td>
                    {assignedOrder ? (
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 12, color: "var(--fg-0)" }}>
                          {assignedOrder.id}
                        </div>
                        <div className="muted" style={{ fontSize: 11 }}>
                          {assignedOrder.origin} → {assignedOrder.destination}
                        </div>
                        <div className="muted mono" style={{ fontSize: 10.5 }}>
                          ETA {assignedOrder.eta}
                        </div>
                      </div>
                    ) : (
                      <span className="muted" style={{ fontSize: 11.5 }}>{d.route}</span>
                    )}
                  </td>

                  {/* Load */}
                  <td style={{ width: 110 }}>
                    <div className="bar"><div style={{ width: `${(d.load || 0) * 100}%` }} /></div>
                    <div className="mono muted" style={{ fontSize: 10.5, marginTop: 2 }}>{Math.round((d.load || 0) * 100)}%</div>
                  </td>

                  {/* HOS */}
                  <td className="mono">{d.hours}</td>

                  {/* Contact actions */}
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      <a
                        href={`tel:${(d.phone || "").replace(/\s/g, "")}`}
                        className="btn ghost sm"
                        title={`Call ${d.name}`}
                        style={{ textDecoration: "none" }}
                      >
                        <Icon name="phone" size={12} />
                      </a>
                      <button
                        className="btn ghost sm"
                        title={`Message ${d.name}`}
                        onClick={() => setMsgDriver(d)}
                      >
                        <Icon name="sms" size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 28, color: "var(--fg-3)" }}>No drivers match this filter</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AddDriverModal open={showAdd} onClose={() => setShowAdd(false)} onSave={d => { onAddDriver(d); setShowAdd(false); }} />
      <DriverMessageModal driver={msgDriver} onClose={() => setMsgDriver(null)} onSend={handleSend} />
    </div>
  );
}

/* ============== NOTIFICATIONS ============== */
function TemplateModal({ template, onClose, onSave }) {
  // template = { key, body } for edit, or null for new
  const isNew = !template;
  const [key, setKey] = React.useState(template?.key || "");
  const [body, setBody] = React.useState(template?.body || "");
  const [trigger, setTrigger] = React.useState(template?.key || "custom");

  const knownStatuses = (window.ORDER_STATUSES || []).map(s => s.key);
  const isStatusTrigger = knownStatuses.includes(trigger);

  function save() {
    if (!key.trim() || !body.trim()) return;
    onSave({ key: key.trim(), body: body.trim() });
    onClose();
  }

  const VARS = ["{name}", "{ref}", "{eta}", "{driver}", "{time}", "{window}"];

  return (
    <div className="modal-bd" onClick={onClose}>
      <div className="modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="sms" />
          <div style={{ fontWeight: 600 }}>{isNew ? "New template" : `Edit template · ${template.key}`}</div>
          <div style={{ flex: 1 }} />
          <button className="btn ghost sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>

        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Trigger key */}
          <div className="field">
            <label>Trigger / key {isNew && <span style={{ color: "var(--st-delayed)" }}>*</span>}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <select
                value={isStatusTrigger ? trigger : "custom"}
                onChange={e => { const v = e.target.value; setTrigger(v); if (v !== "custom") setKey(v); }}
                style={{ background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--fg-0)", borderRadius: 4, padding: "6px 8px", fontSize: 12.5 }}
              >
                {(window.ORDER_STATUSES || []).map(s => <option key={s.key} value={s.key}>{s.label} trigger</option>)}
                <option value="custom">Custom trigger</option>
              </select>
              <input
                className="mono"
                placeholder="e.g. out_for_delivery"
                value={key}
                onChange={e => setKey(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                readOnly={isStatusTrigger && !isNew}
              />
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
              Status triggers fire automatically when an order advances. Custom triggers can be sent manually.
            </div>
          </div>

          {/* Message body */}
          <div className="field">
            <label>Message body {isNew && <span style={{ color: "var(--st-delayed)" }}>*</span>} · {body.length} chars / {Math.max(1, Math.ceil(body.length / 160))} segment</label>
            <textarea
              rows={4}
              placeholder="Hi {name}, your ASALO order {ref}…"
              value={body}
              onChange={e => setBody(e.target.value)}
            />
          </div>

          {/* Variable chips */}
          <div>
            <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Available variables — click to insert:</div>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              {VARS.map(v => (
                <button key={v} className="chip" style={{ cursor: "pointer", fontFamily: "monospace" }}
                  onClick={() => setBody(b => b + v)}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="hint">
            Sent via TransVirtual SMS gateway · sender ID <span className="mono">ASALO</span> · est. cost <span className="mono">$0.04</span> / segment
          </div>
        </div>

        <div style={{ padding: 14, borderTop: "1px solid var(--line)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={!key.trim() || !body.trim()}>
            <Icon name="check" size={13} /> {isNew ? "Create template" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationsScreen({ log, onToast }) {
  const [logFilter, setLogFilter] = React.useState("all");
  const [templates, setTemplates] = React.useState(() => Object.entries(window.SMS_TEMPLATES).map(([key, body]) => ({ key, body })));
  const [templateModal, setTemplateModal] = React.useState(null); // null | "new" | { key, body }

  // Log filter counts
  const counts = {
    all: log.length,
    delivered: log.filter(m => m.status === "delivered").length,
    failed: log.filter(m => m.status === "failed").length,
    queued: log.filter(m => m.status === "queued").length,
  };
  const filteredLog = logFilter === "all" ? log : log.filter(m => m.status === logFilter);

  function saveTemplate({ key, body }) {
    setTemplates(arr => {
      const idx = arr.findIndex(t => t.key === key);
      if (idx >= 0) {
        const updated = [...arr]; updated[idx] = { key, body }; return updated;
      }
      return [...arr, { key, body }];
    });
    onToast && onToast({ ttl: "Template saved", sub: `trigger: ${key}` });
  }

  function deleteTemplate(key) {
    setTemplates(arr => arr.filter(t => t.key !== key));
    onToast && onToast({ ttl: "Template deleted", sub: key });
  }

  return (
    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* KPIs */}
      <div className="kpis">
        <div className="kpi"><div className="lbl">SMS sent · 24h</div><div className="val">418</div><Sparkline data={[20,30,28,40,44,38,42,50,48,52,56,62]} /></div>
        <div className="kpi"><div className="lbl">Delivery rate</div><div className="val">99.2%</div><div className="delta up">▲ TransVirtual gateway</div></div>
        <div className="kpi"><div className="lbl">Failed</div><div className="val">{counts.failed}</div><div className="delta down">Auto-retry in 4 min</div></div>
        <div className="kpi"><div className="lbl">Cost · 24h</div><div className="val">$16.72</div><div className="delta">$0.04 / msg avg</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 14 }}>

        {/* SMS Log */}
        <div className="panel" style={{ overflow: "hidden" }}>
          <div className="panel-h">
            <span className="ttl">SMS log · live</span>
            <div className="sp" />
            <div className="seg">
              {[
                ["all", `All ${counts.all}`],
                ["delivered", `Delivered ${counts.delivered}`],
                ["failed", `Failed ${counts.failed}`],
                ["queued", `Queued ${counts.queued}`],
              ].map(([k, lbl]) => (
                <button key={k} className={logFilter === k ? "on" : ""} onClick={() => setLogFilter(k)}>{lbl}</button>
              ))}
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 55 }}>Time</th>
                <th>Recipient</th>
                <th>Order</th>
                <th>Trigger</th>
                <th>Message</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLog.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 28, color: "var(--fg-3)" }}>
                  No {logFilter !== "all" ? logFilter : ""} messages
                </td></tr>
              ) : filteredLog.map((m, i) => (
                <tr key={i}>
                  <td className="mono">{m.ts}</td>
                  <td className="mono">{m.to}</td>
                  <td className="mono">{m.ref}</td>
                  <td><StatusPill status={m.trigger} /></td>
                  <td style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.preview}</td>
                  <td>
                    <span className="chip">
                      <span className="dot" style={{ background: m.status === "delivered" ? "var(--st-delivered)" : m.status === "queued" ? "var(--st-loaded)" : "var(--st-delayed)" }} />
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Templates panel */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div className="panel-h">
            <span className="ttl">Templates</span>
            <span className="sub">{templates.length} total</span>
            <div className="sp" />
            <button className="btn primary sm" onClick={() => setTemplateModal("new")}>
              <Icon name="plus" size={12} /> New template
            </button>
          </div>
          <div className="panel-b" style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "auto", flex: 1 }}>
            {templates.map(({ key, body }) => {
              const meta = (window.ORDER_STATUSES || []).find(s => s.key === key);
              return (
                <div key={key} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 6, padding: 10 }}>
                  <div className="row" style={{ justifyContent: "space-between", marginBottom: 6, gap: 6 }}>
                    {meta ? <StatusPill status={key} /> : (
                      <span className="chip" style={{ fontFamily: "monospace", fontSize: 11 }}>{key}</span>
                    )}
                    <div className="row" style={{ gap: 4 }}>
                      <button className="btn ghost sm" title="Edit" onClick={() => setTemplateModal({ key, body })}>
                        <Icon name="edit" size={11} />
                      </button>
                      {!meta && (
                        <button className="btn ghost sm" title="Delete" onClick={() => deleteTemplate(key)}>
                          <Icon name="x" size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-1)", lineHeight: 1.5 }}>{body}</div>
                  <div className="muted mono" style={{ fontSize: 10, marginTop: 6 }}>
                    {body.length} chars · {Math.max(1, Math.ceil(body.length / 160))} segment
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Template modal — new or edit */}
      {templateModal && (
        <TemplateModal
          template={templateModal === "new" ? null : templateModal}
          onClose={() => setTemplateModal(null)}
          onSave={saveTemplate}
        />
      )}
    </div>
  );
}

/* ============== CUSTOMERS ============== */
function NewCustomerModal({ open, onClose, onSave }) {
  const blank = { name: "", contact: "", phone: "", tier: "Standard", value: "$0", orders: 0 };
  const [form, setForm] = React.useState(blank);
  React.useEffect(() => { if (open) setForm(blank); }, [open]);
  if (!open) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  function save() {
    if (!form.name.trim()) return;
    onSave({ ...form, name: form.name.trim(), contact: form.contact.trim() || "—", phone: form.phone.trim() || "—" });
    onClose();
  }
  return (
    <div className="modal-bd" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="contact" />
          <div style={{ fontWeight: 600 }}>New customer</div>
          <div style={{ flex: 1 }} />
          <button className="btn ghost sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field">
            <label>Company name <span style={{ color: "var(--st-delayed)" }}>*</span></label>
            <input placeholder="e.g. Greenline Grocers Pty" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="field">
              <label>Primary contact</label>
              <input placeholder="e.g. Alicia M." value={form.contact} onChange={e => set("contact", e.target.value)} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input placeholder="+61 4…" value={form.phone} onChange={e => set("phone", e.target.value)} className="mono" />
            </div>
          </div>
          <div className="field">
            <label>Account tier</label>
            <div className="seg">
              {["Standard", "Pro", "Enterprise"].map(t => (
                <button key={t} className={form.tier === t ? "on" : ""} onClick={() => set("tier", t)} style={{ flex: 1 }}>{t}</button>
              ))}
            </div>
          </div>
          <div className="hint">Fields marked <span style={{ color: "var(--st-delayed)" }}>*</span> are required. Orders and lifetime value will update as invoices are created.</div>
        </div>
        <div style={{ padding: 14, borderTop: "1px solid var(--line)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={!form.name.trim()}>
            <Icon name="plus" size={13} /> Add customer
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomersScreen({ customers, onAddCustomer, onToast }) {
  const [showAdd, setShowAdd] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.contact || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="panel" style={{ overflow: "hidden" }}>
        <div className="panel-h">
          <span className="ttl">Customers</span>
          <span className="sub">{customers.length} accounts</span>
          <div style={{ flex: 1 }} />
          <div style={{ position: "relative" }}>
            <Icon name="search" size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--fg-3)" }} />
            <input placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 28, fontSize: 12.5, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 6, padding: "5px 10px 5px 28px", color: "var(--fg-0)", width: 200 }} />
          </div>
          <button className="btn primary sm" onClick={() => setShowAdd(true)}>
            <Icon name="plus" size={12} /> New customer
          </button>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Account</th>
              <th>Primary contact</th>
              <th>Phone</th>
              <th style={{ textAlign: "right" }}>Orders</th>
              <th style={{ textAlign: "right" }}>Lifetime value</th>
              <th>Tier</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.name}>
                <td style={{ color: "var(--fg-0)", fontWeight: 500 }}>{c.name}</td>
                <td>{c.contact}</td>
                <td className="mono">{c.phone}</td>
                <td className="mono tnum" style={{ textAlign: "right" }}>{c.orders}</td>
                <td className="mono tnum" style={{ textAlign: "right" }}>{c.value}</td>
                <td><span className="chip">{c.tier}</span></td>
                <td><button className="btn ghost sm"><Icon name="arrow" size={12} /></button></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 28, color: "var(--fg-3)" }}>No customers found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <NewCustomerModal open={showAdd} onClose={() => setShowAdd(false)} onSave={c => { onAddCustomer(c); setShowAdd(false); }} />
    </div>
  );
}

/* ============== API ============== */
function ApiCredentialCard({ title, subtitle, defaultEndpoint, keyPlaceholder, fields = [], initialConnected = false, onToast }) {
  const [endpoint, setEndpoint] = React.useState(defaultEndpoint);
  const [apiKey, setApiKey] = React.useState("");
  const [extras, setExtras] = React.useState(() => Object.fromEntries(fields.map(f => [f.name, f.default || ""])));
  const [show, setShow] = React.useState(false);
  const [connected, setConnected] = React.useState(initialConnected);
  const [testing, setTesting] = React.useState(false);

  function save() {
    if (!apiKey.trim()) {
      onToast && onToast({ ttl: `${title}: API key required`, sub: "Paste a key to save credentials" });
      return;
    }
    setConnected(true);
    onToast && onToast({ ttl: `${title} credentials saved`, sub: "Stored encrypted · ready for use" });
  }
  function test() {
    if (!apiKey.trim()) { onToast && onToast({ ttl: `${title}: add an API key first`, sub: "" }); return; }
    setTesting(true);
    setTimeout(() => { setTesting(false); onToast && onToast({ ttl: `${title}: connection OK`, sub: "Round-trip 92ms" }); }, 800);
  }
  function disconnect() {
    setConnected(false); setApiKey(""); onToast && onToast({ ttl: `${title} disconnected`, sub: "Credentials cleared" });
  }

  return (
    <div className="panel">
      <div className="panel-h">
        <span className="ttl">{title}</span>
        {subtitle && <span className="sub">{subtitle}</span>}
        <span className="chip" style={{ marginLeft: 8 }}>
          <span className="dot" style={{ background: connected ? "var(--st-delivered)" : "var(--fg-3)" }} />
          {connected ? "Connected" : "Not configured"}
        </span>
        <div className="sp" />
        <button className="btn sm" onClick={test} disabled={testing}>
          <Icon name="refresh" size={12} /> {testing ? "Testing…" : "Test"}
        </button>
      </div>
      <div className="panel-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="field">
          <label>API endpoint</label>
          <input className="mono" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://…" />
        </div>
        <div className="field">
          <label>API key</label>
          <div className="row" style={{ gap: 6 }}>
            <input className="mono" type={show ? "text" : "password"} value={apiKey}
              onChange={(e) => setApiKey(e.target.value)} placeholder={keyPlaceholder || "Paste API key — add later if not ready"} style={{ flex: 1 }} />
            <button className="btn sm" onClick={() => setShow((s) => !s)}><Icon name="eye" size={12} /></button>
          </div>
        </div>
        {fields.map((f) => (
          <div className="field" key={f.name}>
            <label>{f.label}</label>
            <input className={f.mono ? "mono" : ""} value={extras[f.name]} placeholder={f.placeholder || ""}
              onChange={(e) => setExtras((x) => ({ ...x, [f.name]: e.target.value }))} />
          </div>
        ))}
        <div className="row" style={{ gap: 8, marginTop: 4 }}>
          <button className="btn primary sm" onClick={save}><Icon name="check" size={12} /> Save credentials</button>
          {connected && <button className="btn sm danger" onClick={disconnect}><Icon name="x" size={12} /> Disconnect</button>}
          <div className="sp" style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: 11 }}>Stored encrypted at rest</span>
        </div>
      </div>
    </div>
  );
}

function ApiScreen({ onToast }) {
  return (
    <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <ApiCredentialCard
        title="TransVirtual"
        subtitle="Logistics ops, dispatch, tracking"
        defaultEndpoint="https://app.transvirtual.com/api/v1"
        keyPlaceholder="tv_live_… (paste when ready)"
        onToast={onToast}
        fields={[
          { name: "account", label: "Account ID", placeholder: "e.g. asalo-au", mono: true },
          { name: "webhook", label: "Webhook URL", placeholder: "https://asalo.co/api/hooks/tv", mono: true, default: "https://asalo.co/api/hooks/tv" },
        ]}
      />

      <ApiCredentialCard
        title="SMS gateway"
        subtitle="Customer notifications · choose any provider"
        defaultEndpoint=""
        keyPlaceholder="Paste API key (Twilio, MessageBird, ClickSend, Vonage…)"
        onToast={onToast}
        fields={[
          { name: "provider", label: "Provider", placeholder: "Twilio / MessageBird / ClickSend / Vonage / custom" },
          { name: "sender", label: "Sender ID", placeholder: "ASALO", default: "ASALO" },
          { name: "from", label: "From number", placeholder: "+61 4 …", mono: true },
        ]}
      />

      <div className="panel" style={{ gridColumn: "span 2" }}>
        <div className="panel-h">
          <span className="ttl">Connections</span>
          <div className="sp" />
          <button className="btn sm"><Icon name="plus" size={12} /> Add integration</button>
        </div>
        <div className="panel-b" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {[
            { n: "Website orders (asalo.co)", s: "Receives new orders via webhook", live: true },
            { n: "Email · Postmark", s: "Transactional email", live: false },
            { n: "Accounting · Xero", s: "Sync invoices & customers", live: false },
            { n: "Slack · #ops-alerts", s: "Push alerts to ops channel", live: false },
          ].map((c) => (
            <div key={c.n} className="row" style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--bg-2)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{c.n}</div>
                <div className="muted" style={{ fontSize: 11 }}>{c.s}</div>
              </div>
              <span className="chip">
                <span className="dot" style={{ background: c.live ? "var(--st-delivered)" : "var(--fg-3)" }} />
                {c.live ? "Live" : "Add later"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel" style={{ gridColumn: "span 2" }}>
        <div className="panel-h"><span className="ttl">Webhook events · last hour</span></div>
        <table className="tbl">
          <thead>
            <tr><th>Time</th><th>Event</th><th>Resource</th><th>Status</th><th>Latency</th></tr>
          </thead>
          <tbody>
            {[
              ["14:42:18", "shipment.in_transit", "ASL-24867", "200", "84ms"],
              ["14:42:18", "sms.delivered",        "ASL-24867", "200", "120ms"],
              ["14:31:02", "shipment.loaded",      "ASL-24868", "200", "92ms"],
              ["14:18:45", "order.created",        "ASL-24871", "200", "76ms"],
              ["14:11:11", "shipment.delayed",     "ASL-24866", "200", "104ms"],
            ].map((r,i) => (
              <tr key={i}>
                <td className="mono">{r[0]}</td>
                <td className="mono">{r[1]}</td>
                <td className="mono">{r[2]}</td>
                <td><span className="chip"><span className="dot" style={{ background: "var(--st-delivered)" }} />{r[3]}</span></td>
                <td className="mono">{r[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============== ANALYTICS ============== */
function AnalyticsScreen() {
  return (
    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="kpis">
        <div className="kpi"><div className="lbl">Revenue · 30d</div><div className="val">$284k</div><div className="delta up">▲ 14.2%</div><Sparkline data={[180,200,210,220,235,240,260,255,270,275,280,284]} /></div>
        <div className="kpi"><div className="lbl">Orders</div><div className="val">3,142</div><div className="delta up">▲ 8.4%</div><Sparkline data={[2400,2600,2700,2800,2900,3000,3050,3100,3120,3140,3142]} /></div>
        <div className="kpi"><div className="lbl">Avg transit time</div><div className="val">18.4h</div><div className="delta">−1.2h vs last 30d</div></div>
        <div className="kpi"><div className="lbl">Cost / km</div><div className="val">$0.92</div><div className="delta">▼ $0.04</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        <div className="panel" style={{ minHeight: 280 }}>
          <div className="panel-h">
            <span className="ttl">Volume by cargo type</span>
            <div className="sp" />
            <div className="seg"><button className="on">30d</button><button>90d</button><button>YTD</button></div>
          </div>
          <div className="panel-b">
            <BarChart />
          </div>
        </div>
        <div className="panel">
          <div className="panel-h"><span className="ttl">Top routes</span></div>
          <div className="panel-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["Melbourne → Adelaide", 482, 1],
              ["Sydney → Brisbane", 410, 0.85],
              ["Melbourne → Geelong", 388, 0.80],
              ["Perth → Kalgoorlie", 264, 0.55],
              ["Hobart → Launceston", 196, 0.40],
            ].map(([r, n, w]) => (
              <div key={r}>
                <div className="row" style={{ justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span>{r}</span><span className="mono muted">{n}</span>
                </div>
                <div className="bar"><div style={{ width: `${w * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BarChart() {
  const cats = ["Pallets", "Parcels", "Barrels", "Cold chain"];
  const series = [
    { day: "Mon", v: [40, 65, 30, 50] },
    { day: "Tue", v: [55, 70, 25, 60] },
    { day: "Wed", v: [50, 80, 35, 55] },
    { day: "Thu", v: [60, 75, 28, 70] },
    { day: "Fri", v: [70, 90, 40, 80] },
    { day: "Sat", v: [30, 50, 22, 35] },
    { day: "Sun", v: [25, 40, 18, 30] },
  ];
  const colors = ["var(--st-loaded)", "var(--st-new)", "var(--accent)", "var(--st-in_transit)"];
  const max = 240;
  return (
    <div>
      <div className="row" style={{ gap: 14, marginBottom: 10, fontSize: 11.5 }}>
        {cats.map((c, i) => (
          <span key={c} className="row" style={{ gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: colors[i] }} /> {c}
          </span>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${series.length}, 1fr)`, gap: 14, height: 200 }}>
        {series.map((s) => {
          const total = s.v.reduce((a, b) => a + b, 0);
          return (
            <div key={s.day} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 2 }}>
              <div style={{ display: "flex", flexDirection: "column-reverse", height: `${(total / max) * 100}%`, gap: 1 }}>
                {s.v.map((v, i) => (
                  <div key={i} style={{ flex: v, background: colors[i], borderRadius: i === 0 ? "0 0 2px 2px" : i === s.v.length - 1 ? "2px 2px 0 0" : 0 }} />
                ))}
              </div>
              <div className="muted mono" style={{ fontSize: 10.5, textAlign: "center" }}>{s.day}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============== BILLING ============== */
const SEED_INVOICES = [
  { id: "INV-1421", customer: "Maridale Foods Pty",   issued: "Apr 22", due: "May 22", amount: 8420,  status: "open",    paidOn: null, paidMethod: null, notes: "" },
  { id: "INV-1420", customer: "Northbridge Wines",    issued: "Apr 21", due: "May 21", amount: 5180,  status: "open",    paidOn: null, paidMethod: null, notes: "" },
  { id: "INV-1419", customer: "Greenline Grocers",    issued: "Apr 18", due: "May 18", amount: 12640, status: "paid",    paidOn: "Apr 30", paidMethod: "Bank transfer", notes: "" },
  { id: "INV-1418", customer: "Apex Building Supply", issued: "Apr 12", due: "Apr 26", amount: 1260,  status: "overdue", paidOn: null, paidMethod: null, notes: "" },
  { id: "INV-1417", customer: "Bayer Industrial",     issued: "Apr 10", due: "Apr 24", amount: 2940,  status: "overdue", paidOn: null, paidMethod: null, notes: "" },
  { id: "INV-1416", customer: "Bright Pharma",        issued: "Apr 06", due: "May 06", amount: 2260,  status: "paid",    paidOn: "Apr 20", paidMethod: "Credit card", notes: "" },
];

function NewInvoiceModal({ open, onClose, onSave, customers }) {
  const today = new Date();
  const fmt = d => d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  const due30 = new Date(today); due30.setDate(due30.getDate() + 30);
  const blank = { customer: customers[0]?.name || "", amount: "", issued: fmt(today), due: fmt(due30), notes: "" };
  const [form, setForm] = React.useState(blank);
  React.useEffect(() => { if (open) setForm(blank); }, [open]);
  if (!open) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  function save() {
    if (!form.customer || !form.amount) return;
    onSave({ customer: form.customer, amount: parseFloat(form.amount.replace(/[^0-9.]/g, "")), issued: form.issued, due: form.due, notes: form.notes });
    onClose();
  }
  return (
    <div className="modal-bd" onClick={onClose}>
      <div className="modal" style={{ width: 500 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="receipt" />
          <div style={{ fontWeight: 600 }}>New invoice</div>
          <div style={{ flex: 1 }} />
          <button className="btn ghost sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field">
            <label>Customer <span style={{ color: "var(--st-delayed)" }}>*</span></label>
            <select value={form.customer} onChange={e => set("customer", e.target.value)}
              style={{ background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--fg-0)", borderRadius: 4, padding: "6px 8px", fontSize: 12.5 }}>
              {customers.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div className="field">
              <label>Amount ($) <span style={{ color: "var(--st-delayed)" }}>*</span></label>
              <input placeholder="0.00" value={form.amount} onChange={e => set("amount", e.target.value)} className="mono" />
            </div>
            <div className="field">
              <label>Issued</label>
              <input value={form.issued} onChange={e => set("issued", e.target.value)} />
            </div>
            <div className="field">
              <label>Due date</label>
              <input value={form.due} onChange={e => set("due", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Notes</label>
            <input placeholder="Optional — e.g. for orders ASL-24871, ASL-24870" value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
          <div className="hint">Invoice will be created with status <strong>Open</strong> and added to outstanding balance.</div>
        </div>
        <div style={{ padding: 14, borderTop: "1px solid var(--line)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={!form.customer || !form.amount}>
            <Icon name="plus" size={13} /> Create invoice
          </button>
        </div>
      </div>
    </div>
  );
}

function MarkPaidModal({ invoice, onClose, onSave }) {
  const [paidOn, setPaidOn] = React.useState(() => new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short" }));
  const [method, setMethod] = React.useState("Bank transfer");
  if (!invoice) return null;
  return (
    <div className="modal-bd" onClick={onClose}>
      <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="check" />
          <div style={{ fontWeight: 600 }}>Mark {invoice.id} as paid</div>
          <div style={{ flex: 1 }} />
          <button className="btn ghost sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: "10px 14px", background: "var(--bg-2)", borderRadius: 6, border: "1px solid var(--line)" }}>
            <div style={{ fontWeight: 500 }}>{invoice.customer}</div>
            <div className="mono" style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700 }}>${invoice.amount.toLocaleString()}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="field">
              <label>Paid on</label>
              <input value={paidOn} onChange={e => setPaidOn(e.target.value)} />
            </div>
            <div className="field">
              <label>Payment method</label>
              <select value={method} onChange={e => setMethod(e.target.value)}
                style={{ background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--fg-0)", borderRadius: 4, padding: "6px 8px", fontSize: 12.5 }}>
                {["Bank transfer", "Credit card", "Cheque", "Cash", "Direct debit", "Other"].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{ padding: 14, borderTop: "1px solid var(--line)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => { onSave(invoice.id, paidOn, method); onClose(); }}>
            <Icon name="check" size={13} /> Confirm payment
          </button>
        </div>
      </div>
    </div>
  );
}

function BillingScreen({ customers, onToast }) {
  const [invoices, setInvoices] = React.useState(SEED_INVOICES);
  const [showNew, setShowNew] = React.useState(false);
  const [markPaid, setMarkPaid] = React.useState(null);
  const [expandedId, setExpandedId] = React.useState(null);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [actionMenu, setActionMenu] = React.useState(null); // invoice id with open menu

  const statusColors = {
    open:     "var(--st-new)",
    paid:     "var(--st-delivered)",
    overdue:  "var(--st-delayed)",
    bad_debt: "var(--st-delayed)",
  };

  // KPIs — computed live
  const outstanding = invoices.filter(i => ["open", "overdue", "bad_debt"].includes(i.status)).reduce((s, i) => s + i.amount, 0);
  const paid30d     = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const overdueList = invoices.filter(i => i.status === "overdue");
  const overdueAmt  = overdueList.reduce((s, i) => s + i.amount, 0);

  const filtered = statusFilter === "all" ? invoices : invoices.filter(i => i.status === statusFilter);
  const counts = { all: invoices.length, open: 0, paid: 0, overdue: 0, bad_debt: 0 };
  invoices.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });

  function addInvoice({ customer, amount, issued, due, notes }) {
    const maxNum = invoices.reduce((m, i) => { const n = parseInt(i.id.replace("INV-", "")); return n > m ? n : m; }, 1421);
    const newInv = { id: `INV-${maxNum + 1}`, customer, amount, issued, due, status: "open", paidOn: null, paidMethod: null, notes };
    setInvoices(arr => [newInv, ...arr]);
    onToast && onToast({ ttl: "Invoice created", sub: `${newInv.id} · ${customer} · $${amount.toLocaleString()}` });
  }

  function setStatus(id, status) {
    setInvoices(arr => arr.map(i => i.id === id ? { ...i, status, paidOn: null, paidMethod: null } : i));
    setActionMenu(null);
    onToast && onToast({ ttl: `Invoice marked ${status.replace("_", " ")}`, sub: id });
  }

  function confirmPaid(id, paidOn, paidMethod) {
    setInvoices(arr => arr.map(i => i.id === id ? { ...i, status: "paid", paidOn, paidMethod } : i));
    onToast && onToast({ ttl: "Payment recorded", sub: `${id} · ${paidMethod} · ${paidOn}` });
  }

  function exportInvoice(inv) {
    if (!window.XLSX) { onToast && onToast({ ttl: "XLSX not loaded", sub: "" }); return; }
    const ws = XLSX.utils.json_to_sheet([{
      "Invoice": inv.id, "Customer": inv.customer, "Issued": inv.issued, "Due": inv.due,
      "Amount": `$${inv.amount.toLocaleString()}`, "Status": inv.status,
      "Paid On": inv.paidOn || "", "Payment Method": inv.paidMethod || "", "Notes": inv.notes || "",
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, inv.id);
    XLSX.writeFile(wb, `${inv.id}.xlsx`);
    onToast && onToast({ ttl: `Exported ${inv.id}`, sub: `${inv.customer} · $${inv.amount.toLocaleString()}` });
  }

  function exportAll() {
    if (!window.XLSX) return;
    const rows = filtered.map(i => ({ "Invoice": i.id, "Customer": i.customer, "Issued": i.issued, "Due": i.due, "Amount": `$${i.amount.toLocaleString()}`, "Status": i.status, "Paid On": i.paidOn || "", "Payment Method": i.paidMethod || "" }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    XLSX.writeFile(wb, `ASALO-Invoices-${new Date().toISOString().slice(0,10)}.xlsx`);
    onToast && onToast({ ttl: `Exported ${filtered.length} invoices`, sub: "ASALO-Invoices.xlsx downloaded" });
  }

  // Close action menu when clicking outside
  React.useEffect(() => {
    const handler = () => setActionMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* KPIs — all live */}
      <div className="kpis">
        <div className="kpi">
          <div className="lbl">Outstanding</div>
          <div className="val">${outstanding >= 1000 ? (outstanding / 1000).toFixed(1) + "k" : outstanding.toLocaleString()}</div>
          <div className="delta down">{invoices.filter(i => i.status !== "paid").length} invoices</div>
        </div>
        <div className="kpi">
          <div className="lbl">Paid · all time</div>
          <div className="val">${paid30d >= 1000 ? (paid30d / 1000).toFixed(0) + "k" : paid30d.toLocaleString()}</div>
          <div className="delta up">▲ {invoices.filter(i => i.status === "paid").length} invoices</div>
        </div>
        <div className="kpi">
          <div className="lbl">Avg days to pay</div>
          <div className="val">14.2</div>
          <div className="delta">Net 30 terms</div>
        </div>
        <div className="kpi">
          <div className="lbl">Overdue</div>
          <div className="val">{overdueList.length}</div>
          <div className="delta down">${overdueAmt.toLocaleString()}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <span className="ttl">Invoices</span>
          <span className="sub">{invoices.length} total</span>
          <div className="sp" />
          {/* Status filter tabs */}
          <div className="seg">
            {[["all", `All ${counts.all}`], ["open", `Open ${counts.open}`], ["paid", `Paid ${counts.paid}`], ["overdue", `Overdue ${counts.overdue}`], ["bad_debt", `Bad debt ${counts.bad_debt || 0}`]].map(([k, l]) => (
              <button key={k} className={statusFilter === k ? "on" : ""} onClick={() => setStatusFilter(k)}>{l}</button>
            ))}
          </div>
          <button className="btn sm" onClick={exportAll}><Icon name="download" size={12} /> Export</button>
          <button className="btn primary sm" onClick={() => setShowNew(true)}><Icon name="plus" size={12} /> New invoice</button>
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 36 }}></th>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Issued</th>
              <th>Due</th>
              <th style={{ textAlign: "right" }}>Amount</th>
              <th>Status</th>
              <th style={{ width: 130 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => (
              <React.Fragment key={inv.id}>
                <tr onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)} style={{ cursor: "pointer" }}>
                  <td>
                    <Icon name={expandedId === inv.id ? "arrow" : "arrow"} size={11}
                      style={{ transform: expandedId === inv.id ? "rotate(90deg)" : "none", transition: "transform 150ms", color: "var(--fg-3)" }} />
                  </td>
                  <td className="mono" style={{ fontWeight: 600 }}>{inv.id}</td>
                  <td style={{ fontWeight: 500 }}>{inv.customer}</td>
                  <td className="muted">{inv.issued}</td>
                  <td className="muted">{inv.due}</td>
                  <td className="mono tnum" style={{ textAlign: "right", fontWeight: 600 }}>${inv.amount.toLocaleString()}</td>
                  <td>
                    <span className="chip">
                      <span className="dot" style={{ background: statusColors[inv.status] || "var(--fg-3)" }} />
                      {inv.status.replace("_", " ")}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="row" style={{ gap: 4, position: "relative" }}>
                      {/* Export single invoice */}
                      <button className="btn ghost sm" title="Export this invoice" onClick={() => exportInvoice(inv)}>
                        <Icon name="download" size={11} />
                      </button>
                      {/* Status action menu */}
                      <div style={{ position: "relative" }}>
                        <button className="btn sm" onClick={e => { e.stopPropagation(); setActionMenu(actionMenu === inv.id ? null : inv.id); }}>
                          <Icon name="edit" size={11} /> Status ▾
                        </button>
                        {actionMenu === inv.id && (
                          <div onClick={e => e.stopPropagation()} style={{
                            position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 1000,
                            background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: 8,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.4)", minWidth: 160, overflow: "hidden",
                          }}>
                            {[
                              { key: "paid", label: "✓ Mark as paid", action: () => { setActionMenu(null); setMarkPaid(inv); } },
                              { key: "open", label: "↩ Revert to open", action: () => setStatus(inv.id, "open") },
                              { key: "overdue", label: "⚠ Mark as overdue", action: () => setStatus(inv.id, "overdue") },
                              { key: "bad_debt", label: "✗ Mark as bad debt", action: () => setStatus(inv.id, "bad_debt") },
                            ].filter(a => a.key !== inv.status).map(a => (
                              <button key={a.key} onClick={a.action} style={{
                                display: "block", width: "100%", textAlign: "left",
                                padding: "9px 14px", fontSize: 12.5, background: "none",
                                border: "none", color: "var(--fg-0)", cursor: "pointer",
                                borderBottom: "1px solid var(--line)",
                              }}
                                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-2)"}
                                onMouseLeave={e => e.currentTarget.style.background = "none"}
                              >{a.label}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
                {/* Expanded payment details row */}
                {expandedId === inv.id && (
                  <tr style={{ background: "var(--bg-2)" }}>
                    <td colSpan={8} style={{ padding: "12px 18px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, fontSize: 12 }}>
                        <div>
                          <div className="muted" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Status</div>
                          <span className="chip">
                            <span className="dot" style={{ background: statusColors[inv.status] }} />
                            {inv.status.replace("_", " ")}
                          </span>
                        </div>
                        {inv.status === "paid" && (
                          <>
                            <div>
                              <div className="muted" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Paid on</div>
                              <div style={{ fontWeight: 600 }}>{inv.paidOn}</div>
                            </div>
                            <div>
                              <div className="muted" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Payment method</div>
                              <div style={{ fontWeight: 600 }}>{inv.paidMethod}</div>
                            </div>
                            <div>
                              <div className="muted" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Amount received</div>
                              <div style={{ fontWeight: 700, color: "var(--st-delivered)" }}>${inv.amount.toLocaleString()}</div>
                            </div>
                          </>
                        )}
                        {inv.status !== "paid" && (
                          <div>
                            <div className="muted" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Due date</div>
                            <div style={{ fontWeight: 600, color: inv.status === "overdue" ? "var(--st-delayed)" : "var(--fg-0)" }}>{inv.due}</div>
                          </div>
                        )}
                        <div>
                          <div className="muted" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Notes</div>
                          <div>{inv.notes || <span className="muted">—</span>}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 28, color: "var(--fg-3)" }}>No invoices match this filter</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <NewInvoiceModal open={showNew} onClose={() => setShowNew(false)} onSave={addInvoice} customers={customers} />
      <MarkPaidModal invoice={markPaid} onClose={() => setMarkPaid(null)} onSave={confirmPaid} />
    </div>
  );
}

/* ============== MOBILE DRIVER VIEW ============== */
function MobileDriver() {
  const [stop, setStop] = React.useState(1);
  return (
    <div className="mob">
      <div className="mob-status">
        <span>9:41</span>
        <span>● ● ●</span>
      </div>
      <div className="mob-top">
        <div className="sb-mark">A</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Today's run</div>
          <div className="muted" style={{ fontSize: 11.5 }}>Truck 14 · K. Daniels</div>
        </div>
        <div className="chip"><span className="dot" style={{ background: "var(--st-in_transit)" }} /> On route</div>
      </div>

      <div className="mob-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ height: 140, position: "relative" }}>
          <div className="map" style={{ position: "absolute", inset: 0, borderRadius: 0, border: 0 }}>
            <div className="map-grid" />
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <path className="map-route" d="M 12 70 Q 50 30 88 50" />
            </svg>
            <div className="map-pin origin" style={{ left: "12%", top: "70%" }}><div className="pin-dot" /></div>
            <div className="map-pin dest" style={{ left: "88%", top: "50%" }}><div className="pin-dot" /></div>
            <div className="map-truck" style={{ left: "55%", top: "44%" }}>🚛</div>
          </div>
        </div>
        <div style={{ padding: 14 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--fg-2)" }}>Next stop</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Geelong West</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11.5, color: "var(--fg-2)" }}>ETA</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>16:20</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mob-card">
        <div style={{ fontSize: 11.5, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Stops · 2 of 3</div>
        <div className={`mob-stop ${stop > 0 ? "done" : ""}`}>
          <div className="num">{stop > 0 ? "✓" : "1"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Melbourne DC</div>
            <div className="muted" style={{ fontSize: 12 }}>Picked up · 64 parcels · 180 kg</div>
          </div>
        </div>
        <div className={`mob-stop ${stop === 1 ? "current" : stop > 1 ? "done" : ""}`}>
          <div className="num">{stop > 1 ? "✓" : "2"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Greenline Grocers · Geelong</div>
            <div className="muted" style={{ fontSize: 12 }}>Drop-off · ASL-24868</div>
          </div>
        </div>
        <div className="mob-stop">
          <div className="num">3</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Return to Melbourne DC</div>
            <div className="muted" style={{ fontSize: 12 }}>End of run</div>
          </div>
        </div>
      </div>

      <div className="mob-action-bar">
        <button className="btn"><Icon name="phone" size={14} /> Call</button>
        <button className="btn primary" onClick={() => setStop((s) => Math.min(2, s + 1))}>
          <Icon name="check" size={14} /> Mark delivered
        </button>
      </div>
    </div>
  );
}

/* ============== SETTINGS ============== */
const ROLES = ["Admin", "Ops Manager", "Dispatcher", "Customer Service", "Warehouse", "Driver", "Viewer"];

const SEED_USERS = [
  { id: "u1", name: "Renato Mendes",     email: "renato@asalo.co",   role: "Ops Manager",      status: "active",  last: "2 min ago" },
  { id: "u2", name: "Aisha Khan",        email: "aisha@asalo.co",    role: "Admin",            status: "active",  last: "12 min ago" },
  { id: "u3", name: "Tom Larsson",       email: "tom@asalo.co",      role: "Dispatcher",       status: "active",  last: "1 h ago" },
  { id: "u4", name: "Priya Shah",        email: "priya@asalo.co",    role: "Customer Service", status: "active",  last: "3 h ago" },
  { id: "u5", name: "Kade Daniels",      email: "kade@asalo.co",     role: "Driver",           status: "active",  last: "Yesterday" },
  { id: "u6", name: "Sam Whittaker",     email: "sam@asalo.co",      role: "Warehouse",        status: "invited", last: "—" },
];

function SettingsScreen({ theme, onThemeChange, onToast }) {
  const [users, setUsers] = React.useState(SEED_USERS);
  const [add, setAdd] = React.useState({ open: false, name: "", email: "", role: "Dispatcher" });

  function inviteUser() {
    if (!add.email.trim()) { onToast && onToast({ ttl: "Email required", sub: "" }); return; }
    const id = "u" + (users.length + 1);
    setUsers((u) => [...u, { id, name: add.name || add.email.split("@")[0], email: add.email, role: add.role, status: "invited", last: "—" }]);
    setAdd({ open: false, name: "", email: "", role: "Dispatcher" });
    onToast && onToast({ ttl: "Invitation sent", sub: `${add.email} · ${add.role}` });
  }

  function changeRole(id, role) { setUsers((u) => u.map((x) => x.id === id ? { ...x, role } : x)); }
  function removeUser(id) { setUsers((u) => u.filter((x) => x.id !== id)); onToast && onToast({ ttl: "User removed", sub: "" }); }

  return (
    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Theme card */}
      <div className="panel">
        <div className="panel-h">
          <span className="ttl">Appearance</span>
          <span className="sub">Theme &amp; brightness</span>
        </div>
        <div className="panel-b" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="field">
            <label>Theme</label>
            <div className="seg" style={{ width: "100%" }}>
              {[["dark","Dark"],["dim","Dim"],["light","Light"],["system","System"]].map(([k,l]) => (
                <button key={k} className={theme.mode === k ? "on" : ""} onClick={() => onThemeChange({ ...theme, mode: k })} style={{ flex: 1 }}>
                  {l}
                </button>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
              {theme.mode === "dark" && "Mission-control dark — full contrast for ops floor."}
              {theme.mode === "dim" && "Lower-contrast dark — easier on eyes for long shifts."}
              {theme.mode === "light" && "Bright daylight theme."}
              {theme.mode === "system" && "Follows your OS setting."}
            </div>
          </div>
          <div className="field">
            <label>Brightness · {theme.brightness}</label>
            <input type="range" min={-20} max={20} step={1} value={theme.brightness}
              onChange={(e) => onThemeChange({ ...theme, brightness: parseInt(e.target.value) })} />
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted mono" style={{ fontSize: 10.5 }}>Darker</span>
              <span className="muted mono" style={{ fontSize: 10.5 }}>Lighter</span>
            </div>
          </div>
        </div>
      </div>

      {/* Users card */}
      <div className="panel">
        <div className="panel-h">
          <span className="ttl">Users &amp; access</span>
          <span className="sub">{users.length} members · {users.filter(u => u.status === "active").length} active</span>
          <div className="sp" />
          <button className="btn primary sm" onClick={() => setAdd((a) => ({ ...a, open: true }))}>
            <Icon name="plus" size={12} /> Invite user
          </button>
        </div>

        {add.open && (
          <div style={{ padding: 14, borderBottom: "1px solid var(--line)", background: "var(--bg-2)" }}>
            <div className="row" style={{ gap: 10, alignItems: "flex-end" }}>
              <div className="field" style={{ flex: 1 }}>
                <label>Full name</label>
                <input value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} placeholder="e.g. Jamie Pham" />
              </div>
              <div className="field" style={{ flex: 1.4 }}>
                <label>Email</label>
                <input value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} placeholder="name@asalo.co" />
              </div>
              <div className="field" style={{ width: 180 }}>
                <label>Role</label>
                <select value={add.role} onChange={(e) => setAdd({ ...add, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <button className="btn primary" onClick={inviteUser}><Icon name="sms" size={12} /> Send invite</button>
              <button className="btn" onClick={() => setAdd({ open: false, name: "", email: "", role: "Dispatcher" })}>Cancel</button>
            </div>
          </div>
        )}

        <table className="tbl">
          <thead>
            <tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Last active</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="row" style={{ gap: 8 }}>
                    <div className="sb-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
                      {u.name.split(" ").map((p) => p[0]).join("").slice(0,2)}
                    </div>
                    <div style={{ color: "var(--fg-0)", fontWeight: 500 }}>{u.name}</div>
                  </div>
                </td>
                <td className="mono">{u.email}</td>
                <td>
                  <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}
                    style={{ background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--fg-0)", borderRadius: 4, padding: "3px 6px", fontSize: 11.5 }}>
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td>
                  <span className="chip">
                    <span className="dot" style={{ background: u.status === "active" ? "var(--st-delivered)" : "var(--st-processing)" }} />
                    {u.status}
                  </span>
                </td>
                <td className="muted" style={{ fontSize: 11.5 }}>{u.last}</td>
                <td>
                  <button className="btn ghost sm" onClick={() => removeUser(u.id)} title="Remove"><Icon name="x" size={12} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Roles + 2FA */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="panel">
          <div className="panel-h"><span className="ttl">Roles &amp; permissions</span></div>
          <div className="panel-b" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              ["Admin", "Full access · billing · users · API"],
              ["Ops Manager", "Orders · fleet · analytics · SMS"],
              ["Dispatcher", "Orders · fleet · live tracking"],
              ["Customer Service", "Orders read · SMS · customers"],
              ["Warehouse", "Orders · loading status only"],
              ["Driver", "Mobile app · own runs only"],
              ["Viewer", "Read-only dashboards"],
            ].map(([r, d]) => (
              <div key={r} className="row" style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--bg-2)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{r}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{d}</div>
                </div>
                <button className="btn ghost sm"><Icon name="edit" size={12} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-h"><span className="ttl">Security</span></div>
          <div className="panel-b" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ToggleRow label="Require 2FA for all users" sub="SMS or authenticator app" defaultOn />
            <ToggleRow label="SSO via Google Workspace" sub="asalo.co domain" />
            <ToggleRow label="Auto-logout after 30 min idle" sub="Per session" defaultOn />
            <ToggleRow label="IP allowlist" sub="Restrict admin access to office IPs" />
            <div className="hint">Last security audit · 12 days ago · no findings</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, sub, defaultOn = false }) {
  const [on, setOn] = React.useState(defaultOn);
  return (
    <div className="row" style={{ justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</div>
        {sub && <div className="muted" style={{ fontSize: 11 }}>{sub}</div>}
      </div>
      <button onClick={() => setOn((v) => !v)}
        style={{
          width: 36, height: 20, borderRadius: 12, border: 0, cursor: "pointer",
          background: on ? "var(--accent)" : "var(--bg-3)", position: "relative", transition: "background 120ms",
        }}>
        <span style={{
          position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: "50%",
          background: on ? "var(--accent-fg)" : "var(--fg-1)", transition: "left 120ms",
        }} />
      </button>
    </div>
  );
}

Object.assign(window, {
  TrackingScreen, FleetScreen, NotificationsScreen,
  CustomersScreen, ApiScreen, AnalyticsScreen, BillingScreen,
  SettingsScreen, MobileDriver,
});
