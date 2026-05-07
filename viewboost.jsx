import { useState, useEffect, useRef } from "react";
import { Coins, Play, SkipForward, Rocket, BarChart2, ExternalLink } from "https://esm.sh/lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────

const VIDEOS = [
  "dQw4w9WgXcQ",
  "9bZkp7q19f0",
  "kJQP7kiw5Fk",
];

const SEED_CAMPAIGNS = [
  { id: "c1", url: "https://youtube.com/watch?v=abc123", title: "Product Launch Reel",        target: 200, delivered: 134 },
  { id: "c2", url: "https://youtube.com/watch?v=xyz789", title: "Tutorial — Getting Started", target: 100, delivered: 45  },
];

const POINTS_PER_WATCH  = 50;
const WATCH_DURATION    = 60; // seconds
const COST_PER_VIEW     = 5;  // points

const RING_R      = 54;   // SVG circle radius
const RING_CIRC   = 2 * Math.PI * RING_R; // circumference ≈ 339.3

// ── Header Component ────────────────────────────────────────────────────────────

function Header({ points }) {
  return (
    <header style={{ background: "#13132a", borderBottom: "1px solid #ffffff15", padding: "0 24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#a855f7,#22d3ee)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Play size={16} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.5px" }}>
            View<span style={{ color: "#a855f7" }}>Boost</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* How it Works link */}
          <a href="#" style={{ color: "#94a3b8", fontSize: 14, textDecoration: "none" }}
             onMouseEnter={e => e.target.style.color = "#fff"}
             onMouseLeave={e => e.target.style.color = "#94a3b8"}>
            How it Works
          </a>

          {/* Points badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg,#1e1140,#1a1a2e)",
            border: "1px solid #a855f740",
            borderRadius: 999, padding: "6px 16px",
            boxShadow: "0 0 16px #a855f730",
          }}>
            <Coins size={16} color="#f59e0b" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>{points.toLocaleString()}</span>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>pts</span>
          </div>
        </div>
      </div>
    </header>
  );
}

// ── TabBar Component ───────────────────────────────────────────────────────────

function TabBar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: "earn",    label: "⚡ Earn Points"       },
    { id: "promote", label: "🚀 Promote My Video"  },
  ];

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "24px 0 0" }}>
      <div style={{
        display: "inline-flex",
        background: "#1a1a2e",
        border: "1px solid #ffffff10",
        borderRadius: 999,
        padding: 4,
        gap: 4,
      }}>
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 24px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                transition: "all 200ms",
                background: active ? "linear-gradient(135deg,#a855f7,#7c3aed)" : "transparent",
                color: active ? "#fff" : "#94a3b8",
                boxShadow: active ? "0 0 20px #a855f750" : "none",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── EarnTab Component ────────────────────────────────────────────────────────────

function EarnTab({ points, setPoints, videoIndex, setVideoIndex, timeLeft, setTimeLeft, claimed, setClaimed }) {
  const intervalRef = useRef(null);

  // Start / restart interval whenever videoIndex changes or claimed resets
  useEffect(() => {
    if (claimed) return; // don't tick after claiming
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [videoIndex, claimed]);

  // Stop the interval when countdown reaches zero
  useEffect(() => {
    if (timeLeft === 0) clearInterval(intervalRef.current);
  }, [timeLeft]);

  function handleClaim() {
    setPoints(p => p + POINTS_PER_WATCH);
    setClaimed(true);
  }

  function handleSkip() {
    clearInterval(intervalRef.current);
    setVideoIndex(i => (i + 1) % VIDEOS.length);
    setTimeLeft(WATCH_DURATION);
    setClaimed(false);
  }

  const progress   = timeLeft / WATCH_DURATION; // 1 → 0
  const dashOffset = RING_CIRC * (1 - progress); // 0 → full (ring drains)
  const canClaim   = timeLeft === 0 && !claimed;
  const videoId    = VIDEOS[videoIndex];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* YouTube embed */}
      <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #ffffff10", boxShadow: "0 0 40px #a855f720", aspectRatio: "16/9" }}>
        <iframe
          key={videoId}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`}
          style={{ width: "100%", height: "100%", border: "none" }}
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      </div>

      {/* Timer + actions row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
        {/* SVG ring */}
        <div style={{ position: "relative", width: 120, height: 120 }}>
          <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
            {/* Track */}
            <circle cx="60" cy="60" r={RING_R} fill="none" stroke="#1a1a2e" strokeWidth="8" />
            {/* Drain */}
            <circle
              cx="60" cy="60" r={RING_R}
              fill="none"
              stroke={timeLeft === 0 ? "#a855f7" : "#22d3ee"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={RING_CIRC}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }}
            />
          </svg>
          {/* Center label */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: timeLeft === 0 ? "#a855f7" : "#22d3ee" }}>
              {timeLeft}
            </span>
            <span style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>sec</span>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 220 }}>
          <button
            onClick={handleClaim}
            disabled={!canClaim}
            style={{
              padding: "14px 28px",
              borderRadius: 12,
              border: "none",
              fontWeight: 700,
              fontSize: 15,
              cursor: canClaim ? "pointer" : "not-allowed",
              background: canClaim
                ? "linear-gradient(135deg,#a855f7,#7c3aed)"
                : "#1f2937",
              color: canClaim ? "#fff" : "#4b5563",
              boxShadow: canClaim ? "0 0 24px #a855f760" : "none",
              transition: "all 0.2s",
            }}
          >
            {claimed ? "✓ Claimed!" : `Claim ${POINTS_PER_WATCH} Points`}
          </button>

          <button
            onClick={handleSkip}
            style={{
              padding: "12px 28px",
              borderRadius: 12,
              border: "1px solid #ffffff20",
              background: "transparent",
              color: "#94a3b8",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#ffffff50"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#ffffff20"; e.currentTarget.style.color = "#94a3b8"; }}
          >
            <SkipForward size={14} /> Skip Video
          </button>

          {/* +50 pts flash */}
          {claimed && (
            <div style={{ textAlign: "center", color: "#22d3ee", fontWeight: 700, fontSize: 14 }}>
              +{POINTS_PER_WATCH} pts earned!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────────

export default function App() {
  const [points,     setPoints]     = useState(500);
  const [activeTab,  setActiveTab]  = useState("earn");
  const [videoIndex, setVideoIndex] = useState(0);
  const [timeLeft,   setTimeLeft]   = useState(WATCH_DURATION);
  const [claimed,    setClaimed]    = useState(false);

  return (
    <div style={{ background: "#0f0f1a", minHeight: "100vh", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <Header points={points} />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 48px" }}>
        <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div style={{ marginTop: 32 }}>
          {activeTab === "earn" && (
            <EarnTab
              points={points}       setPoints={setPoints}
              videoIndex={videoIndex} setVideoIndex={setVideoIndex}
              timeLeft={timeLeft}   setTimeLeft={setTimeLeft}
              claimed={claimed}     setClaimed={setClaimed}
            />
          )}
          {activeTab === "promote" && <div style={{ color: "#94a3b8" }}>PromoteTab coming soon</div>}
        </div>
      </div>
    </div>
  );
}
