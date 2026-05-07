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

export default function App() {
  return <div style={{ background: "#0f0f1a", minHeight: "100vh", color: "#fff", fontFamily: "system-ui, sans-serif" }}>ViewBoost scaffold</div>;
}
