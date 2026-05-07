# ViewBoost — Design Spec
_Date: 2026-05-06_

## What We're Building

A single-file React component (Claude Artifacts compatible) for **ViewBoost** — a "view-for-view" platform where users earn points by watching videos and spend them to promote their own.

No build step. All dependencies (React 18, Lucide icons) loaded via CDN as Artifacts provides.

---

## Layout

**Tabbed single-page layout.** A pill-style tab toggle at the top switches between two full-width panels:

- **Earn Points** — watch a video, wait 60 seconds, claim points
- **Promote My Video** — paste a YouTube URL, buy views with points, track campaigns

Both panels are never visible simultaneously. This keeps focus tight and suits the single-column viewport of Artifacts.

---

## Component Tree

```
<App>                        — root; owns all shared state
  <Header />                 — logo, "How it Works" link, points balance badge
  <TabBar />                 — pill toggle: "Earn Points" | "Promote My Video"
  <EarnTab />                — YouTube iframe, SVG timer ring, Claim + Skip buttons
  <PromoteTab>               — URL input, views slider, campaign list
    <CampaignCard />         — per-campaign row with gradient progress bar
  </PromoteTab>
</App>
```

State lives entirely in `<App>`, passed down as props. No context, no external state library.

---

## State Shape

```js
{
  points: 500,              // starts with 500 so user can immediately try Promote
  activeTab: "earn",        // "earn" | "promote"
  videoIndex: 0,            // index into VIDEOS playlist array
  timeLeft: 60,             // counts down from 60 to 0
  claimed: false,           // true after claiming; resets on Skip or next video
  campaigns: [...],         // array of CampaignObject (pre-seeded with 2 mock entries)
  urlInput: "",             // controlled input for YouTube URL
  viewsWanted: 100,         // slider value, 10–500 step 10
}
```

### CampaignObject
```js
{
  id: string,               // unique id
  url: string,              // YouTube URL pasted by user
  title: string,            // derived label (e.g. "My Video #1")
  target: number,           // total views purchased
  delivered: number,        // mock progress (simulated)
}
```

---

## Visual Design

### Palette
| Role | Value |
|---|---|
| Page background | `#0f0f1a` |
| Card / surface | `#1a1a2e` |
| Card border | `#ffffff10` |
| Accent purple | `#a855f7` |
| Accent cyan | `#22d3ee` |
| Text primary | `#ffffff` |
| Text secondary | `#94a3b8` |
| Disabled | `#374151` |

### Typography
System-ui stack. No external font imports (Artifacts compatibility).

### Key Visual Elements
- **Points badge** in Header: gold coin icon (Lucide `Coins`), large bold number, purple-glow pill
- **Timer ring**: SVG `<circle>` stroke-dashoffset drain, cyan, 120px diameter, countdown number centered
- **Tab toggle**: rounded-full pill container; active = purple bg + white text; inactive = transparent + muted text; 200ms transition
- **Claim button**: purple gradient when enabled; gray + `cursor-not-allowed` when disabled
- **Progress bar**: linear gradient purple → cyan, rounded, percentage pill overlaid
- **Campaign card**: dark surface, URL truncated, `X / Y views` label, progress bar

---

## Interactions

### Earn Tab
1. YouTube iframe embeds `VIDEOS[videoIndex]` with `?autoplay=1&mute=1` params.
2. `useEffect` runs a `setInterval` (1s) counting `timeLeft` from 60 → 0. Clears on unmount and on video skip.
3. At `timeLeft === 0`: interval clears, timer ring fully drained, Claim button activates (purple glow).
4. **Claim:** `points += 50`, brief "+50 pts" flash text appears below button, `claimed = true`. Timer does not restart until Skip.
5. **Skip:** `videoIndex` increments (wraps), `timeLeft` resets to 60, `claimed` resets to false, interval restarts.

### Promote Tab
1. URL input: plain text field. No validation beyond "non-empty."
2. Views slider: range 10–500, step 10. Live cost display: `views × 5 pts`.
3. Submit button:
   - Disabled if `urlInput` is empty OR `points < cost` → label: "Not enough points"
   - Enabled → label: "Launch Campaign — X pts"
   - On submit: deduct points, append new CampaignObject to `campaigns`, clear inputs.
4. Campaign list renders all campaigns sorted newest-first. `delivered` is static mock data (pre-seeded campaigns have partial progress; new campaigns start at 0).

---

## Data

### VIDEOS playlist (placeholder IDs)
```js
const VIDEOS = [
  "dQw4w9WgXcQ",   // placeholder A
  "9bZkp7q19f0",   // placeholder B
  "kJQP7kiw5Fk",   // placeholder C
];
```

### Pre-seeded campaigns
```js
[
  { id: "c1", url: "https://youtube.com/watch?v=abc123", title: "Product Launch Reel", target: 200, delivered: 134 },
  { id: "c2", url: "https://youtube.com/watch?v=xyz789", title: "Tutorial — Getting Started", target: 100, delivered: 45 },
]
```

---

## Constraints & Compatibility

- **Single file** — all components defined as named functions in one file; default export is `<App />`
- **No build step** — no JSX transforms beyond what Artifacts provides; standard React hooks only
- **CDN dependencies** — React 18 + ReactDOM, Lucide React (via esm.sh or similar); no npm imports
- **Tailwind** — via CDN `<script>` tag in the Artifacts wrapper; use utility classes throughout
- **No persistence** — state resets on reload; this is explicitly a demo artifact
