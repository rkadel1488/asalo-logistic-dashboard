// Icons + shared bits for ASALO

const Icon = ({ name, size = 16, stroke = 1.6, ...rest }) => {
  const paths = {
    inbox: "M3 13l3-7h12l3 7v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6zM3 13h5l1 2h6l1-2h5",
    truck: "M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    map: "M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
    users: "M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM3 21v-1a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v1",
    contact: "M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 17c.5-2 2-3 4-3s3.5 1 4 3",
    bell: "M6 8a6 6 0 0 1 12 0c0 5 2 6 2 7H4s2-2 2-7zM10 21a2 2 0 0 0 4 0",
    chart: "M4 20V8M10 20v-7M16 20v-4M22 20H2",
    cog: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z",
    receipt: "M4 4h16v17l-3-2-3 2-3-2-3 2-3-2-1 2zM8 9h8M8 13h8M8 17h5",
    search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4-4",
    plus: "M12 5v14M5 12h14",
    filter: "M3 5h18l-7 9v6l-4-2v-4z",
    arrow: "M5 12h14M13 6l6 6-6 6",
    arrow_l: "M19 12H5M11 6l-6 6 6 6",
    check: "M5 12l4 4 10-10",
    x: "M6 6l12 12M18 6L6 18",
    sms: "M21 11a8 8 0 0 1-8 8H6l-3 3v-9a8 8 0 0 1 8-8h2a8 8 0 0 1 8 6z",
    phone: "M22 16v3a2 2 0 0 1-2 2 19 19 0 0 1-17-17 2 2 0 0 1 2-2h3a1 1 0 0 1 1 .8l1 4a1 1 0 0 1-.3 1l-2 2a16 16 0 0 0 7 7l2-2a1 1 0 0 1 1-.3l4 1a1 1 0 0 1 .8 1z",
    pkg: "M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10",
    dot: "M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0",
    mapPin: "M12 22s8-7 8-13a8 8 0 0 0-16 0c0 6 8 13 8 13zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 7v5l3 2",
    flame: "M12 22a6 6 0 0 0 6-6c0-3-2-5-3-8 0 0-1 3-3 3-1 0-2-1-2-2 0-2 2-3 2-5 0-2-2-3-2-3s-4 3-4 9c0 6 6 12 6 12z",
    snow: "M12 2v20M4.2 6.5l15.6 11M19.8 6.5l-15.6 11M2 12h20",
    edit: "M12 20h9M16 4l4 4-12 12H4v-4z",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    layers: "M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
    play: "M5 4l14 8-14 8z",
    pause: "M6 4h4v16H6zM14 4h4v16h-4z",
    download: "M12 3v12M7 10l5 5 5-5M5 21h14",
    refresh: "M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5",
    barrel: "M5 4h14v16H5zM5 8h14M5 16h14M9 4v16M15 4v16",
    menu: "M3 6h18M3 12h18M3 18h18",
  };
  const d = paths[name] || paths.dot;
  return (
    <svg className="ico" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d={d} />
    </svg>
  );
};

const Sparkline = ({ data, w = 80, h = 22 }) => {
  if (!data || !data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline className="spark-fill" points={`0,${h} ${pts} ${w},${h}`} />
      <polyline className="spark-line" points={pts} />
    </svg>
  );
};

const StatusPill = ({ status }) => {
  const s = (window.ORDER_STATUSES || []).find((x) => x.key === status) || { key: status, label: status };
  return (
    <span className={`status ${s.key}`}>
      <span className="dot" /> {s.label}
    </span>
  );
};

const CargoIcon = ({ type, size = 14 }) => {
  const map = { "Pallets": "layers", "Parcels": "pkg", "Barrels": "barrel", "Cold chain": "snow" };
  return <Icon name={map[type] || "pkg"} size={size} />;
};

Object.assign(window, { Icon, Sparkline, StatusPill, CargoIcon });
