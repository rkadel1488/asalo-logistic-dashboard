// Mock data for ASALO Logistic dashboard

const ORDER_STATUSES = [
  { key: "new", label: "New", color: "oklch(0.72 0.14 230)" },
  { key: "processing", label: "Processing", color: "oklch(0.78 0.16 75)" },
  { key: "loaded", label: "Loaded", color: "oklch(0.74 0.13 290)" },
  { key: "in_transit", label: "In Transit", color: "oklch(0.76 0.14 200)" },
  { key: "delivered", label: "Delivered", color: "oklch(0.74 0.14 145)" },
  { key: "delayed", label: "Delayed", color: "oklch(0.72 0.18 30)" },
];

const STATUS_FLOW = ["new", "processing", "loaded", "in_transit", "delivered"];

const SMS_TEMPLATES = {
  new: "Hi {name}, your ASALO order {ref} has been received. We'll update you as it moves. Track: asalo.co/t/{ref}",
  processing: "Hi {name}, your ASALO order {ref} is now being processed at our depot.",
  loaded: "Hi {name}, your ASALO order {ref} has been loaded for dispatch.",
  in_transit: "Hi {name}, your ASALO order {ref} is on the way. ETA {eta}. Driver: {driver}.",
  delivered: "Delivered. Your ASALO order {ref} arrived at {time}. Thank you for choosing ASALO.",
  delayed: "Heads up — your ASALO order {ref} is delayed. New ETA {eta}. Sorry for the inconvenience.",
  out_for_delivery: "Out for delivery. Your ASALO order {ref} arrives within ~{window}.",
};

const CARGO_TYPES = ["Pallets", "Parcels", "Barrels", "Cold chain"];

// ── ASA Logistics Wine Delivery Tariff (excl. GST) ──────────────────────────
// Carton tier indices: [1, 2, 3-5, 6-10, 11-20]
const WINE_PRICING = {
  "Adelaide Metro":  { commercial: [18, 32, 65, 120, 220],   residential: [20, 36, 75, 135, 245],   isMetro: true  },
  "Adelaide Hills":  { commercial: [25, 45, 105, 190, 350],  residential: [28, 50, 118, 215, 395]                  },
  "McLaren Vale":    { commercial: [28, 50, 118, 215, 395],  residential: [32, 57, 135, 245, 450]                  },
  "Barossa Valley":  { commercial: [35, 63, 149, 270, 495],  residential: [40, 72, 170, 308, 565]                  },
  "Tanunda":         { commercial: [35, 63, 149, 270, 495],  residential: [40, 72, 170, 308, 565]                  },
  "Nuriootpa":       { commercial: [36, 65, 154, 280, 515],  residential: [41, 74, 177, 321, 590]                  },
  "Angaston":        { commercial: [38, 68, 161, 295, 540],  residential: [43, 77, 185, 338, 620]                  },
  "Langhorne Creek": { commercial: [35, 63, 149, 270, 495],  residential: [40, 72, 170, 308, 565]                  },
  "Murray Bridge":   { commercial: [35, 63, 149, 270, 495],  residential: [40, 72, 170, 308, 565]                  },
  "Victor Harbor":   { commercial: [40, 72, 170, 310, 570],  residential: [46, 82, 194, 354, 650]                  },
  "Goolwa":          { commercial: [42, 76, 179, 325, 600],  residential: [48, 87, 205, 372, 685]                  },
  "Clare Valley":    { commercial: [50, 90, 213, 390, 715],  residential: [57, 102, 244, 446, 820]                 },
  "Yorke Peninsula": { commercial: [60, 108, 255, 470, 860], residential: [69, 124, 293, 540, 990]                 },
  "Riverland":       { commercial: [75, 135, 319, 590, 1080],residential: [86, 155, 367, 678, 1242]                },
  "Port Augusta":    { commercial: [95, 171, 404, 760, 1395],residential: [109, 196, 464, 873, 1604]               },
  "Mount Gambier":   { commercial: [110, 198, 468, 870, 1595],residential: [127, 228, 538, 1001, 1834]             },
  "Kangaroo Island": { quote: true },
  "Port Lincoln":    { quote: true },
  "Ceduna":          { quote: true },
  "Whyalla":         { quote: true },
};

const COLLECTION_FEES = {
  included:     0,
  cellar_door:  15,
  additional:   10,
  multi_winery: 60,
};

const ADDITIONAL_SERVICE_FEES = {
  same_day:         15,
  priority_express: 30,
  timed_delivery:   15,
  manual_unload:    15,
};

const PALLET_PRICING = {
  quarter:  { metro: 35, regional: 60  },
  half:     { metro: 50, regional: 80  },
  standard: { metro: 75, regional: 125 },
  double:   { metro: 130, regional: 220 },
};

