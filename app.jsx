// Main app — orchestrates screens, drawer, SMS composer, toasts, tweaks

const { useState, useEffect, useRef, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentHue": 75,
  "density": "comfortable",
  "themeMode": "dark",
  "themeBrightness": 0
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState(window.CUSTOMERS);
  const [assignments, setAssignments] = useState({});
  const [view, setView] = useState("orders");
  const [selectedId, setSelectedId] = useState(null);
  const [smsState, setSmsState] = useState({ open: false, order: null, trigger: null, preset: null });
  const [toasts, setToasts] = useState([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Apply accent + density + theme live
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", `oklch(0.78 0.16 ${tweaks.accentHue})`);
    document.documentElement.style.setProperty("--accent-soft", `oklch(0.78 0.16 ${tweaks.accentHue} / 0.14)`);
    document.documentElement.dataset.density = tweaks.density;
    let mode = tweaks.themeMode;
    if (mode === "system") mode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = mode;
  }, [tweaks.accentHue, tweaks.density, tweaks.themeMode]);

  // Firestore real-time orders subscription
  useEffect(() => {
    const col = window.db.collection("orders");
    const unsub = col.orderBy("createdAt", "desc").onSnapshot(snap => {
      const incoming = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setOrders(incoming);
      setOrdersLoading(false);
      // Auto-register unknown customers
      setCustomers(existing => {
        const names = new Set(existing.map(c => c.name));
        const newOnes = [];
        incoming.forEach(o => {
          if (o.customer && !names.has(o.customer)) {
            names.add(o.customer);
            newOnes.push({
              name: o.customer,
              contact: o.contactName || "",
              phone: o.contact || "",
              abn: o.abn || "",
              vat: o.vat || "",
              billingEmail: o.billingEmail || "",
              billingAddress: o.billingAddress || "",
              orders: 1,
              value: o.value || "$0",
              tier: "Standard",
            });
          }
        });
        return newOnes.length ? [...existing, ...newOnes] : existing;
      });
    }, () => setOrdersLoading(false));
    return () => unsub();
  }, []);

  // Firestore real-time drivers subscription
  useEffect(() => {
    const unsub = window.db.collection("drivers").onSnapshot(snap => {
      if (snap.empty) {
        // Seed Firestore with mock drivers on first load
        const batch = window.db.batch();
        (window.DRIVERS || []).forEach(d => {
          batch.set(window.db.collection("drivers").doc(d.id), d);
        });
        batch.commit();
      } else {
        setDrivers(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      }
    });
    return () => unsub();
  }, []);

  // Firestore real-time assignments subscription
  useEffect(() => {
    const unsub = window.db.collection("assignments").doc("current").onSnapshot(doc => {
      if (doc.exists) setAssignments(doc.data() || {});
    });
    return () => unsub();
  }, []);

  function brightAttr(b) {
    if (!b) return null;
    const sign = b > 0 ? "up" : "down";
    const mag = Math.min(3, Math.ceil(Math.abs(b) / 7));
    return `${sign}-${mag}`;
  }

  function handleAssign(orderId, driverId) {
    const newAssignments = { ...assignments, [orderId]: driverId };
    setAssignments(newAssignments);
    window.db.collection("assignments").doc("current").set(newAssignments);
    const d = drivers.find(x => x.id === driverId);
    const o = orders.find(x => x.id === orderId);
    pushToast({ ttl: "Vehicle assigned", sub: `${d?.truck || driverId} → ${orderId} · ${o?.customer || ""}` });
    // Send tracking link to driver via SMS
    if (d?.phone) {
      const trackUrl = `https://logisticsasa.netlify.app/driver-track.html?orderId=${orderId}&driverId=${driverId}`;
      const msg = encodeURIComponent(`ASALO Logistics: You've been assigned delivery ${orderId} to ${o?.destination || ""}. Open your tracking link to view details and share your location: ${trackUrl}`);
      window.open(`sms:${d.phone.replace(/\s/g, "")}?body=${msg}`, "_self");
    }
  }
  function handleRemove(orderId) {
    const newAssignments = { ...assignments };
    delete newAssignments[orderId];
    setAssignments(newAssignments);
    window.db.collection("assignments").doc("current").set(newAssignments);
  }
  function handleAddDriver(d) {
    window.db.collection("drivers").doc(d.id).set(d);
    pushToast({ ttl: "Driver added", sub: `${d.name} · ${d.truck}` });
  }
  function handleDeleteOrder(orderId) {
    const o = orders.find(x => x.id === orderId);
    window.db.collection("orders").doc(orderId).delete();
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
    window.db.collection("drivers").doc(driverId).delete();
    const newAssignments = { ...assignments };
    Object.keys(newAssignments).forEach(k => { if (newAssignments[k] === driverId) delete newAssignments[k]; });
    setAssignments(newAssignments);
    window.db.collection("assignments").doc("current").set(newAssignments);
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
      window.db.collection("orders").doc(order.id).update({ status: trigger });
    }
    setSmsState({ open: false, order: null, trigger: null, preset: null });
    pushToast({
      ttl: `SMS sent to ${order.contactName}`,
      sub: `${order.contact} · ${order.id}${trigger ? " · " + ((window.ORDER_STATUSES.find(s=>s.key===trigger)||{}).label || "") : ""}`
    });
  }

  const crumbsByView = {
    pod:           ["Operations", "POD"],
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
        orderCount={orders.length}
      />
      <div className="main" style={{ position: "relative" }}>
        <Topbar
          crumbs={crumbsByView[view] || ["Dashboard"]}
          onSyncing={() => pushToast({ ttl: "Sync complete", sub: "1,284 events · 0 errors" })}
          onMenu={() => setMobileNavOpen(true)}
        />
        <div className="viewport">
          {ordersLoading && view === "orders" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12 }}>
              <Icon name="refresh" size={22} style={{ opacity: 0.4, animation: "spin 1s linear infinite" }} />
              <div className="muted" style={{ fontSize: 13 }}>Loading orders from Firestore…</div>
            </div>
          )}
          {view === "orders" && !ordersLoading && (
            <OrdersScreen
              orders={orders}
              selectedId={selectedId}
              onSelect={setSelectedId}
              density={tweaks.density}
              onNewOrder={(o) => {
                window.db.collection("orders").doc(o.id).set({ ...o, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                pushToast({ ttl: "Order created", sub: `${o.id} · ${o.customer}` });
              }}
              onDeleteOrder={handleDeleteOrder}
              onToast={pushToast}
            />
          )}
          {view === "pod"           && <PODScreen orders={orders} onToast={pushToast} />}
          {view === "tracking"      && <TrackingScreen orders={orders} drivers={drivers} assignments={assignments} onAssign={handleAssign} onRemove={handleRemove} />}
          {view === "fleet"         && <FleetScreen drivers={drivers} assignments={assignments} orders={orders} onAddDriver={handleAddDriver} onDeleteDriver={handleDeleteDriver} onAssign={handleAssign} onToast={pushToast} />}
          {view === "notifications" && <NotificationsScreen log={window.SMS_LOG} onToast={pushToast} />}
          {view === "customers"     && <CustomersScreen customers={customers} onAddCustomer={c => { setCustomers(arr => [...arr, c]); pushToast({ ttl: "Customer added", sub: c.name }); }} onDeleteCustomer={handleDeleteCustomer} onToast={pushToast} />}
          {view === "billing"       && <BillingScreen customers={customers} orders={orders} onToast={pushToast} />}
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
