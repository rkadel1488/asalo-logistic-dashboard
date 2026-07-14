// Sidebar + topbar shell

const NAV = [
  { section: "Operations" },
  { key: "pod", label: "POD", icon: "check" },
  { key: "orders", label: "Orders", icon: "inbox" },
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

function Sidebar({ active, onNav, open, onClose, orderCount }) {
  return (
    <React.Fragment>
      {open && <div className="sb-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
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
                onClick={() => { onNav(n.key); onClose && onClose(); }}
              >
                <Icon name={n.icon} />
                {n.label}
                {n.key === "orders" ? (orderCount > 0 && <span className="badge">{orderCount}</span>) : (n.badge && <span className="badge">{n.badge}</span>)}
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
    </React.Fragment>
  );
}

function Topbar({ crumbs, onSyncing, onMenu }) {
  const [q, setQ] = React.useState("");
  return (
    <header className="topbar">
      <button className="btn ghost sm menu-btn" onClick={onMenu} aria-label="Open menu">
        <Icon name="menu" size={18} />
      </button>

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
      <button className="btn ghost sm tb-sync" onClick={onSyncing}>
        <Icon name="refresh" size={13} /> Sync
      </button>
      <button className="btn sm tb-bell">
        <Icon name="bell" size={13} />
      </button>
      <div className="sb-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>RM</div>
    </header>
  );
}

const TABS = [
  { key: "orders", label: "Orders", icon: "inbox" },
  { key: "tracking", label: "Tracking", icon: "map" },
  { key: "fleet", label: "Fleet", icon: "truck" },
  { key: "notifications", label: "Alerts", icon: "bell" },
];
const TAB_KEYS = new Set(TABS.map((t) => t.key));

function BottomNav({ active, onNav, onMore }) {
  const moreActive = !TAB_KEYS.has(active);
  return (
    <nav className="bottom-nav">
      {TABS.map((t) => (
        <button
          key={t.key}
          className={`bn-item ${active === t.key ? "active" : ""}`}
          onClick={() => onNav(t.key)}
        >
          <Icon name={t.icon} size={20} />
          <span>{t.label}</span>
        </button>
      ))}
      <button className={`bn-item ${moreActive ? "active" : ""}`} onClick={onMore}>
        <Icon name="menu" size={20} />
        <span>More</span>
      </button>
    </nav>
  );
}

Object.assign(window, { Sidebar, Topbar, BottomNav });
