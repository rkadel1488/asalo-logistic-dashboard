// Sidebar + topbar shell

const NAV_ALL = [
  { section: "Operations" },
  { key: "pod", label: "POD", icon: "check" },
  { key: "orders", label: "Orders", icon: "inbox" },
  { key: "tracking", label: "Live Tracking", icon: "map" },
  { key: "fleet", label: "Fleet & Drivers", icon: "truck" },
  { key: "notifications", label: "SMS & Notifications", icon: "bell", badge: "26" },
  { section: "Customers" },
  { key: "customers", label: "Customers", icon: "contact" },
  { key: "billing", label: "Billing", icon: "receipt" },
  { section: "System", adminOnly: true },
  { key: "users", label: "User Management", icon: "contact", adminOnly: true },
  { key: "api", label: "API & Integrations", icon: "link", adminOnly: true },
  { key: "settings", label: "Settings", icon: "cog", adminOnly: true },
];

function Sidebar({ active, onNav, open, onClose, orderCount, userRole, currentUser }) {
  const isAdmin = userRole === "admin";
  const nav = NAV_ALL.filter(n => !n.adminOnly || isAdmin);
  const initials = currentUser?.email ? currentUser.email.substring(0, 2).toUpperCase() : "??";
  const displayName = currentUser?.displayName || currentUser?.email?.split("@")[0] || "User";

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

        {nav.map((n, i) =>
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
            <div className="sb-avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sb-uname">{displayName}</div>
              <div className="sb-urole">{isAdmin ? "Administrator" : "User"}</div>
            </div>
            <button title="Sign out" onClick={() => window.auth.signOut()}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-3)", padding: 4, display: "flex", alignItems: "center" }}>
              <Icon name="x" size={14} />
            </button>
          </div>
        </div>
      </aside>
    </React.Fragment>
  );
}

function Topbar({ crumbs, onSyncing, onMenu, currentUser, userRole }) {
  const [q, setQ] = React.useState("");
  const initials = currentUser?.email ? currentUser.email.substring(0, 2).toUpperCase() : "??";
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
        ASALO · synced 14s ago
      </span>
      <button className="btn ghost sm tb-sync" onClick={onSyncing}>
        <Icon name="refresh" size={13} /> Sync
      </button>
      <button className="btn sm tb-bell">
        <Icon name="bell" size={13} />
      </button>
      <div title={`${currentUser?.email} · ${userRole}`} className="sb-avatar" style={{ width: 28, height: 28, fontSize: 11, cursor: "default" }}>{initials}</div>
    </header>
  );
}

const TABS = [
  { key: "pod", label: "POD", icon: "check" },
  { key: "orders", label: "Orders", icon: "inbox" },
  { key: "tracking", label: "Tracking", icon: "map" },
  { key: "fleet", label: "Fleet", icon: "truck" },
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
