// Main app — orchestrates screens, drawer, SMS composer, toasts, tweaks

const { useState, useEffect, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentHue": 75,
  "density": "comfortable",
  "themeMode": "dark",
  "themeBrightness": 0
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply accent + density + theme live
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", `oklch(0.78 0.16 ${tweaks.accentHue})`);
    document.documentElement.style.setProperty("--accent-soft", `oklch(0.78 0.16 ${tweaks.accentHue} / 0.14)`);
    document.documentElement.dataset.density = tweaks.density;
    let mode = tweaks.themeMode;
    if (mode === "system") mode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = mode;
  }, [tweaks.accentHue, tweaks.density, tweaks.themeMode]);

  function brightAttr(b) {
    if (!b) return null;
    const sign = b > 0 ? "up" : "down";
    const mag = Math.min(3, Math.ceil(Math.abs(b) / 7));
    return `${sign}-${mag}`;
  }

  const [orders, setOrders] = useState(window.ORDERS);
  const [drivers, setDrivers] = useState(window.DRIVERS);
  const [customers, setCustomers] = useState(window.CUSTOMERS);
  const [assignments, setAssignments] = useState({ "ASL-24868": "drv-014", "ASL-24867": "drv-007", "ASL-24869": "drv-022" });
  const [view, setView] = useState("orders");
  const [selectedId, setSelectedId] = useState(null);
  const [smsState, setSmsState] = useState({ open: false, order: null, trigger: null, preset: null });
  const [toasts, setToasts] = useState([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function handleAssign(orderId, driverId) {
    setAssignments(a => ({ ...a, [orderId]: driverId }));
    const d = drivers.find(x => x.id === driverId);
    const o = orders.find(x => x.id === orderId);
    pushToast({ ttl: "Vehicle assigned", sub: `${d?.truck || driverId} → ${orderId} · ${o?.customer || ""}` });
  }
  function handleRemove(orderId) {
    setAssignments(a => { const n = { ...a }; delete n[orderId]; return n; });
  }
  function handleAddDriver(d) {
    setDrivers(arr => [...arr, d]);
    pushToast({ ttl: "Driver added", sub: `${d.name} · ${d.truck}` });
  }
  function handleDeleteOrder(orderId) {
    const o = orders.find(x => x.id === orderId);
    setOrders(arr => arr.filter(x => x.id !== orderId));
    setAssignments(a => { const n = { ...a }; delete n[orderId]; return n; });
    if (selectedId === orderId) setSelectedId(null);
    pushToast({ ttl: "Order deleted", sub: o ? `${o.id} · ${o.customer}` : orderId });
  }
  function handleDeleteCustomer(name) {
    setCustomers(arr => arr.filter(x => x.name !== name));
    pushToast({ ttl: "Customer deleted", sub: name });
  }
  function handleDeleteDriver(driverId) {
    const d = drivers.find(x => x.id === driverId);
    setDrivers(arr => arr.filter(x => x.id !== driverId));
    setAssignments(a => {
      const n = { ...a };
      Object.keys(n).forEach(k => { if (n[k] === driverId) delete n[k]; });
      return n;
    });
    pushToast({ ttl: "Driver removed", sub: d ? `${d.name} · ${d.truck}` : driverId });
  }

  const selected = orders.find((o) => o.id === selectedId);

  function pushToast(t) {
    const id = Math.random().toString(36).slice(2);
    setToasts((arr) => [...arr, { id, ...t }]);
    setTimeout(() => setToasts((arr) => arr.filter((x) => x.id !== id)), 3800);
  }

  function advance(order, nextStatus) {
    setSmsState({ open: true, order, trigger: nextStatus, preset: null });
  }

  function sendSmsAndAdvance({ order, text, trigger }) {
    if (trigger) {
      setOrders((arr) => arr.map((o) => (o.id === order.id ? { ...o, status: trigger } : o)));
    }
    setSmsState({ open: false, order: null, trigger: null, preset: null });
    pushToast({
      ttl: `SMS sent to ${order.contactName}`,
      sub: `${order.contact} · ${order.id}${trigger ? " · " + ((window.ORDER_STATUSES.find(s=>s.key===trigger)||{}).label || "") : ""}`
    });
  }

  const crumbsByView = {
    orders:        ["Operations", "Orders"],
    tracking:      ["Operations", "Live Tracking"],
    fleet:         ["Operations", "Fleet & Drivers"],
    notifications: ["Operations", "SMS & Notifications"],
    customers:     ["Customers"],
    billing:       ["Customers", "Billing"],
    analytics:     ["Insights", "Analytics"],
    api:           ["System", "API & Integrations"],
    settings:      ["System", "Settings"],
  };

  return (
    <div className="asalo-app" data-bright={brightAttr(tweaks.themeBrightness) || undefined}>
      <Sidebar
        active={view}
        onNav={(v) => { setView(v); setSelectedId(null); }}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <div className="main" style={{ position: "relative" }}>
        <Topbar
          crumbs={crumbsByView[view] || ["Dashboard"]}
          onSyncing={() => pushToast({ ttl: "Synced with TransVirtual", sub: "1,284 events · 0 errors" })}
          onMenu={() => setMobileNavOpen(true)}
        />
        <div className="viewport">
          {view === "orders" && (
            <OrdersScreen
              orders={orders}
              selectedId={selectedId}
              onSelect={setSelectedId}
              density={tweaks.density}
              onNewOrder={(o) => { setOrders((arr) => [o, ...arr]); pushToast({ ttl: "Order created", sub: `${o.id} · ${o.customer}` }); }}
              onDeleteOrder={handleDeleteOrder}
              onToast={pushToast}
            />
          )}
          {view === "tracking"      && <TrackingScreen orders={orders} drivers={drivers} assignments={assignments} onAssign={handleAssign} onRemove={handleRemove} />}
          {view === "fleet"         && <FleetScreen drivers={drivers} assignments={assignments} orders={orders} onAddDriver={handleAddDriver} onDeleteDriver={handleDeleteDriver} onToast={pushToast} />}
          {view === "notifications" && <NotificationsScreen log={window.SMS_LOG} onToast={pushToast} />}
          {view === "customers"     && <CustomersScreen customers={customers} onAddCustomer={c => { setCustomers(arr => [...arr, c]); pushToast({ ttl: "Customer added", sub: c.name }); }} onDeleteCustomer={handleDeleteCustomer} onToast={pushToast} />}
          {view === "billing"       && <BillingScreen customers={customers} onToast={pushToast} />}
          {view === "analytics"     && <AnalyticsScreen />}
          {view === "api"           && <ApiScreen onToast={pushToast} />}
          {view === "settings"      && (
            <SettingsScreen
              theme={{ mode: tweaks.themeMode, brightness: tweaks.themeBrightness }}
              onThemeChange={(t) => { setTweak("themeMode", t.mode); setTweak("themeBrightness", t.brightness); }}
              onToast={pushToast}
            />
          )}
        </div>

        <BottomNav
          active={view}
          onNav={(v) => { setView(v); setSelectedId(null); }}
          onMore={() => setMobileNavOpen(true)}
        />

        {selected && view === "orders" && (
          <OrderDrawer
            order={selected}
            onClose={() => setSelectedId(null)}
            onAdvance={advance}
            onSendCustom={(o) => setSmsState({ open: true, order: o, trigger: null, preset: window.SMS_TEMPLATES.out_for_delivery })}
            onDelete={handleDeleteOrder}
          />
        )}

        <SMSComposer
          open={smsState.open}
          order={smsState.order}
          trigger={smsState.trigger}
          presetTemplate={smsState.preset}
          onClose={() => setSmsState({ open: false, order: null, trigger: null, preset: null })}
          onSend={sendSmsAndAdvance}
        />

        <div className="toast-host">
          {toasts.map((t) => (
            <div key={t.id} className="toast">
              <div className="ttl">{t.ttl}</div>
              {t.sub && <div className="sub">{t.sub}</div>}
            </div>
          ))}
        </div>

        <TweaksPanel title="Tweaks">
          <TweakSection label="Accent" />
          <TweakSlider label="Hue" value={tweaks.accentHue} min={0} max={360} step={1}
            onChange={(v) => setTweak("accentHue", v)} />
          <div style={{ display: "flex", gap: 6 }}>
            {[75, 30, 145, 200, 230, 290].map((h) => (
              <button key={h} onClick={() => setTweak("accentHue", h)}
                style={{
                  width: 22, height: 22, borderRadius: 5, cursor: "pointer",
                  background: `oklch(0.78 0.16 ${h})`,
                  border: tweaks.accentHue === h ? "2px solid #000" : "1px solid rgba(0,0,0,0.15)",
                }} />
            ))}
          </div>
          <TweakSection label="Density" />
          <TweakRadio value={tweaks.density}
            options={["comfortable", "compact"]}
            onChange={(v) => setTweak("density", v)} />
        </TweaksPanel>
      </div>
    </div>
  );
}

Object.assign(window, { App });