function calculateWinePrice({ destination, qty, addressType, collectionType, additionalServices, metroKm }) {
  const zone = WINE_PRICING[destination];
  if (!zone) return null;
  if (zone.quote) return "Quote";
  const n = parseInt(qty) || 1;
  const tierIdx = n <= 1 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 10 ? 3 : 4;
  let price = (zone[addressType] || zone.commercial)[tierIdx];
  if (zone.isMetro && metroKm) {
    const km = parseFloat(metroKm) || 0;
    if (km > 80) price += km * 0.80;
    else if (km > 60) price += 25;
    else if (km > 40) price += 15;
    else if (km > 25) price += 8;
  }
  price += COLLECTION_FEES[collectionType] || 0;
  (additionalServices || []).forEach(s => { price += ADDITIONAL_SERVICE_FEES[s] || 0; });
  return price;
}

const ORDERS = [/*
  {
    id: "ASL-24871",
    customer: "Maridale Foods Pty",
    contact: "+61 4 8821 0034",
    contactName: "Renee P.",
    cargo: "Cold chain",
    weight: "1,240 kg",
    items: 18,
    origin: "Melbourne DC",
    destination: "Adelaide — Hindmarsh",
    distance: "726 km",
    status: "new",
    placed: "12 min ago",
    eta: "Tomorrow 14:00",
    value: "$3,420",
    priority: "high",
    temp: "−4°C",
  },
  {
    id: "ASL-24870",
    customer: "Northbridge Wines",
    contact: "+61 4 1188 2210",
    contactName: "Tom K.",
    cargo: "Pallets",
    weight: "2,800 kg",
    items: 12,
    origin: "Sydney Hub",
    destination: "Brisbane — Eagle Farm",
    distance: "915 km",
    status: "processing",
    placed: "38 min ago",
    eta: "Wed 09:30",
    value: "$5,180",
    priority: "normal",
  },
  {
    id: "ASL-24869",
    customer: "Bayer Industrial",
    contact: "+61 4 0099 4412",
    contactName: "Dispatch",
    cargo: "Barrels",
    weight: "4,150 kg",
    items: 24,
    origin: "Perth Yard",
    destination: "Kalgoorlie Site B",
    distance: "595 km",
    status: "loaded",
    placed: "1 h 12 m",
    eta: "Tonight 22:00",
    value: "$2,940",
    priority: "normal",
  },
  {
    id: "ASL-24868",
    customer: "Greenline Grocers",
    contact: "+61 4 5520 1188",
    contactName: "Alicia M.",
    cargo: "Parcels",
    weight: "180 kg",
    items: 64,
    origin: "Melbourne DC",
    destination: "Geelong West",
    distance: "78 km",
    status: "in_transit",
    placed: "2 h 04 m",
    eta: "Today 16:20",
    value: "$640",
    priority: "normal",
    driver: "K. Daniels — Truck 14",
    progress: 0.62,
  },
  {
    id: "ASL-24867",
    customer: "Coastal Seafoods",
    contact: "+61 4 7710 0921",
    contactName: "Renji P.",
    cargo: "Cold chain",
    weight: "920 kg",
    items: 40,
    origin: "Hobart Port",
    destination: "Launceston Market",
    distance: "200 km",
    status: "in_transit",
    placed: "3 h 41 m",
    eta: "Today 13:50",
    value: "$1,810",
    priority: "high",
    driver: "M. Okafor — Truck 07",
    progress: 0.84,
    temp: "−2°C",
  },
  {
    id: "ASL-24866",
    customer: "Apex Building Supply",
    contact: "+61 4 3322 5588",
    contactName: "Site office",
    cargo: "Pallets",
    weight: "6,200 kg",
    items: 9,
    origin: "Brisbane Hub",
    destination: "Toowoomba — East",
    distance: "127 km",
    status: "delayed",
    placed: "5 h 12 m",
    eta: "Today 18:30 (+2h)",
    value: "$1,260",
    priority: "high",
    note: "Traffic incident on M2",
  },
  {
    id: "ASL-24865",
    customer: "Bright Pharma",
    contact: "+61 4 8800 4221",
    contactName: "Ops",
    cargo: "Cold chain",
    weight: "340 kg",
    items: 22,
    origin: "Sydney Hub",
    destination: "Newcastle Med Centre",
    distance: "162 km",
    status: "delivered",
    placed: "Yesterday",
    eta: "Yesterday 15:10",
    value: "$2,260",
    priority: "normal",
    temp: "+2°C",
  },
  {
    id: "ASL-24864",
    customer: "Maridale Foods Pty",
    contact: "+61 4 8821 0034",
    contactName: "Renee P.",
    cargo: "Pallets",
    weight: "1,800 kg",
    items: 14,
    origin: "Melbourne DC",
    destination: "Bendigo Depot",
    distance: "151 km",
    status: "delivered",
    placed: "Yesterday",
    eta: "Yesterday 11:40",
    value: "$1,090",
    priority: "normal",
  },
*/];

const DRIVERS = [];

const SMS_LOG = [];

const CUSTOMERS = [];

Object.assign(window, {
  ORDER_STATUSES,
  STATUS_FLOW,
  SMS_TEMPLATES,
  CARGO_TYPES,
  ORDERS,
  DRIVERS,
  SMS_LOG,
  CUSTOMERS,
  WINE_PRICING,
  COLLECTION_FEES,
  ADDITIONAL_SERVICE_FEES,
  PALLET_PRICING,
  calculateWinePrice,
});
