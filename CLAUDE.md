# ASALO Logistic Dashboard — Claude Code Project

## Standing Instructions
- **After every change:** always commit and push to BOTH GitHub remotes automatically:
  ```bash
  git add <changed files>
  git commit -m "..."
  git push viewboost HEAD:main
  git push origin HEAD:main
  ```
- Also copy `viewboost.html` → `index.html` before pushing (Vercel serves index.html)
- Never wait for the user to ask — push is part of every task

## What this is
A fully interactive logistics operations dashboard for ASALO Logistic, built as a standalone browser app (React 18 + Babel, no build step). Originally designed in Claude Design, now maintained and extended through Claude Code.

## How to run
The preview server serves files from this directory:
- **Dashboard URL:** `http://localhost:3333/index.html`
- **Start server:** Defined in `.claude/launch.json` — use `preview_start("asalo-dashboard")` or run `npx serve -p 3333 .` manually
- The server ID from last session was `ddf929e8-6779-44ff-a73f-6fa3c7581dd7` (may change on restart)

## File structure

| File | Purpose |
|------|---------|
| `index.html` | Entry point — loads all JSX files via Babel, renders `<App />` directly (no design canvas) |
| `ASALO Logistic Dashboard.html` | Original Claude Design file — keeps the DesignCanvas/artboard wrapper, keep for reference |
| `app.jsx` | Root component — orchestrates all screens, state, toasts, SMS composer, tweaks panel |
| `shell.jsx` | `Sidebar` + `Topbar` components, NAV config |
| `orders.jsx` | Orders screen, order drawer, SMS composer, **New Order modal**, **Filters panel**, **XLSX export** |
| `screens.jsx` | All other screens: Tracking, Fleet, Notifications, Customers, Billing, Analytics, API, Settings, MobileDriver |
| `data.jsx` | All mock data: ORDERS, DRIVERS, SMS_LOG, CUSTOMERS, ORDER_STATUSES, SMS_TEMPLATES, CARGO_TYPES |
| `primitives.jsx` | Shared components: `Icon`, `Sparkline`, `StatusPill`, `CargoIcon` |
| `tweaks-panel.jsx` | Live tweaks UI (accent hue, density, theme) |
| `design-canvas.jsx` | Claude Design canvas infrastructure — only used by the original HTML file |
| `styles.css` | All CSS — variables, themes, layout, components |

## External scripts loaded in index.html
- React 18.3.1 (UMD)
- ReactDOM 18.3.1 (UMD)
- Babel Standalone 7.29.0 (transpiles JSX in browser)
- SheetJS / xlsx (for XLSX export — loaded from unpkg)

## Screens & navigation

| Nav key | Screen | Notes |
|---------|--------|-------|
| `orders` | Orders | Default view. KPI cards, filterable table, order drawer |
| `tracking` | Live Tracking | Faux Australia map with truck positions, active shipment panel |
| `fleet` | Fleet & Drivers | Driver table with status, load, hours of service |
| `notifications` | SMS & Notifications | SMS log table, templates panel, KPIs |
| `customers` | Customers | Customer accounts table |
| `billing` | Billing | Invoice table with paid/open/overdue status |
| `analytics` | Analytics | Revenue KPIs, stacked bar chart, top routes |
| `api` | API & Integrations | TransVirtual + SMS gateway credential cards, webhook log |
| `settings` | Settings | Appearance, users & access, roles & permissions, security toggles |

## Orders screen — active features

### New Order button
- Opens `NewOrderModal` with sections: Customer, Route, Cargo, Scheduling
- Fields: company name*, contact name, phone, origin*, destination*, distance, cargo type, weight, items, temperature (Cold chain only), ETA, value, priority
- On save: prepends new order to state, fires toast, auto-assigns next ASL-XXXXX ID
- Required fields: company name, origin, destination

### Export button
- Uses SheetJS (`window.XLSX`) to export currently **filtered** orders to `.xlsx`
- File name: `ASALO-Orders-YYYY-MM-DD.xlsx`
- Columns: Ref, Customer, Contact, Phone, Origin, Destination, Distance, Cargo, Weight, Items, Status, Priority, ETA, Value, Placed, Temperature, Note, Driver
- Fires a toast on success

### Filters button
- Toggles a `FiltersPanel` below the toolbar
- Filter options: Customer (dropdown), Priority (All/High/Normal), Min weight (kg), Max weight (kg)
- Active filters shown as dismissible chips below the toolbar
- Filter count badge shown on the Filters button when active
- Stacks on top of the existing status tab + cargo tab filters

## Data model — Order object
```js
{
  id: "ASL-24871",          // string, format ASL-NNNNN
  customer: "...",           // company name
  contactName: "...",        // contact person
  contact: "+61 4...",       // phone
  cargo: "Cold chain",       // "Pallets" | "Parcels" | "Barrels" | "Cold chain"
  weight: "1,240 kg",        // string with unit
  items: 18,                 // number
  origin: "Melbourne DC",
  destination: "Adelaide — Hindmarsh",
  distance: "726 km",
  status: "new",             // see ORDER_STATUSES below
  placed: "12 min ago",
  eta: "Tomorrow 14:00",
  value: "$3,420",
  priority: "high" | "normal",
  temp: "−4°C",              // Cold chain only
  driver: "K. Daniels — Truck 14",  // in_transit only
  progress: 0.62,            // 0–1, in_transit only
  note: "...",               // optional
}
```

## Status flow
`new → processing → loaded → in_transit → delivered`

Statuses: `new`, `processing`, `loaded`, `in_transit`, `delivered`, `delayed`

Each status advance opens the SMS Composer modal which fires a templated SMS via TransVirtual gateway.

## Theme system
Controlled via tweaks panel (bottom-right ⚙ button):
- **Accent hue:** oklch color wheel, presets: 75 (gold/default), 30, 145, 200, 230, 290
- **Density:** comfortable | compact
- **Theme:** dark | dim | light | system

CSS variables on `<html>` — `data-theme` and `data-density` attributes drive the stylesheet.

## Completed work (session log)

### Session 1 — Apr 30 2026
- Converted Claude Design canvas → standalone `index.html` (renders `<App />` directly)
- Activated **New Order** button → full modal form with validation
- Activated **Export** button → real `.xlsx` download via SheetJS
- Activated **Filters** button → slide-down panel (customer, priority, weight range) with chip display and badge count
- Set up preview server via `.claude/launch.json` (npx serve on port 3333)

## Known / future tasks
- [ ] Connect to real TransVirtual API (credentials UI already built in API & Integrations screen)
- [ ] Wire up SMS gateway (UI built, needs real provider key)
- [ ] Make Orders data persistent (currently resets on page reload — mock data in `data.jsx`)
- [ ] Mobile driver companion view (`MobileDriver` component exists in `screens.jsx`, accessible via original HTML file)
- [ ] Search bar in topbar is rendered but not wired to filter orders
- [ ] Date range filter in Filters panel
- [ ] Pagination or virtual scroll for large order lists
