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

// ── App ──────────────────────────────────────────────────────────────────────────

export default function App() {
  const [points, setPoints] = useState(500);

  return (
    <div style={{ background: "#0f0f1a", minHeight: "100vh", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <Header points={points} />
    </div>
  );
}
