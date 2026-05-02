// Sidebar + topbar shell

const NAV = [
  { section: "Operations" },
  { key: "orders", label: "Orders", icon: "inbox", badge: "8" },
  { key: "tracking", label: "Live Tracking", icon: "map" },
  { key: "fleet", label: "Fleet & Drivers", icon: "truck" },
  { key: "notifications", label: "SMS & Notifications", icon: "bell", badge: "26" },
  { section: "Customers" },
  { key: "customers", label: "Customers", icon: "contact" },
  { key: "billing", label: "Billing", icon: "receipt" },
  { section: "Insights" },
  { key: "analytics", label: "Analytics", icon: "chart" },
  { section: "System" },
  { key: "api", label: "API & Integrations", icon: "link" },
  { key: "settings", label: "Settings", icon: "cog" },
];

function Sidebar({ active, onNav }) {
  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="sb-mark">A</div>
        <div className="sb-name">
          ASALO
          <small>Logistic OS</small>
        </div>
      </div>

      {NAV.map((n, i) =>
        n.section ? (
          <div key={`s${i}`} className="sb-section">{n.section}</div>
        ) : (
          <div key={n.key} className="sb-nav">
            <button
              className={`sb-item ${active === n.key ? "active" : ""}`}
              onClick={() => onNav(n.key)}
            >
              <Icon name={n.icon} />
              {n.label}
              {n.badge && <span className="badge">{n.badge}</span>}
            </button>
          </div>
        )
      )}

      <div className="sb-footer">
        <div className="sb-user">
          <div className="sb-avatar">RM</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sb-uname">Renato M.</div>
            <div className="sb-urole">Ops Manager · Melbourne</div>
          </div>
          <Icon name="cog" size={14} />
        </div>
      </div>
    </aside>
  );
}

function Topbar({ crumbs, onSyncing }) {
  const [q, setQ] = React.useState("");
  return (
    <header className="topbar">
      <div className="crumb">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ margin: "0 6px", color: "var(--fg-3)" }}>/</span>}
            {i === crumbs.length - 1 ? <b>{c}</b> : c}
          </React.Fragment>
        ))}
      </div>

      <div className="search">
        <Icon name="search" size={14} />
        <input
          placeholder="Search orders, customers, drivers, refs…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <kbd>⌘K</kbd>
      </div>

      <div className="tb-spacer" />

      <span className="tb-pill">
        <span className="dot" />
        TransVirtual API · synced 14s ago
      </span>
      <button className="btn ghost sm" onClick={onSyncing}>
        <Icon name="refresh" size={13} /> Sync
      </button>
      <button className="btn sm">
        <Icon name="bell" size={13} />
      </button>
      <div className="sb-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>RM</div>
    </header>
  );
}

Object.assign(window, { Sidebar, Topbar });
