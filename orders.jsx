// Orders screen — queue, detail drawer, SMS composer, new order modal, filters, export

/* ============ EXPORT HELPER ============ */
function exportOrdersXlsx(orders) {
  const rows = orders.map((o) => ({
    "Ref":         o.id,
    "Customer":    o.customer,
    "Contact":     o.contactName,
    "Phone":       o.contact,
    "Origin":      o.origin,
    "Destination": o.destination,
    "Distance":    o.distance || "",
    "Cargo":       o.cargo,
    "Weight":      o.weight,
    "Items":       o.items,
    "Status":      (window.ORDER_STATUSES.find((s) => s.key === o.status) || {}).label || o.status,
    "Priority":    o.priority || "normal",
    "ETA":         o.eta,
    "Value":       o.value || "",
    "Placed":      o.placed || "",
    "Temperature": o.temp || "",
    "Note":        o.note || "",
    "Driver":      o.driver || "",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `ASALO-Orders-${date}.xlsx`);
}

/* ============ NEW ORDER MODAL ============ */
const CARGO_TYPES_LIST = ["Pallets", "Parcels", "Barrels", "Cold chain"];

function NewOrderModal({ open, onClose, onSave }) {
  const blank = {
    customer: "", contactName: "", contact: "",
    cargo: "Pallets", weight: "", items: "",
    origin: "", destination: "", distance: "",
    priority: "normal", temp: "", eta: "", value: "",
  };
  const [form, setForm] = React.useState(blank);

  React.useEffect(() => { if (open) setForm(blank); }, [open]);

  if (!open) return null;

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function handleSave() {
    if (!form.customer.trim() || !form.origin.trim() || !form.destination.trim()) return;
    const maxId = window.ORDERS.reduce((m, o) => {
      const n = parseInt(o.id.replace("ASL-", ""), 10);
      return n > m ? n : m;
    }, 24871);
    const newId = `ASL-${maxId + 1 + Math.floor(Math.random() * 10)}`;
    onSave({
      id: newId,
      customer: form.customer.trim(),
      contactName: form.contactName.trim() || "—",
      contact: form.contact.trim() || "—",
      cargo: form.cargo,
      weight: form.weight ? `${form.weight} kg` : "—",
      items: parseInt(form.items) || 0,
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      distance: form.distance ? `${form.distance} km` : "",
      priority: form.priority,
      temp: form.cargo === "Cold chain" && form.temp ? form.temp : undefined,
      eta: form.eta.trim() || "TBD",
      value: form.value ? `$${form.value}` : "",
      status: "new",
      placed: "just now",
      note: "",
    });
    onClose();
  }

  const field = (label, key, opts = {}) => (
    <div className="field" style={opts.style}>
      <label>{label}{opts.required && <span style={{ color: "var(--st-delayed)", marginLeft: 3 }}>*</span>}</label>
      <input
        type={opts.type || "text"}
        placeholder={opts.placeholder || ""}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        className={opts.mono ? "mono" : ""}
      />
    </div>
  );

  return (
    <div className="modal-bd" onClick={onClose}>
      <div className="modal" style={{ width: 620, maxHeight: "85vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="plus" />
          <div>
            <div style={{ fontWeight: 600 }}>New order</div>
            <div className="muted" style={{ fontSize: 11.5 }}>Fill in the details below — an SMS will fire automatically on status change</div>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn ghost sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>

        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Customer */}
          <div style={{ fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-2)" }}>Customer</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {field("Company name", "customer", { required: true, placeholder: "e.g. Greenline Grocers" })}
            {field("Contact name", "contactName", { placeholder: "e.g. Alicia M." })}
            {field("Phone", "contact", { placeholder: "+61 4…", mono: true })}
          </div>

          {/* Route */}
          <div style={{ fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-2)", marginTop: 4 }}>Route</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 10 }}>
            {field("Origin", "origin", { required: true, placeholder: "e.g. Melbourne DC" })}
            {field("Destination", "destination", { required: true, placeholder: "e.g. Geelong West" })}
            {field("Distance (km)", "distance", { placeholder: "78", mono: true })}
          </div>

          {/* Cargo */}
          <div style={{ fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-2)", marginTop: 4 }}>Cargo</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", gap: 10 }}>
            <div className="field">
              <label>Cargo type<span style={{ color: "var(--st-delayed)", marginLeft: 3 }}>*</span></label>
              <select value={form.cargo} onChange={(e) => set("cargo", e.target.value)}
                style={{ background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--fg-0)", borderRadius: 4, padding: "6px 8px", fontSize: 12.5 }}>
                {CARGO_TYPES_LIST.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            {field("Weight (kg)", "weight", { placeholder: "180", mono: true })}
            {field("Items", "items", { placeholder: "64", mono: true })}
          </div>
          {form.cargo === "Cold chain" && (
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 10 }}>
              {field("Temperature", "temp", { placeholder: "e.g. −4°C or +2°C", mono: true })}
            </div>
          )}

          {/* Scheduling & priority */}
          <div style={{ fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-2)", marginTop: 4 }}>Scheduling</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {field("ETA", "eta", { placeholder: "e.g. Tomorrow 14:00" })}
            {field("Value ($)", "value", { placeholder: "3420", mono: true })}
            <div className="field">
              <label>Priority</label>
              <div className="seg" style={{ width: "100%" }}>
                {["normal", "high"].map((p) => (
                  <button key={p} className={form.priority === p ? "on" : ""} onClick={() => set("priority", p)} style={{ flex: 1, textTransform: "capitalize" }}>{p}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="hint">Fields marked <span style={{ color: "var(--st-delayed)" }}>*</span> are required. Order will be created with status <strong>New</strong>.</div>
        </div>

        <div style={{ padding: 14, borderTop: "1px solid var(--line)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            onClick={handleSave}
            disabled={!form.customer.trim() || !form.origin.trim() || !form.destination.trim()}
          >
            <Icon name="plus" size={13} /> Create order
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ FILTERS PANEL ============ */
function FiltersPanel({ open, filters, onChange, onReset, orders }) {
  if (!open) return null;
  const customers = [...new Set(orders.map((o) => o.customer))].sort();

  return (
    <div style={{
      background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 8,
      padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14,
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
    }}>
      {/* Customer */}
      <div className="field">
        <label>Customer</label>
        <select
          value={filters.customer}
          onChange={(e) => onChange({ ...filters, customer: e.target.value })}
          style={{ background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--fg-0)", borderRadius: 4, padding: "6px 8px", fontSize: 12.5 }}
        >
          <option value="all">All customers</option>
          {customers.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Priority */}
      <div className="field">
        <label>Priority</label>
        <div className="seg" style={{ width: "100%" }}>
          {["all", "high", "normal"].map((p) => (
            <button key={p} className={filters.priority === p ? "on" : ""} onClick={() => onChange({ ...filters, priority: p })} style={{ flex: 1, textTransform: "capitalize" }}>{p}</button>
          ))}
        </div>
      </div>

      {/* Weight range */}
      <div className="field">
        <label>Min weight (kg)</label>
        <input
          type="number" placeholder="0" value={filters.weightMin}
          onChange={(e) => onChange({ ...filters, weightMin: e.target.value })}
          className="mono"
        />
      </div>
      <div className="field">
        <label>Max weight (kg)</label>
        <input
          type="number" placeholder="Any" value={filters.weightMax}
          onChange={(e) => onChange({ ...filters, weightMax: e.target.value })}
          className="mono"
        />
      </div>

      {/* Footer */}
      <div style={{ gridColumn: "span 4", display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4, borderTop: "1px solid var(--line)" }}>
        <button className="btn sm" onClick={onReset}>Reset filters</button>
      </div>
    </div>
  );
}

/* ============ ORDERS SCREEN ============ */
function OrdersScreen({ orders, onSelect, selectedId, onAdvance, density, onNewOrder, onDeleteOrder, onToast }) {
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [cargo, setCargo] = React.useState("all");
  const [showFilters, setShowFilters] = React.useState(false);
  const [showNewOrder, setShowNewOrder] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const FILTER_DEFAULTS = { customer: "all", priority: "all", weightMin: "", weightMax: "" };
  const [advFilters, setAdvFilters] = React.useState(FILTER_DEFAULTS);

  const activeFilterCount = [
    advFilters.customer !== "all",
    advFilters.priority !== "all",
    advFilters.weightMin !== "",
    advFilters.weightMax !== "",
  ].filter(Boolean).length;

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (cargo !== "all" && o.cargo !== cargo) return false;
    if (advFilters.customer !== "all" && o.customer !== advFilters.customer) return false;
    if (advFilters.priority !== "all" && (o.priority || "normal") !== advFilters.priority) return false;
    if (advFilters.weightMin !== "") {
      const w = parseFloat((o.weight || "0").replace(/[^0-9.]/g, ""));
      if (w < parseFloat(advFilters.weightMin)) return false;
    }
    if (advFilters.weightMax !== "") {
      const w = parseFloat((o.weight || "0").replace(/[^0-9.]/g, ""));
      if (w > parseFloat(advFilters.weightMax)) return false;
    }
    return true;
  });

  const counts = {
    all: orders.length,
    new: orders.filter((o) => o.status === "new").length,
    processing: orders.filter((o) => o.status === "processing").length,
    in_transit: orders.filter((o) => o.status === "in_transit").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    delayed: orders.filter((o) => o.status === "delayed").length,
  };

  return (
    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14, minHeight: "100%" }}>
      {/* KPIs */}
      <div className="kpis">
        <div className="kpi">
          <div className="lbl">Today's orders</div>
          <div className="val">142</div>
          <div className="delta up">▲ 12% vs yesterday</div>
          <Sparkline data={[8, 12, 10, 14, 18, 22, 26, 24, 30, 28, 34, 38]} />
        </div>
        <div className="kpi">
          <div className="lbl">In transit</div>
          <div className="val">38</div>
          <div className="delta">14 reefer · 24 dry</div>
          <Sparkline data={[12, 18, 22, 26, 30, 28, 32, 35, 33, 36, 38, 38]} />
        </div>
        <div className="kpi">
          <div className="lbl">On-time rate</div>
          <div className="val">96.4%</div>
          <div className="delta up">▲ 0.8 pp this week</div>
          <Sparkline data={[92, 93, 91, 94, 95, 94, 96, 95, 96, 97, 96, 96]} />
        </div>
        <div className="kpi">
          <div className="lbl">SMS dispatched · 24h</div>
          <div className="val">418</div>
          <div className="delta down">2 failed · retry queued</div>
          <Sparkline data={[20, 32, 28, 40, 44, 38, 42, 50, 48, 52, 56, 62]} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <div className="seg">
          {[
            ["all", "All", counts.all],
            ["new", "New", counts.new],
            ["processing", "Processing", counts.processing],
            ["in_transit", "In Transit", counts.in_transit],
            ["delayed", "Delayed", counts.delayed],
            ["delivered", "Delivered", counts.delivered],
          ].map(([k, lbl, c]) => (
            <button key={k} className={statusFilter === k ? "on" : ""} onClick={() => setStatusFilter(k)}>
              {lbl} <span style={{ opacity: 0.6, marginLeft: 4 }}>{c}</span>
            </button>
          ))}
        </div>
        <div className="seg">
          {["all", ...window.CARGO_TYPES].map((c) => (
            <button key={c} className={cargo === c ? "on" : ""} onClick={() => setCargo(c)}>
              {c === "all" ? "All cargo" : c}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button
          className={`btn sm${showFilters || activeFilterCount > 0 ? " primary" : ""}`}
          onClick={() => setShowFilters((v) => !v)}
        >
          <Icon name="filter" size={12} /> Filters
          {activeFilterCount > 0 && (
            <span style={{
              marginLeft: 6, background: "var(--accent-fg)", color: "var(--accent)",
              borderRadius: 10, padding: "0 6px", fontSize: 10, fontWeight: 700,
            }}>{activeFilterCount}</span>
          )}
        </button>
        <button
          className="btn sm"
          onClick={() => { exportOrdersXlsx(filtered); onToast && onToast({ ttl: `Exported ${filtered.length} orders`, sub: "ASALO-Orders.xlsx downloaded" }); }}
        >
          <Icon name="download" size={12} /> Export
        </button>
        <button className="btn primary sm" onClick={() => setShowNewOrder(true)}>
          <Icon name="plus" size={12} /> New Order
        </button>
      </div>

      {/* Filters panel */}
      <FiltersPanel
        open={showFilters}
        filters={advFilters}
        onChange={setAdvFilters}
        onReset={() => setAdvFilters(FILTER_DEFAULTS)}
        orders={orders}
      />

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {advFilters.customer !== "all" && (
            <span className="chip" style={{ cursor: "pointer" }} onClick={() => setAdvFilters((f) => ({ ...f, customer: "all" }))}>
              Customer: {advFilters.customer} <Icon name="x" size={10} />
            </span>
          )}
          {advFilters.priority !== "all" && (
            <span className="chip" style={{ cursor: "pointer", textTransform: "capitalize" }} onClick={() => setAdvFilters((f) => ({ ...f, priority: "all" }))}>
              Priority: {advFilters.priority} <Icon name="x" size={10} />
            </span>
          )}
          {advFilters.weightMin !== "" && (
            <span className="chip" style={{ cursor: "pointer" }} onClick={() => setAdvFilters((f) => ({ ...f, weightMin: "" }))}>
              Min weight: {advFilters.weightMin} kg <Icon name="x" size={10} />
            </span>
          )}
          {advFilters.weightMax !== "" && (
            <span className="chip" style={{ cursor: "pointer" }} onClick={() => setAdvFilters((f) => ({ ...f, weightMax: "" }))}>
              Max weight: {advFilters.weightMax} kg <Icon name="x" size={10} />
            </span>
          )}
          <span className="muted" style={{ fontSize: 11.5 }}>Showing {filtered.length} of {orders.length} orders</span>
        </div>
      )}

      {/* Table */}
      <div className="panel" style={{ overflow: "hidden" }}>
        <div style={{ overflow: "auto", maxHeight: "calc(100vh - 360px)" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th style={{ width: 110 }}>Ref</th>
                <th>Customer</th>
                <th>Route</th>
                <th>Cargo</th>
                <th style={{ textAlign: "right" }}>Weight</th>
                <th>Status</th>
                <th>ETA</th>
                <th style={{ width: 110 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: "var(--fg-3)" }}>No orders match the current filters</td></tr>
              ) : filtered.map((o) => (
                <tr
                  key={o.id}
                  className={selectedId === o.id ? "selected" : ""}
                  onClick={() => onSelect(o.id)}
                >
                  <td>
                    {o.priority === "high" ? <span className="priority-high" title="High priority" /> : null}
                  </td>
                  <td><span className="mono id">{o.id}</span></td>
                  <td>
                    <div style={{ fontWeight: 500, color: "var(--fg-0)" }}>{o.customer}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{o.contactName} · {o.contact}</div>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6, fontSize: 12 }}>
                      <span>{o.origin}</span>
                      <Icon name="arrow" size={11} stroke={1.4} />
                      <span>{o.destination}</span>
                    </div>
                    <div className="muted mono" style={{ fontSize: 10.5 }}>{o.distance}</div>
                  </td>
                  <td>
                    <span className="chip">
                      <CargoIcon type={o.cargo} />
                      {o.cargo}
                      {o.temp && <span className="mono" style={{ opacity: 0.7 }}> · {o.temp}</span>}
                    </span>
                  </td>
                  <td className="mono tnum" style={{ textAlign: "right" }}>{o.weight}</td>
                  <td><StatusPill status={o.status} /></td>
                  <td className="muted" style={{ fontSize: 11.5 }}>{o.eta}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="row" style={{ gap: 4 }}>
                      <button className="btn ghost sm" onClick={() => onSelect(o.id)}>
                        <Icon name="arrow" size={12} />
                      </button>
                      <button className="btn ghost sm" title={`Delete ${o.id}`} onClick={() => setDeleteTarget(o)}>
                        <Icon name="trash" size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Order Modal */}
      <NewOrderModal
        open={showNewOrder}
        onClose={() => setShowNewOrder(false)}
        onSave={onNewOrder}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete order"
        message={deleteTarget ? `Delete ${deleteTarget.id} · ${deleteTarget.customer}? This cannot be undone.` : ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => { onDeleteOrder && onDeleteOrder(deleteTarget.id); setDeleteTarget(null); }}
      />
    </div>
  );
}

function OrderDrawer({ order, onClose, onAdvance, onSendCustom, onDelete }) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  if (!order) return null;
  const flow = window.STATUS_FLOW;
  const idx = flow.indexOf(order.status);
  const next = idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
  const nextLabel = next && (window.ORDER_STATUSES.find(s => s.key === next) || {}).label;

  return (
    <React.Fragment>
      <div className="drawer-bd" onClick={onClose} />
      <aside className="drawer">
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
        <span className="mono" style={{ fontWeight: 600 }}>{order.id}</span>
        <StatusPill status={order.status} />
        {order.priority === "high" && <span className="priority-high">priority</span>}
        <div style={{ flex: 1 }} />
        <button className="btn ghost sm" title="Delete order" onClick={() => setConfirmDelete(true)}><Icon name="trash" size={14} /></button>
        <button className="btn ghost sm" onClick={onClose}><Icon name="x" size={14} /></button>
      </div>

      <div style={{ overflow: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <div className="lbl-mini">Customer</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{order.customer}</div>
            <div className="muted" style={{ fontSize: 12 }}>{order.contactName}</div>
            <div className="mono muted" style={{ fontSize: 12 }}>{order.contact}</div>
          </div>
          <div>
            <div className="lbl-mini">Cargo</div>
            <div className="row" style={{ gap: 6, fontWeight: 600, fontSize: 14 }}>
              <CargoIcon type={order.cargo} size={15} /> {order.cargo}
            </div>
            <div className="muted mono" style={{ fontSize: 12 }}>{order.weight} · {order.items} units</div>
            {order.temp && <div className="muted mono" style={{ fontSize: 11.5 }}>Temp held @ {order.temp}</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <span className="ttl">Route</span>
            <span className="sub mono">{order.distance}</span>
            <div className="sp" />
            <span className="muted" style={{ fontSize: 11.5 }}>ETA {order.eta}</span>
          </div>
          <div className="panel-b" style={{ padding: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", padding: 14, gap: 10 }}>
              <RouteRow type="origin" label={order.origin} sub="Picked up" />
              <RouteRow type="dest" label={order.destination} sub="Drop-off" />
            </div>
            <div style={{ height: 130, position: "relative", borderTop: "1px solid var(--line)" }}>
              <MiniMap progress={order.progress || (order.status === "in_transit" ? 0.5 : order.status === "delivered" ? 1 : 0)} />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <span className="ttl">Lifecycle</span>
            <span className="sub">SMS fires automatically at each step</span>
          </div>
          <div className="panel-b">
            <div className="timeline">
              {flow.map((s, i) => {
                const meta = window.ORDER_STATUSES.find((x) => x.key === s);
                const state = i < idx ? "done" : i === idx ? "active" : "future";
                return (
                  <div className={`tl-row ${state}`} key={s}>
                    <div className="tl-time">
                      {state === "done" ? `12:${(40 + i * 6) % 60}`.padStart(5,"0").slice(0,5)
                        : state === "active" ? "now" : "—"}
                    </div>
                    <div className="tl-dot" />
                    <div className="tl-body">
                      <div className="tl-ttl">{meta.label}</div>
                      <div className="tl-sub">
                        {state === "done" && `SMS sent to ${order.contact}`}
                        {state === "active" && `Current state · last update 2 min ago`}
                        {state === "future" && `Will trigger SMS to ${order.contact}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <span className="ttl">Send custom SMS</span>
            <span className="sub mono">{order.contact}</span>
          </div>
          <div className="panel-b">
            <button className="btn sm" onClick={() => onSendCustom(order)}>
              <Icon name="sms" size={13} /> Compose message
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: 14, borderTop: "1px solid var(--line)", display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn ghost sm"><Icon name="phone" size={13} /> Call customer</button>
        <div style={{ flex: 1 }} />
        {next ? (
          <button className="btn primary" onClick={() => onAdvance(order, next)}>
            <Icon name="arrow" size={13} /> Advance to {nextLabel}
          </button>
        ) : (
          <button className="btn" disabled style={{ opacity: 0.6 }}>Order complete</button>
        )}
      </div>
      </aside>
      <ConfirmModal
        open={confirmDelete}
        title="Delete order"
        message={`Delete ${order.id} · ${order.customer}? This cannot be undone.`}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); onClose(); onDelete && onDelete(order.id); }}
      />
    </React.Fragment>
  );
}

function RouteRow({ type, label, sub }) {
  return (
    <div className="row" style={{ gap: 10 }}>
      <div style={{ width: 14, height: 14, borderRadius: "50%", background: type === "origin" ? "var(--fg-2)" : "var(--st-delivered)", boxShadow: "0 0 0 3px var(--bg-1), 0 0 0 4px var(--line)" }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        <div className="muted" style={{ fontSize: 11 }}>{sub}</div>
      </div>
    </div>
  );
}

function MiniMap({ progress = 0.5 }) {
  const x1 = 8, y1 = 70, x2 = 92, y2 = 30;
  const px = x1 + (x2 - x1) * progress;
  const py = y1 + (y2 - y1) * progress;
  return (
    <div className="map" style={{ position: "absolute", inset: 10, borderRadius: 6 }}>
      <div className="map-grid" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <path className={progress >= 1 ? "map-route muted" : "map-route"} d={`M ${x1} ${y1} Q 50 20 ${x2} ${y2}`} />
      </svg>
      <div className="map-pin origin" style={{ left: `${x1}%`, top: `${y1}%` }}>
        <div className="pin-dot" /><div className="pin-label">Origin</div>
      </div>
      <div className="map-pin dest" style={{ left: `${x2}%`, top: `${y2}%` }}>
        <div className="pin-dot" /><div className="pin-label">Destination</div>
      </div>
      {progress > 0 && progress < 1 && (
        <div className="map-truck" style={{ left: `${px}%`, top: `${py}%` }}>🚛 ETA</div>
      )}
    </div>
  );
}

/* ============ SMS COMPOSER ============ */
function SMSComposer({ open, onClose, onSend, order, trigger, presetTemplate }) {
  const [text, setText] = React.useState("");
  const [includeTracking, setIncludeTracking] = React.useState(true);
  const [whenSend, setWhenSend] = React.useState("now");

  React.useEffect(() => {
    if (!order) return;
    const tplKey = trigger || "new";
    let tpl = presetTemplate || window.SMS_TEMPLATES[tplKey] || "";
    tpl = tpl
      .replace("{name}", (order.contactName || "Customer").split(" ")[0])
      .replace("{ref}", order.id)
      .replace("{eta}", order.eta || "shortly")
      .replace("{driver}", order.driver || "your driver")
      .replace("{time}", "now")
      .replace("{window}", "30 min");
    setText(tpl);
  }, [order, trigger, presetTemplate, open]);

  if (!open || !order) return null;
  const triggerMeta = window.ORDER_STATUSES.find((s) => s.key === trigger);
  const charCount = text.length;
  const segments = Math.max(1, Math.ceil(charCount / 160));

  return (
    <div className="modal-bd" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="sms" />
          <div>
            <div style={{ fontWeight: 600 }}>Send SMS notification</div>
            <div className="muted" style={{ fontSize: 11.5 }}>
              {triggerMeta ? `Triggered by status → ${triggerMeta.label}` : "Custom message"}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn ghost sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>

        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="row" style={{ gap: 12, alignItems: "stretch" }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Recipient</label>
              <input value={`${order.contactName} · ${order.contact}`} readOnly />
            </div>
            <div className="field" style={{ width: 160 }}>
              <label>Order</label>
              <input value={order.id} readOnly className="mono" />
            </div>
          </div>

          <div className="field">
            <label>Message · {charCount} chars / {segments} segment{segments > 1 ? "s" : ""}</label>
            <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          </div>

          <div className="row" style={{ justifyContent: "space-between" }}>
            <label className="row" style={{ gap: 6, fontSize: 12, color: "var(--fg-1)" }}>
              <input type="checkbox" checked={includeTracking} onChange={(e) => setIncludeTracking(e.target.checked)} />
              Append tracking link
            </label>
            <div className="seg">
              {[["now","Send now"],["queue","Queue (1 min)"],["pause","Pause auto-SMS"]].map(([k,l]) => (
                <button key={k} className={whenSend === k ? "on" : ""} onClick={() => setWhenSend(k)}>{l}</button>
              ))}
            </div>
          </div>

          <div className="hint">
            Sent via TransVirtual SMS gateway · sender ID <span className="mono">ASALO</span> · est. cost <span className="mono">$0.04</span>
          </div>
        </div>

        <div style={{ padding: 14, borderTop: "1px solid var(--line)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onSend({ order, text, trigger, includeTracking, whenSend })}>
            <Icon name="sms" size={13} /> Send SMS &amp; advance
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { OrdersScreen, OrderDrawer, SMSComposer });
