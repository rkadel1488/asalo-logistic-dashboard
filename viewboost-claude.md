# ViewBoost — Claude Code Project

## What this is
A single-file React component (`viewboost.jsx`) for **ViewBoost** — a "view-for-view" platform where users earn points by watching YouTube videos and spend them to promote their own videos.

Built as a Claude Artifacts-compatible component: no build step, all dependencies via CDN.

## How to use
Paste the contents of `viewboost.jsx` directly into a Claude Artifact (React type). The component is self-contained and renders immediately.

## File structure

| File | Purpose |
|------|---------|
| `viewboost.jsx` | Entire app — constants, all components, default `<App />` export |
| `viewboost-claude.md` | This file — project documentation for Claude Code |
| `docs/superpowers/specs/2026-05-06-viewboost-design.md` | Original design spec |
| `docs/superpowers/plans/2026-05-06-viewboost.md` | Implementation plan |

## Component tree

```
<App>                   — root; owns all state
  <Header />            — logo, "How it Works" link, points balance badge
  <TabBar />            — pill toggle: Earn Points | Promote My Video
  <EarnTab />           — YouTube iframe, SVG countdown ring, Claim + Skip buttons
  <PromoteTab>          — URL input, views slider, campaign list
    <CampaignCard />    — per-campaign row with gradient progress bar
  </PromoteTab>
</App>
```

## State (all in `<App>`)

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `points` | number | 500 | Current point balance |
| `activeTab` | `"earn"` \| `"promote"` | `"earn"` | Active tab |
| `videoIndex` | number | 0 | Index into `VIDEOS` playlist |
| `timeLeft` | number | 60 | Countdown seconds |
| `claimed` | boolean | false | Whether current video has been claimed |
| `campaigns` | CampaignObject[] | seed data | Active promotions |
| `urlInput` | string | "" | Controlled input for YouTube URL |
| `viewsWanted` | number | 100 | Slider value (10–500, step 10) |

## Key constants

| Constant | Value | Meaning |
|----------|-------|---------|
| `POINTS_PER_WATCH` | 50 | Points awarded per completed watch |
| `WATCH_DURATION` | 60 | Seconds required to watch before claiming |
| `COST_PER_VIEW` | 5 | Points cost per view purchased |
| `RING_R` | 54 | SVG timer ring radius (px) |

## Earn flow
1. YouTube iframe autoplays (muted) the current video from the `VIDEOS` array
2. `useEffect` + `setInterval` ticks `timeLeft` 60 → 0; a second effect stops the interval when `timeLeft === 0`
3. SVG ring drains cyan as time passes; turns purple at 0
4. "Claim Points" button activates at `timeLeft === 0`
5. Claim: `points += 50`, shows "+50 pts earned!" flash, `claimed = true`
6. Skip: advances `videoIndex` (wraps), resets timer and `claimed`

## Promote flow
1. User pastes a YouTube URL and drags the views slider (10–500)
2. Cost shown live: `views × 5 pts`
3. Launch button disabled if URL empty or `points < cost`
4. On launch: new `CampaignObject` prepended to `campaigns`, points deducted
5. Campaign cards render gradient progress bar (purple → cyan)

## CDN dependencies
- React 18 + ReactDOM (provided by Claude Artifacts)
- Lucide React: `https://esm.sh/lucide-react`
- Tailwind CSS: via Artifacts CDN (inline styles used throughout for full control)

## Known limitations / future work
- No persistence — state resets on page reload
- Timer continues ticking if tab is hidden (browser throttles `setInterval` when backgrounded)
- `delivered` count on campaigns is static mock data — no real delivery simulation
- YouTube autoplay may be blocked by some browsers without prior user interaction
- Campaign titles include seed campaign count in numbering (e.g. first user campaign shows "My Video #3")
