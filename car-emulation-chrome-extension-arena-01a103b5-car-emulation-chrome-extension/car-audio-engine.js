import { ImmersiveAudio } from "./immersive-audio.js";

/*
 * CarAudio Engine
 * ---------------
 * Web Audio DSP chain for car-cabin, consumer-device, studio-monitor,
 * smart-speaker, and retail-space translation simulations.
 */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const PRESETS = {
  // --- CAR CABIN EMULATIONS ---
  sedan: {
    name: "Family sedan",
    category: "car",
    desc: "Mid-size cabin with a decent 6-speaker factory system.",
    hp: 60, lp: 11000, sub: 0,
    door: { f: 95, g: 4, q: 1.1 },
    mid: { f: 380, g: -3.5, q: 0.9 },
    pres: { f: 3000, g: 1.5, q: 1.4 },
    bassTilt: 1, trebleTilt: -1,
    sat: 0.35, asym: 0.03,
    comp: { thr: -20, ratio: 3 },
    ir: { type: "cabin", size: 1.0, rt60: 0.1, damp: 3500, er: 0.6, tail: 0.3 },
    irMix: 1.0, rattle: 0.4, out: 1.0, isolation: 1.0, balance: 1,
    mono: false, crossfeed: false,
  },
  hatchback: {
    name: "Compact hatchback",
    category: "car",
    desc: "Small cabin, stock paper-cone door speakers. Boxy and a bit boomy.",
    hp: 75, lp: 8500, sub: 0,
    door: { f: 115, g: 5, q: 1.1 },
    mid: { f: 420, g: -4.5, q: 0.9 },
    pres: { f: 2600, g: 2.5, q: 1.4 },
    bassTilt: 0, trebleTilt: -2,
    sat: 0.55, asym: 0.08,
    comp: { thr: -22, ratio: 3.5 },
    ir: { type: "cabin", size: 0.75, rt60: 0.085, damp: 3000, er: 0.7, tail: 0.32 },
    irMix: 1.0, rattle: 0.7, out: 1.0, isolation: 1.3, balance: 1,
    mono: false, crossfeed: false,
  },
  suv: {
    name: "SUV / crossover",
    category: "car",
    desc: "Big airy cabin: more boom and a longer, darker reflection tail.",
    hp: 55, lp: 10000, sub: 0,
    door: { f: 80, g: 4.5, q: 1.0 },
    mid: { f: 330, g: -3, q: 0.8 },
    pres: { f: 2800, g: 1.5, q: 1.3 },
    bassTilt: 1.5, trebleTilt: -1.5,
    sat: 0.35, asym: 0.03,
    comp: { thr: -20, ratio: 3 },
    ir: { type: "cabin", size: 1.35, rt60: 0.14, damp: 3000, er: 0.6, tail: 0.34 },
    irMix: 1.1, rattle: 0.45, out: 1.0, isolation: 1.1, balance: 1,
    mono: false, crossfeed: false,
  },
  luxury: {
    name: "Luxury sedan",
    category: "car",
    desc: "Tuned premium system in a quiet cabin. Tight bass, sparkly top end.",
    hp: 38, lp: 16000, sub: 3,
    door: { f: 70, g: 2.5, q: 0.9 },
    mid: { f: 300, g: -1.5, q: 0.8 },
    pres: { f: 4000, g: 1, q: 1.2 },
    bassTilt: 2, trebleTilt: 1,
    sat: 0.12, asym: 0,
    comp: { thr: -24, ratio: 2.5 },
    ir: { type: "cabin", size: 1.1, rt60: 0.09, damp: 5000, er: 0.45, tail: 0.22 },
    irMix: 0.8, rattle: 0.05, out: 1.0, isolation: 0.45, balance: 1,
    mono: false, crossfeed: false,
  },
  beater: {
    name: "Old beater",
    category: "car",
    desc: "Blown speaker, one channel half dead, door panel buzzing along.",
    hp: 110, lp: 5000, sub: 0,
    door: { f: 160, g: 6, q: 1.4 },
    mid: { f: 600, g: -6, q: 0.8 },
    pres: { f: 2200, g: 4, q: 1.2 },
    bassTilt: -2, trebleTilt: -5,
    sat: 1.0, asym: 0.25,
    comp: { thr: -16, ratio: 5 },
    ir: { type: "cabin", size: 0.8, rt60: 0.09, damp: 2500, er: 0.75, tail: 0.3 },
    irMix: 1.0, rattle: 1.2, out: 1.0, isolation: 1.9, balance: 0.35,
    mono: false, crossfeed: false,
  },
  basshead: {
    name: "Trunk subwoofer",
    category: "car",
    desc: '12" sub in the boot, trunk resonance, every panel rattling.',
    hp: 28, lp: 12000, sub: 9,
    door: { f: 50, g: 6, q: 1.1 },
    mid: { f: 350, g: -3, q: 0.9 },
    pres: { f: 3000, g: 1, q: 1.4 },
    bassTilt: 4, trebleTilt: 0,
    sat: 0.5, asym: 0.05,
    comp: { thr: -18, ratio: 4 },
    ir: { type: "cabin", size: 1.2, rt60: 0.16, damp: 2500, er: 0.6, tail: 0.4 },
    irMix: 1.1, rattle: 1.6, out: 0.9, isolation: 1.0, balance: 1,
    mono: false, crossfeed: false,
  },
  outside: {
    name: "Standing outside the car",
    category: "car",
    desc: "Windows up, heard from the sidewalk. Just thump and mumble.",
    hp: 35, lp: 520, sub: 4,
    door: { f: 70, g: 5, q: 0.9 },
    mid: { f: 250, g: -2, q: 1 },
    pres: { f: 1200, g: -6, q: 1 },
    bassTilt: 3, trebleTilt: -12,
    sat: 0.4, asym: 0.05,
    comp: { thr: -18, ratio: 4 },
    ir: { type: "cabin", size: 2.2, rt60: 0.5, damp: 900, er: 0.5, tail: 0.5 },
    irMix: 1.3, rattle: 1.0, out: 0.85, isolation: 0.7, balance: 1,
    mono: false, crossfeed: false,
    visual: false,
  },

  // --- COMMON UK BMW & MERCEDES CABIN TARGETS ---
  // These are body-style / factory-system-informed translation targets for the
  // common right-hand-drive UK variants. Optional Harman Kardon, Burmester and
  // aftermarket systems will naturally vary from these useful baseline profiles.
  bmw_1_series: {
    name: "BMW 1 Series (F40)",
    category: "car",
    brand: "bmw",
    desc: "UK right-hand-drive compact hatchback: close, taut cabin reflections, controlled factory-system bass, and a lightly forward driver-focused presentation.",
    hp: 52, lp: 15800, sub: 0.9,
    door: { f: 96, g: 3.6, q: 1.05 },
    mid: { f: 405, g: -2.7, q: 0.95 },
    pres: { f: 3050, g: 1.45, q: 1.35 },
    pres2: { f: 8200, g: 0.45, q: 1.7 },
    bassTilt: 0.75, trebleTilt: 0.35,
    sat: 0.18, asym: 0.01,
    comp: { thr: -22, ratio: 2.8, attack: 0.012, release: 0.22 },
    ir: { type: "cabin", size: 0.88, rt60: 0.09, damp: 4400, er: 0.54, tail: 0.25 },
    irMix: 0.88, rattle: 0.18, out: 0.98, isolation: 0.62, balance: 1,
    mono: false, crossfeed: false, seat: "driver",
    visual: {
      brand: "BMW", model: "1 Series", generation: "F40", body: "compact hatchback",
      acoustic: "compact, well-damped cabin / factory HiFi baseline",
      interior: "black sport seats · aluminium trim · blue cabin light",
      cockpit: "driver-focused digital cockpit", panorama: "assets/bmw-cabin-panorama.jpg", accent: "#5fa8ff",
    },
  },
  bmw_3_series: {
    name: "BMW 3 Series (G20)",
    category: "car",
    brand: "bmw",
    desc: "UK right-hand-drive sports saloon: balanced front-stage imaging, firm mid-bass from the cabin, and restrained road intrusion at motorway speed.",
    hp: 44, lp: 16600, sub: 1.9,
    door: { f: 78, g: 3.1, q: 0.98 },
    mid: { f: 350, g: -2.05, q: 0.86 },
    pres: { f: 3200, g: 1.35, q: 1.3 },
    pres2: { f: 9200, g: 0.65, q: 1.65 },
    bassTilt: 1.15, trebleTilt: 0.55,
    sat: 0.11, asym: 0.005,
    comp: { thr: -23, ratio: 2.5, attack: 0.014, release: 0.24 },
    ir: { type: "cabin", size: 1.03, rt60: 0.092, damp: 5000, er: 0.48, tail: 0.22 },
    irMix: 0.79, rattle: 0.1, out: 1.0, isolation: 0.45, balance: 1,
    mono: false, crossfeed: false, seat: "driver",
    visual: {
      brand: "BMW", model: "3 Series", generation: "G20", body: "sports saloon",
      acoustic: "balanced saloon cabin / factory HiFi baseline",
      interior: "black Vernasca-style leather · aluminium trim · blue cabin light",
      cockpit: "driver-focused iDrive-style cockpit", panorama: "assets/bmw-cabin-panorama.jpg", accent: "#5fa8ff",
    },
  },
  bmw_5_series: {
    name: "BMW 5 Series (G30)",
    category: "car",
    brand: "bmw",
    desc: "UK right-hand-drive executive saloon: quiet long-wheelbase cabin, low-shelf authority, clean high-frequency extension, and a longer but controlled reflection tail.",
    hp: 38, lp: 17700, sub: 2.7,
    door: { f: 68, g: 2.55, q: 0.9 },
    mid: { f: 305, g: -1.55, q: 0.8 },
    pres: { f: 3500, g: 1.05, q: 1.2 },
    pres2: { f: 10000, g: 0.8, q: 1.55 },
    bassTilt: 1.7, trebleTilt: 0.85,
    sat: 0.065, asym: 0,
    comp: { thr: -24, ratio: 2.25, attack: 0.016, release: 0.26 },
    ir: { type: "cabin", size: 1.18, rt60: 0.105, damp: 5600, er: 0.42, tail: 0.2 },
    irMix: 0.72, rattle: 0.055, out: 1.0, isolation: 0.3, balance: 1,
    mono: false, crossfeed: false, seat: "driver",
    visual: {
      brand: "BMW", model: "5 Series", generation: "G30", body: "executive saloon",
      acoustic: "quiet executive cabin / extended factory-system baseline",
      interior: "dark leather · brushed aluminium · blue cabin light",
      cockpit: "wide driver-focused executive cockpit", panorama: "assets/bmw-cabin-panorama.jpg", accent: "#5fa8ff",
    },
  },
  bmw_x1: {
    name: "BMW X1 (U11)",
    category: "car",
    brand: "bmw",
    desc: "UK right-hand-drive compact SUV: higher roof and glass area bring a little more boom and cabin wash than the 1 Series, while retaining BMW-style focused voicing.",
    hp: 49, lp: 14900, sub: 1.25,
    door: { f: 84, g: 4.0, q: 1.0 },
    mid: { f: 345, g: -2.7, q: 0.84 },
    pres: { f: 2920, g: 1.25, q: 1.24 },
    pres2: { f: 7800, g: 0.2, q: 1.65 },
    bassTilt: 1.0, trebleTilt: -0.1,
    sat: 0.15, asym: 0.01,
    comp: { thr: -22, ratio: 2.9, attack: 0.013, release: 0.24 },
    ir: { type: "cabin", size: 1.12, rt60: 0.125, damp: 3900, er: 0.55, tail: 0.29 },
    irMix: 0.98, rattle: 0.17, out: 0.99, isolation: 0.7, balance: 1,
    mono: false, crossfeed: false, seat: "driver",
    visual: {
      brand: "BMW", model: "X1", generation: "U11", body: "compact SUV",
      acoustic: "taller compact cabin / factory HiFi baseline",
      interior: "black sport seats · dark trim · blue cabin light",
      cockpit: "high-set driver-focused cockpit", panorama: "assets/bmw-cabin-panorama.jpg", accent: "#5fa8ff",
    },
  },
  bmw_x3: {
    name: "BMW X3 (G01)",
    category: "car",
    brand: "bmw",
    desc: "UK right-hand-drive mid-size SUV: larger enclosed volume, fuller low mids, a darker high roof reflection, and composed motorway isolation.",
    hp: 43, lp: 15200, sub: 1.65,
    door: { f: 74, g: 3.75, q: 0.95 },
    mid: { f: 315, g: -2.3, q: 0.8 },
    pres: { f: 2870, g: 1.05, q: 1.2 },
    pres2: { f: 7200, g: -0.25, q: 1.6 },
    bassTilt: 1.35, trebleTilt: -0.35,
    sat: 0.12, asym: 0.006,
    comp: { thr: -22, ratio: 2.8, attack: 0.014, release: 0.26 },
    ir: { type: "cabin", size: 1.28, rt60: 0.14, damp: 3550, er: 0.53, tail: 0.32 },
    irMix: 1.06, rattle: 0.14, out: 0.99, isolation: 0.72, balance: 1,
    mono: false, crossfeed: false, seat: "driver",
    visual: {
      brand: "BMW", model: "X3", generation: "G01", body: "mid-size SUV",
      acoustic: "larger quiet cabin / factory HiFi baseline",
      interior: "black leather · metallic trim · blue cabin light",
      cockpit: "upright driver-focused cockpit", panorama: "assets/bmw-cabin-panorama.jpg", accent: "#5fa8ff",
    },
  },

  mercedes_a_class: {
    name: "Mercedes-Benz A-Class (W177)",
    category: "car",
    brand: "mercedes",
    desc: "UK right-hand-drive premium hatchback: compact cabin, clear upper-mid detail, a little more reflective glass than a 1 Series, and a polished factory-system contour.",
    hp: 55, lp: 15100, sub: 0.8,
    door: { f: 102, g: 3.25, q: 1.08 },
    mid: { f: 435, g: -2.4, q: 0.94 },
    pres: { f: 2820, g: 1.85, q: 1.42 },
    pres2: { f: 7800, g: 0.55, q: 1.7 },
    bassTilt: 0.45, trebleTilt: 0.45,
    sat: 0.17, asym: 0.01,
    comp: { thr: -22, ratio: 2.9, attack: 0.012, release: 0.22 },
    ir: { type: "cabin", size: 0.9, rt60: 0.1, damp: 4250, er: 0.58, tail: 0.27 },
    irMix: 0.9, rattle: 0.16, out: 0.98, isolation: 0.64, balance: 1,
    mono: false, crossfeed: false, seat: "driver",
    visual: {
      brand: "Mercedes-Benz", model: "A-Class", generation: "W177", body: "premium hatchback",
      acoustic: "compact glass-rich cabin / factory audio baseline",
      interior: "black and cream trim · turbine vents · turquoise ambient light",
      cockpit: "wide-screen luxury cockpit", panorama: "assets/mercedes-cabin-panorama.jpg", accent: "#57e0d0",
    },
  },
  mercedes_c_class: {
    name: "Mercedes-Benz C-Class (W206)",
    category: "car",
    brand: "mercedes",
    desc: "UK right-hand-drive compact executive saloon: a smooth, quiet front stage with warm low mids, glossy cabin reflections, and soft high-frequency damping.",
    hp: 43, lp: 16400, sub: 1.95,
    door: { f: 76, g: 2.8, q: 0.95 },
    mid: { f: 335, g: -1.8, q: 0.82 },
    pres: { f: 3040, g: 1.5, q: 1.28 },
    pres2: { f: 8700, g: 0.45, q: 1.62 },
    bassTilt: 1.35, trebleTilt: 0.3,
    sat: 0.09, asym: 0.004,
    comp: { thr: -23, ratio: 2.45, attack: 0.014, release: 0.25 },
    ir: { type: "cabin", size: 1.04, rt60: 0.1, damp: 4800, er: 0.49, tail: 0.23 },
    irMix: 0.78, rattle: 0.085, out: 1.0, isolation: 0.42, balance: 1,
    mono: false, crossfeed: false, seat: "driver",
    visual: {
      brand: "Mercedes-Benz", model: "C-Class", generation: "W206", body: "compact executive saloon",
      acoustic: "refined saloon cabin / factory audio baseline",
      interior: "cream leather · open-pore wood · turquoise ambient light",
      cockpit: "sweeping digital luxury cockpit", panorama: "assets/mercedes-cabin-panorama.jpg", accent: "#57e0d0",
    },
  },
  mercedes_e_class: {
    name: "Mercedes-Benz E-Class (W213)",
    category: "car",
    brand: "mercedes",
    desc: "UK right-hand-drive executive saloon: large low-noise cabin, full but composed bass, smooth presentation, and a deeper luxury-car room response.",
    hp: 36, lp: 17500, sub: 2.85,
    door: { f: 66, g: 2.25, q: 0.86 },
    mid: { f: 290, g: -1.35, q: 0.76 },
    pres: { f: 3260, g: 1.0, q: 1.15 },
    pres2: { f: 9600, g: 0.6, q: 1.5 },
    bassTilt: 1.85, trebleTilt: 0.55,
    sat: 0.055, asym: 0,
    comp: { thr: -24, ratio: 2.2, attack: 0.017, release: 0.28 },
    ir: { type: "cabin", size: 1.2, rt60: 0.115, damp: 5400, er: 0.43, tail: 0.21 },
    irMix: 0.7, rattle: 0.045, out: 1.0, isolation: 0.27, balance: 1,
    mono: false, crossfeed: false, seat: "driver",
    visual: {
      brand: "Mercedes-Benz", model: "E-Class", generation: "W213", body: "executive saloon",
      acoustic: "large low-noise cabin / factory audio baseline",
      interior: "cream leather · wood veneer · turquoise ambient light",
      cockpit: "long-wheelbase luxury cockpit", panorama: "assets/mercedes-cabin-panorama.jpg", accent: "#57e0d0",
    },
  },
  mercedes_gla: {
    name: "Mercedes-Benz GLA (H247)",
    category: "car",
    brand: "mercedes",
    desc: "UK right-hand-drive compact SUV: a slightly elevated, airy cabin with controlled low-end lift, close early reflections, and modern Mercedes-style clarity.",
    hp: 51, lp: 14500, sub: 1.05,
    door: { f: 88, g: 3.9, q: 1.02 },
    mid: { f: 365, g: -2.5, q: 0.85 },
    pres: { f: 2740, g: 1.65, q: 1.3 },
    pres2: { f: 7300, g: 0.15, q: 1.65 },
    bassTilt: 0.9, trebleTilt: -0.05,
    sat: 0.14, asym: 0.008,
    comp: { thr: -22, ratio: 2.9, attack: 0.013, release: 0.24 },
    ir: { type: "cabin", size: 1.08, rt60: 0.128, damp: 3850, er: 0.56, tail: 0.3 },
    irMix: 1.0, rattle: 0.16, out: 0.99, isolation: 0.72, balance: 1,
    mono: false, crossfeed: false, seat: "driver",
    visual: {
      brand: "Mercedes-Benz", model: "GLA", generation: "H247", body: "compact SUV",
      acoustic: "elevated compact cabin / factory audio baseline",
      interior: "black-and-cream trim · turbine vents · turquoise ambient light",
      cockpit: "high-set wide-screen cockpit", panorama: "assets/mercedes-cabin-panorama.jpg", accent: "#57e0d0",
    },
  },
  mercedes_glc: {
    name: "Mercedes-Benz GLC (X253)",
    category: "car",
    brand: "mercedes",
    desc: "UK right-hand-drive mid-size SUV: generous cabin volume, broad low-mid body, softened upper treble from the taller interior, and a relaxed motorway ambience profile.",
    hp: 44, lp: 15000, sub: 1.75,
    door: { f: 76, g: 3.55, q: 0.95 },
    mid: { f: 320, g: -2.15, q: 0.8 },
    pres: { f: 2680, g: 1.35, q: 1.22 },
    pres2: { f: 6800, g: -0.25, q: 1.6 },
    bassTilt: 1.25, trebleTilt: -0.45,
    sat: 0.115, asym: 0.006,
    comp: { thr: -22, ratio: 2.8, attack: 0.014, release: 0.26 },
    ir: { type: "cabin", size: 1.27, rt60: 0.142, damp: 3450, er: 0.54, tail: 0.33 },
    irMix: 1.08, rattle: 0.13, out: 0.99, isolation: 0.75, balance: 1,
    mono: false, crossfeed: false, seat: "driver",
    visual: {
      brand: "Mercedes-Benz", model: "GLC", generation: "X253", body: "mid-size SUV",
      acoustic: "large relaxed cabin / factory audio baseline",
      interior: "cream leather · dark wood · turquoise ambient light",
      cockpit: "upright luxury cockpit", panorama: "assets/mercedes-cabin-panorama.jpg", accent: "#57e0d0",
    },
  },

  // --- ULTRA-LUXURY & HYPERCAR CABIN TARGETS ---
  rolls_royce_phantom: {
    name: "Rolls-Royce Phantom (Starlight)",
    category: "car",
    brand: "rolls-royce",
    segment: "exotic",
    desc: "UK right-hand-drive ultra-luxury limousine: exceptionally quiet long-wheelbase cabin, effortless sub-bass, soft reflective upholstery, and a Starlight Headliner visual companion.",
    hp: 26, lp: 19000, sub: 4.1, subF: 52, subQ: 0.78,
    door: { f: 60, g: 2.15, q: 0.85 },
    mid: { f: 270, g: -1.05, q: 0.74 },
    pres: { f: 2950, g: 0.45, q: 1.12 },
    pres2: { f: 10200, g: 0.55, q: 1.4 },
    bassTilt: 2.7, trebleTilt: 1.1,
    sat: 0.02, asym: 0,
    comp: { thr: -26, ratio: 1.7, attack: 0.022, release: 0.34 },
    ir: { type: "cabin", size: 1.58, rt60: 0.13, damp: 7200, er: 0.31, tail: 0.15 },
    irMix: 0.5, rattle: 0.01, out: 1.0, isolation: 0.12, balance: 1,
    mono: false, crossfeed: false, seat: "driver",
    visual: {
      brand: "Rolls-Royce", model: "Phantom", generation: "Starlight", body: "ultra-luxury limousine",
      acoustic: "exceptionally quiet long-wheelbase cabin / bespoke-audio baseline",
      interior: "navy leather · polished wood · fibre-optic Starlight Headliner",
      cockpit: "hand-finished chauffeur-luxury cockpit", panorama: "assets/rolls-royce-starlight-panorama.jpg",
      accent: "#f6d487", seatLayout: "lounge", starlight: true,
    },
  },
  koenigsegg_ccx: {
    name: "Koenigsegg CCX",
    category: "car",
    brand: "koenigsegg",
    segment: "exotic",
    desc: "UK right-hand-drive carbon-fibre hypercar target: tiny, raw two-seat cockpit, hard early reflections, exposed midrange, and pronounced engine/road intrusion.",
    hp: 62, lp: 14200, sub: 0.85,
    door: { f: 118, g: 4.4, q: 1.2 },
    mid: { f: 560, g: -3.35, q: 0.9 },
    pres: { f: 3370, g: 2.55, q: 1.45 },
    pres2: { f: 8200, g: 1.25, q: 1.75 },
    bassTilt: 0.25, trebleTilt: 1.15,
    sat: 0.48, asym: 0.04,
    comp: { thr: -18, ratio: 4.2, attack: 0.008, release: 0.16 },
    ir: { type: "cabin", size: 0.62, rt60: 0.068, damp: 4700, er: 0.68, tail: 0.2 },
    irMix: 0.82, rattle: 0.58, out: 0.94, isolation: 1.85, balance: 1,
    mono: false, crossfeed: false, seat: "driver",
    visual: {
      brand: "Koenigsegg", model: "CCX", generation: "carbon-fibre cockpit", body: "two-seat hypercar",
      acoustic: "compact carbon tub / raw lightweight-system baseline",
      interior: "exposed carbon fibre · tan buckets · machined aluminium",
      cockpit: "low-slung analogue hypercar cockpit", panorama: "assets/koenigsegg-ccx-panorama.jpg",
      accent: "#d39b62", seatLayout: "two-seat",
    },
  },
  bugatti_chiron: {
    name: "Bugatti Chiron",
    category: "car",
    brand: "bugatti",
    segment: "exotic",
    desc: "UK right-hand-drive W16 hyper grand tourer: compact but heavily insulated cabin, authoritative low end, jewel-like upper detail, and calmer road noise than a track-focused hypercar.",
    hp: 34, lp: 18500, sub: 3.65, subF: 55, subQ: 0.8,
    door: { f: 64, g: 2.55, q: 0.88 },
    mid: { f: 315, g: -1.45, q: 0.78 },
    pres: { f: 3220, g: 1.15, q: 1.2 },
    pres2: { f: 9800, g: 0.95, q: 1.48 },
    bassTilt: 2.1, trebleTilt: 0.9,
    sat: 0.07, asym: 0.004,
    comp: { thr: -24, ratio: 2.15, attack: 0.017, release: 0.26 },
    ir: { type: "cabin", size: 0.98, rt60: 0.082, damp: 6500, er: 0.4, tail: 0.16 },
    irMix: 0.6, rattle: 0.035, out: 0.99, isolation: 0.32, balance: 1,
    mono: false, crossfeed: false, seat: "driver",
    visual: {
      brand: "Bugatti", model: "Chiron", generation: "W16", body: "two-seat hyper grand tourer",
      acoustic: "insulated hyper-GT cockpit / premium-system baseline",
      interior: "deep-blue leather · blue carbon fibre · machined aluminium",
      cockpit: "sculptural centre-spine W16 cockpit", panorama: "assets/bugatti-chiron-panorama.jpg",
      accent: "#5eabff", seatLayout: "two-seat",
    },
  },

  // --- YAMAHA NS-10M NEARFIELD MONITORS ---
  ns10: {
    name: "Yamaha NS-10M",
    category: "studio",
    desc: "Classic sealed nearfields: restrained low end, exposed upper mids, and fast transient detail for a no-forgiveness translation check.",
    hp: 62, lp: 18500, sub: -1.5, subF: 90, subQ: 0.9,
    door: { f: 135, g: 1.2, q: 1.0 }, // compact sealed-box warmth
    mid: { f: 620, g: -1.2, q: 0.9 },
    pres: { f: 2050, g: 3.0, q: 1.25 }, // characteristic forward vocal / snare region
    pres2: { f: 7200, g: 1.5, q: 1.9 },
    bassTilt: -2.0, trebleTilt: 0.8,
    sat: 0.05, asym: 0,
    comp: { thr: -2, ratio: 1.0 },
    ir: { type: "nearfield", size: 0.8, rt60: 0.14, damp: 7500, er: 0.38, tail: 0.12 },
    irMix: 0.24, rattle: 0, out: 0.9, isolation: 0, balance: 1,
    mono: false,
    crossfeed: false,
    noEngine: true,
    seat: "center",
    badge: {
      title: "🎛️ Yamaha NS-10M emulation:",
      text: "A practical nearfield translation check with lean bass and an intentionally revealing midrange. This is an acoustic approximation, not a calibrated replacement for physical monitors.",
    },
    seatNotice: "ℹ️ Nearfield monitor position: centered stereo pair with short control-room reflections.",
    environmentNotice: "ℹ️ Vehicle engine & road rumble muted for nearfield monitoring.",
  },

  // --- IPHONE BUILT-IN SPEAKER ---
  iphone: {
    name: "iPhone speaker (modern)",
    category: "phone",
    desc: "A modern iPhone-style built-in speaker: near-mono playback, little true bass, a vocal-forward upper midrange, and protective loudness limiting.",
    hp: 175, lp: 14500, sub: -4.5, subF: 210, subQ: 1.0,
    door: { f: 700, g: 2.4, q: 1.45 }, // small enclosure / hand-held body resonance
    mid: { f: 1450, g: -1.4, q: 1.0 },
    pres: { f: 3350, g: 4.1, q: 1.75 }, // speech and transient projection
    pres2: { f: 7600, g: 2.0, q: 2.0 },
    bassTilt: -5.5, trebleTilt: -1.6,
    sat: 0.42, asym: 0.025,
    comp: { thr: -24, ratio: 7.0, attack: 0.004, release: 0.11 },
    ir: { type: "phone", size: 0.24, rt60: 0.035, damp: 8800, er: 0.3, tail: 0.055 },
    irMix: 0.18, rattle: 0.03, out: 0.82, isolation: 0, balance: 1,
    mono: true,
    crossfeed: false,
    noEngine: true,
    seat: "center",
    badge: {
      title: "📱 iPhone speaker emulation:",
      text: "Sums close-together phone drivers to near-mono, removes sub-bass, and adds the midrange focus and limiter behaviour useful for checking a phone playback translation.",
    },
    seatNotice: "ℹ️ Handheld phone speaker: compact, centered, near-mono playback.",
    environmentNotice: "ℹ️ Vehicle engine & road rumble muted for phone-speaker monitoring.",
  },

  // --- BOOTS-STYLE RETAIL SHOP / IN-STORE MUSIC ---
  boots_shop: {
    name: "Boots shop (in-store music)",
    category: "space",
    segment: "public",
    desc: "Music heard from distributed ceiling speakers in a Boots-style pharmacy: bass-limited, mostly mono, gently compressed, and washed into a reflective retail floor.",
    hp: 118, lp: 9800, sub: -2.0, subF: 150, subQ: 0.9,
    door: { f: 190, g: 1.8, q: 1.25 }, // ceiling-speaker / plenum resonance
    mid: { f: 620, g: -1.6, q: 0.9 },
    pres: { f: 2550, g: 2.5, q: 1.35 }, // intelligibility-focused public-address voicing
    pres2: { f: 6500, g: -2.0, q: 1.7 },
    bassTilt: -2.8, trebleTilt: -2.0,
    sat: 0.12, asym: 0.01,
    comp: { thr: -25, ratio: 4.5, attack: 0.02, release: 0.28 },
    ir: { type: "retail", size: 2.7, rt60: 0.36, damp: 3600, er: 0.68, tail: 0.27 },
    irMix: 1.15, rattle: 0, out: 0.88, isolation: 0, balance: 1,
    mono: true,
    crossfeed: false,
    noEngine: true,
    seat: "center",
    ambienceProfile: "retail",
    ambienceTitle: "Shop Ambience",
    ambienceLabel: "Store ambience",
    badge: {
      title: "🛍️ Boots shop in-store music:",
      text: "Treats the selected tab or cable input as music playing over a distributed ceiling system, with retail-room reflections. It is an independent Boots-style approximation, not an official Boots profile.",
    },
    seatNotice: "ℹ️ Distributed ceiling speakers: centered mono program with room wash rather than a close stereo pair.",
    environmentNotice: "ℹ️ Vehicle noise is disabled. Use Store ambience to blend a subtle indoor retail bed under the music.",
  },

  // --- CLUB / DANCEFLOOR TRANSLATION ---
  nightclub: {
    name: "Nightclub dancefloor",
    category: "space",
    segment: "venue",
    desc: "Front-of-dancefloor club system: deep sub pressure, firm limiting, dense room wash, and an optional low crowd / venue bed beneath the selected music.",
    hp: 28, lp: 15200, sub: 8.2, subF: 48, subQ: 1.05,
    door: { f: 74, g: 5.6, q: 1.3 }, // horn / enclosure punch
    mid: { f: 430, g: -2.8, q: 0.9 },
    pres: { f: 2850, g: 2.5, q: 1.3 },
    pres2: { f: 7800, g: -0.9, q: 1.6 },
    bassTilt: 4.8, trebleTilt: -0.65,
    sat: 0.34, asym: 0.025,
    comp: { thr: -19, ratio: 6.0, attack: 0.006, release: 0.19 },
    ir: { type: "club", size: 2.8, rt60: 0.48, damp: 2800, er: 0.48, tail: 0.34 },
    irMix: 1.2, rattle: 0.5, out: 0.9, isolation: 0, balance: 1,
    mono: false,
    crossfeed: false,
    noEngine: true,
    seat: "center",
    ambienceProfile: "club",
    ambienceTitle: "Club Ambience",
    ambienceLabel: "Crowd / room bed",
    badge: {
      title: "🪩 Nightclub dancefloor emulation:",
      text: "Treats the selected tab or cable input as a club programme: sub-heavy PA voicing, firm system limiting, long room reflections and an optional low crowd / venue texture.",
    },
    seatNotice: "ℹ️ Dancefloor position: centred in front of the system rather than a car-seat perspective.",
    environmentNotice: "ℹ️ Vehicle noise is disabled. Use Crowd / room bed to add subtle club-space texture below the music.",
  },

  // --- CONCERT VENUES ---
  inside_concert: {
    name: "Inside the concert",
    category: "space",
    segment: "venue",
    desc: "Front-of-stage arena PA: horn-loaded tops, deep sub pressure from the stacks, firm system limiting, and a huge crowd-and-hall tail around the music.",
    hp: 32, lp: 13500, sub: 7.8, subF: 45, subQ: 1.05,
    door: { f: 64, g: 5.2, q: 1.15 }, // line-array / horn punch
    mid: { f: 420, g: -2.4, q: 0.9 },
    pres: { f: 3150, g: 3.2, q: 1.35 }, // PA horn presence
    pres2: { f: 8200, g: -1.2, q: 1.7 },
    bassTilt: 4.6, trebleTilt: -1.2,
    sat: 0.32, asym: 0.03,
    comp: { thr: -18, ratio: 5.2, attack: 0.006, release: 0.17 },
    ir: { type: "arena", size: 2.6, rt60: 0.7, damp: 2500, er: 0.5, tail: 0.36 },
    irMix: 1.25, rattle: 0.35, out: 0.9, isolation: 0, balance: 1,
    mono: false,
    crossfeed: false,
    noEngine: true,
    seat: "center",
    ambienceProfile: "arena",
    ambienceTitle: "Crowd & Hall Ambience",
    ambienceLabel: "Crowd roar & hall tail",
    badge: {
      title: "🎤 Inside the concert emulation:",
      text: "Models a big-room PA at the barrier: sub-heavy horn tops, aggressive venue limiting and a long crowd-and-hall tail. Pad-level approximation, not a measured venue profile.",
    },
    seatNotice: "ℹ️ Front-of-stage position: centred in the stack field, not a seat in a car.",
    environmentNotice: "ℹ️ Vehicle noise is disabled. Use the crowd / hall bed to add room roar under the music.",
  },

  outside_concert: {
    name: "Outside the concert",
    category: "space",
    segment: "venue",
    desc: "On the pavement outside a sold-out gig: kick and bass leaking through the building, muffled PA top end, plus street traffic and crowd spill.",
    hp: 30, lp: 3000, sub: 5.0, subF: 42, subQ: 0.9,
    door: { f: 62, g: 4.4, q: 1.0 }, // structure-borne thump
    mid: { f: 500, g: -3.0, q: 0.9 },
    pres: { f: 1300, g: -3.0, q: 1.1 }, // everything above is wall
    pres2: { f: 3400, g: -3.0, q: 1.4 },
    bassTilt: 4.0, trebleTilt: -9.0,
    sat: 0.3, asym: 0.04,
    comp: { thr: -22, ratio: 3.5 },
    ir: { type: "outdoor", size: 1.8, rt60: 0.35, damp: 1500, er: 0.42, tail: 0.24 },
    irMix: 1.2, rattle: 0, out: 0.86, isolation: 0, balance: 1,
    mono: false,
    crossfeed: false,
    noEngine: true,
    seat: "center",
    ambienceProfile: "outdoor_venue",
    ambienceTitle: "Street & Crowd Ambience",
    ambienceLabel: "Street spill & traffic",
    badge: {
      title: "🚧 Outside the concert emulation:",
      text: "Treats the input as a gig heard from the street: only the low thump survives the walls, the top end is gone, and the street bed supplies traffic and crowd spill.",
    },
    seatNotice: "ℹ️ Pavement position: the venue wall is between you and the PA.",
    environmentNotice: "ℹ️ Vehicle noise is disabled. Use the street bed to blend crowd spill and traffic under the thump.",
  },

  karaoke_box: {
    name: "Karaoke box",
    category: "space",
    segment: "venue",
    desc: "Bonus space: a small private karaoke room — cheap handheld mic channel, hard compressed little PA, boxy reflections and next door singing through the wall.",
    hp: 105, lp: 10200, sub: -0.6, subF: 120, subQ: 1.0,
    door: { f: 245, g: 2.6, q: 1.6 }, // small plastic PA cabinet
    mid: { f: 760, g: -2.6, q: 0.95 },
    pres: { f: 2950, g: 3.2, q: 1.5 }, // mic / feedback region
    pres2: { f: 6900, g: 0.9, q: 1.8 },
    bassTilt: -1.4, trebleTilt: -1.2,
    sat: 0.3, asym: 0.02,
    comp: { thr: -19, ratio: 6.5, attack: 0.006, release: 0.16 },
    ir: { type: "karaoke", size: 1.15, rt60: 0.3, damp: 3100, er: 0.6, tail: 0.24 },
    irMix: 1.0, rattle: 0, out: 0.9, isolation: 0, balance: 1,
    mono: false,
    crossfeed: false,
    noEngine: true,
    seat: "center",
    ambienceProfile: "karaoke_room",
    ambienceTitle: "Room Ambience",
    ambienceLabel: "Next-door singalong",
    badge: {
      title: "🎤 Karaoke box (bonus space):",
      text: "A tiny private room PA: hard limiting, boxy low-mid build-up and a muffled neighbouring-room bleed underneath. Built as a fun translation check.",
    },
    seatNotice: "ℹ️ Sofa position: close to a small PA at the front of a narrow room.",
    environmentNotice: "ℹ️ Vehicle noise is disabled. Use room ambience to blend the next-door singalong into the bed.",
  },

  dance_studio: {
    name: "Dance studio",
    category: "space",
    segment: "room",
    desc: "Mirrored sprung-floor studio: floor monitors in a big empty hall, wooden floor resonance, glassy slap and a long bright tail off the mirrors.",
    hp: 44, lp: 14200, sub: 3.4, subF: 58, subQ: 1.0,
    door: { f: 92, g: 4.2, q: 1.15 }, // sprung wooden floor
    mid: { f: 420, g: -2.2, q: 0.9 },
    pres: { f: 2700, g: 2.2, q: 1.3 },
    pres2: { f: 6800, g: -0.8, q: 1.6 },
    bassTilt: 1.8, trebleTilt: 1.2,
    sat: 0.16, asym: 0.01,
    comp: { thr: -22, ratio: 3.0 },
    ir: { type: "hall", size: 1.8, rt60: 0.58, damp: 5200, er: 0.72, tail: 0.28 },
    irMix: 1.1, rattle: 0, out: 0.92, isolation: 0, balance: 1,
    mono: false,
    crossfeed: false,
    noEngine: true,
    seat: "center",
    ambienceProfile: "studio_hall",
    ambienceTitle: "Hall Ambience",
    ambienceLabel: "Empty hall air",
    badge: {
      title: "🩰 Dance studio emulation:",
      text: "Floor monitors in a large mirrored hall: wooden floor resonance, short glassy slaps and a wide reverberant tail. Useful for checking how a mix survives a big bare room.",
    },
    seatNotice: "ℹ️ Centre-floor position: monitors facing you from the mirror wall.",
    environmentNotice: "ℹ️ Vehicle noise is disabled. Use room ambience to add the empty-hall bed under the music.",
  },

  // --- PUBLIC / STREET SPACES ---
  mall: {
    name: "Shopping centre (mall)",
    category: "space",
    segment: "public",
    desc: "Mall concourse: distributed ceiling speakers across a long glassy atrium, mono programme, compressed in-store music and distant shopper chatter.",
    hp: 110, lp: 8800, sub: -2.6, subF: 150, subQ: 0.9,
    door: { f: 175, g: 2.0, q: 1.3 }, // ceiling-speaker / plenum resonance
    mid: { f: 640, g: -1.9, q: 0.9 },
    pres: { f: 2600, g: 2.4, q: 1.35 },
    pres2: { f: 6400, g: -2.4, q: 1.7 },
    bassTilt: -2.6, trebleTilt: -1.4,
    sat: 0.14, asym: 0.01,
    comp: { thr: -24, ratio: 4.4, attack: 0.018, release: 0.26 },
    ir: { type: "mall", size: 2.6, rt60: 0.5, damp: 3200, er: 0.7, tail: 0.28 },
    irMix: 1.2, rattle: 0, out: 0.88, isolation: 0, balance: 1,
    mono: true,
    crossfeed: false,
    noEngine: true,
    seat: "center",
    ambienceProfile: "mall",
    ambienceTitle: "Mall Ambience",
    ambienceLabel: "Shopper chatter & air handling",
    badge: {
      title: "🏬 Mall concourse emulation:",
      text: "Models a shopping-centre PA in a long reflective atrium: mono ceiling-speaker voicing, gentle programme limiting and a shopping bed of chatter and air handling.",
    },
    seatNotice: "ℹ️ Concourse position: programme arrives from many ceiling speakers, so the image is wide but effectively mono.",
    environmentNotice: "ℹ️ Vehicle noise is disabled. Use shopper ambience to add chatter and air handling under the music.",
  },

  clothing_shop: {
    name: "Clothing shop (mall)",
    category: "space",
    segment: "public",
    desc: "Fashion store in a mall: rails of clothes soak up the top end, so the ceiling system sounds soft and mid-forward with a clipped, bass-shy little PA.",
    hp: 132, lp: 7200, sub: -3.4, subF: 165, subQ: 0.95,
    door: { f: 215, g: 1.6, q: 1.4 }, // small ceiling can / shelf cavity
    mid: { f: 700, g: -2.2, q: 0.9 },
    pres: { f: 2850, g: 2.0, q: 1.4 },
    pres2: { f: 7000, g: -3.6, q: 1.9 }, // fabric absorption up top
    bassTilt: -3.2, trebleTilt: -2.8,
    sat: 0.12, asym: 0.01,
    comp: { thr: -25, ratio: 4.2, attack: 0.02, release: 0.27 },
    ir: { type: "clothing", size: 1.9, rt60: 0.26, damp: 2400, er: 0.52, tail: 0.22 },
    irMix: 1.05, rattle: 0, out: 0.87, isolation: 0, balance: 1,
    mono: true,
    crossfeed: false,
    noEngine: true,
    seat: "center",
    ambienceProfile: "clothing_shop",
    ambienceTitle: "Shop Ambience",
    ambienceLabel: "Quiet shop murmur",
    badge: {
      title: "👕 Clothing shop emulation:",
      text: "A fashion-store ceiling system in a fabric-heavy room: soft damped tail, no real sub, and a mid-forward in-store voicing. Great for checking whether a hook still reads at low level.",
    },
    seatNotice: "ℹ️ Shop-floor position: close-ish ceiling cans above, rails of clothes on both sides.",
    environmentNotice: "ℹ️ Vehicle noise is disabled. Use shop ambience to blend a quiet murmur beneath the music.",
  },

  tube_platform: {
    name: "Underground platform",
    category: "space",
    segment: "public",
    desc: "Bonus space: a London Underground platform — a busker's little amp fighting tunnel rumble, tiled slap-back reflections, announcements and hiss.",
    hp: 92, lp: 8200, sub: -1.2, subF: 130, subQ: 1.0,
    door: { f: 205, g: 2.2, q: 1.3 }, // small combo amp on tiles
    mid: { f: 620, g: -2.0, q: 0.9 },
    pres: { f: 2750, g: 2.8, q: 1.4 },
    pres2: { f: 6400, g: -1.8, q: 1.7 },
    bassTilt: -1.8, trebleTilt: -2.2,
    sat: 0.3, asym: 0.02,
    comp: { thr: -21, ratio: 5.0, attack: 0.008, release: 0.18 },
    ir: { type: "tunnel", size: 1.7, rt60: 0.55, damp: 2600, er: 0.8, tail: 0.3 },
    irMix: 1.3, rattle: 0, out: 0.88, isolation: 0, balance: 1,
    mono: true,
    crossfeed: false,
    noEngine: true,
    seat: "center",
    ambienceProfile: "tube",
    ambienceTitle: "Platform Ambience",
    ambienceLabel: "Rumble, hiss & trains",
    badge: {
      title: "🚇 Underground platform (bonus space):",
      text: "A tiled underground platform: slappy tunnel reflections, a small mono busking amp and a bed of rumble, hiss and passing trains. Built as a fun translation check.",
    },
    seatNotice: "ℹ️ Platform position: a few metres from the busker, tunnel behind them.",
    environmentNotice: "ℹ️ Vehicle noise is disabled. Use platform ambience to add rumble, hiss and train surges under the music.",
  },

  speaker_bike: {
    name: "Speaker on a bike",
    category: "space",
    segment: "public",
    desc: "A little Bluetooth speaker strapped to a bike: mono, no bass, plastic-enclosure honk, wind blast and traffic sliding past.",
    hp: 205, lp: 9200, sub: -6.0, subF: 230, subQ: 1.1,
    door: { f: 330, g: 3.4, q: 2.4 }, // plastic enclosure honk
    mid: { f: 950, g: -2.2, q: 1.0 },
    pres: { f: 3050, g: 3.6, q: 1.6 },
    pres2: { f: 6900, g: 1.2, q: 1.9 },
    bassTilt: -4.2, trebleTilt: -1.2,
    sat: 0.52, asym: 0.06,
    comp: { thr: -22, ratio: 5.0, attack: 0.005, release: 0.12 },
    ir: { type: "outdoor", size: 0.55, rt60: 0.14, damp: 5200, er: 0.3, tail: 0.1 },
    irMix: 0.4, rattle: 0.25, out: 0.86, isolation: 0, balance: 1,
    mono: true,
    crossfeed: false,
    noEngine: true,
    seat: "center",
    ambienceProfile: "bike",
    ambienceTitle: "Street Ambience",
    ambienceLabel: "Wind & passing traffic",
    badge: {
      title: "🚲 Speaker on a bike emulation:",
      text: "A pocket Bluetooth speaker in open air: everything below ~200Hz is gone, the plastic cabinet honks, and the wind / traffic bed runs under the music.",
    },
    seatNotice: "ℹ️ Rider position: the speaker is behind you on the frame, so the top end is directional and mono.",
    environmentNotice: "ℹ️ Vehicle noise is disabled. Use street ambience for wind, tyre noise and passing traffic.",
  },

  phone_outside: {
    name: "Phone outside (street)",
    category: "space",
    segment: "public",
    desc: "A phone speaker out on the street or in the park: near-mono, bass-shy, midrange-forward, with traffic and gusts around it and almost no room reverb.",
    hp: 198, lp: 11800, sub: -4.7, subF: 205, subQ: 1.0,
    door: { f: 745, g: 2.5, q: 1.5 }, // phone body resonance
    mid: { f: 1420, g: -1.2, q: 1.0 },
    pres: { f: 3330, g: 4.0, q: 1.75 },
    pres2: { f: 7500, g: 2.0, q: 2.0 },
    bassTilt: -5.2, trebleTilt: -1.4,
    sat: 0.42, asym: 0.03,
    comp: { thr: -25, ratio: 7.4, attack: 0.004, release: 0.11 },
    ir: { type: "outdoor", size: 0.8, rt60: 0.2, damp: 4700, er: 0.35, tail: 0.12 },
    irMix: 0.45, rattle: 0.05, out: 0.84, isolation: 0, balance: 1,
    mono: true,
    crossfeed: false,
    noEngine: true,
    seat: "center",
    ambienceProfile: "street_phone",
    ambienceTitle: "Street Ambience",
    ambienceLabel: "Traffic & gusts",
    badge: {
      title: "📱 Phone outside emulation:",
      text: "A handheld phone speaker in open air: near-mono, no real low end, protective limiting, and a street bed of traffic and wind instead of room reflections.",
    },
    seatNotice: "ℹ️ Arm's-length position: hand-held phone, centred and near-mono.",
    environmentNotice: "ℹ️ Vehicle noise is disabled. Use street ambience for traffic rumble and gusts.",
  },

  // --- DOMESTIC ROOMS ---
  living_room: {
    name: "Living room studio",
    category: "space",
    segment: "room",
    desc: "A domestic living room treated like a small studio: nearfields on stands, sofa and rug absorbing, a little table resonance and a short soft tail.",
    hp: 52, lp: 16800, sub: 1.4, subF: 52, subQ: 0.9,
    door: { f: 108, g: 1.4, q: 1.0 }, // shelf / sideboard resonance
    mid: { f: 380, g: -1.2, q: 0.9 },
    pres: { f: 3000, g: 0.8, q: 1.25 },
    pres2: { f: 8200, g: 0.6, q: 1.7 },
    bassTilt: 0.6, trebleTilt: 0.2,
    sat: 0.07, asym: 0,
    comp: { thr: -22, ratio: 1.8 },
    ir: { type: "living", size: 1.35, rt60: 0.24, damp: 4300, er: 0.5, tail: 0.22 },
    irMix: 0.6, rattle: 0, out: 0.96, isolation: 0, balance: 1,
    mono: false,
    crossfeed: false,
    noEngine: true,
    seat: "center",
    ambienceProfile: "living_room",
    ambienceTitle: "Room Ambience",
    ambienceLabel: "Domestic room tone",
    badge: {
      title: "🛋️ Living room studio emulation:",
      text: "Mid-size domestic room with nearfield monitors: a touch of bass support from the corner, soft absorption from soft furnishings and a short, gentle tail.",
    },
    seatNotice: "ℹ️ Mixing position: equilateral triangle with the monitors, one metre back.",
    environmentNotice: "ℹ️ Vehicle noise is disabled. Use room ambience to add quiet domestic room tone.",
  },

  sister_tiktok: {
    name: "Sister's TikTok (living room)",
    category: "space",
    segment: "room",
    desc: "Your sister watching TikTok on her phone in the living room: a tiny mono speaker, heavy bass cut and limiter, heard from across a soft-furnished room with TV murmur.",
    hp: 190, lp: 10500, sub: -5.0, subF: 210, subQ: 1.0,
    door: { f: 760, g: 2.6, q: 1.5 }, // phone body resonance
    mid: { f: 1400, g: -1.4, q: 1.0 },
    pres: { f: 3400, g: 4.4, q: 1.75 }, // speech-forward phone voicing
    pres2: { f: 7300, g: 1.6, q: 2.0 },
    bassTilt: -5.0, trebleTilt: -2.6,
    sat: 0.44, asym: 0.03,
    comp: { thr: -26, ratio: 8.0, attack: 0.004, release: 0.1 },
    ir: { type: "living", size: 1.5, rt60: 0.3, damp: 3000, er: 0.55, tail: 0.24 },
    irMix: 0.95, rattle: 0, out: 0.84, isolation: 0, balance: 1,
    mono: true,
    crossfeed: false,
    noEngine: true,
    seat: "center",
    ambienceProfile: "living_phone",
    ambienceTitle: "Room Ambience",
    ambienceLabel: "TV murmur & room tone",
    badge: {
      title: "📱 Sister's TikTok emulation:",
      text: "A phone playing short-form video across a living room: mono, bass-less, compressed to hell, with the sofa-and-carpet tail and a little TV murmur underneath.",
    },
    seatNotice: "ℹ️ Across the room: roughly three metres from the phone, so the room tail is clearly audible.",
    environmentNotice: "ℹ️ Vehicle noise is disabled. Use room ambience to blend TV murmur and room tone under the video.",
  },

  // --- AMAZON ALEXA SMART SPEAKER ---
  alexa: {
    name: "Amazon Echo (Alexa)",
    category: "smart",
    desc: "Single-point smart speaker. Mono summed, 85Hz bass cut, 155Hz port bump, vocal clarity boost, countertop reflection, and DSP limiting.",
    hp: 85, lp: 11800, sub: 0,
    door: { f: 155, g: 4.8, q: 2.1 }, // cabinet port resonance
    mid: { f: 580, g: -2.2, q: 1.1 }, // scoop out cardboard mid
    pres: { f: 3200, g: 3.8, q: 1.5 }, // speech intelligibility presence boost
    pres2: { f: 6500, g: -1.5, q: 1.8 },
    bassTilt: 0, trebleTilt: -2.5,
    sat: 0.25, asym: 0.04,
    comp: { thr: -16, ratio: 4.5, attack: 0.012, release: 0.18 }, // Alexa DRC limiting
    ir: { type: "countertop", size: 0.5, rt60: 0.12, damp: 4200, er: 0.85, tail: 0.2 },
    irMix: 0.75, rattle: 0.1, out: 0.95, isolation: 0.5, balance: 1,
    mono: true,
    crossfeed: false,
    noEngine: true,
    seat: "center",
    badge: {
      title: "🗣️ Amazon Alexa emulation:",
      text: "Single-point mono downmix, 85Hz cutoff, 155Hz port bump, dialogue clarity boost, countertop surface reflections, and smart-speaker limiting.",
    },
    seatNotice: "ℹ️ Point-source mono: directivity centered.",
    environmentNotice: "ℹ️ Vehicle engine & road rumble muted for smart-speaker testing.",
  },

  // --- APPLE WIRED EARPODS MIXING CALIBRATOR ---
  earpods_mix: {
    name: "Apple EarPods (Studio Calibrator)",
    category: "headphones",
    desc: "Transforms Apple wired EarPods into flat, accurate studio monitors. Sub-bass leakage compensation (+7dB @ 65Hz), 3.1k & 5.8k concha de-harsh, and 60° binaural crossfeed.",
    hp: 28, lp: 20000, sub: 7.0, subF: 65, subQ: 0.75, // restores non-sealing sub loss
    door: { f: 220, g: -2.8, q: 1.2 }, // eliminates 220Hz plastic boxiness
    mid: { f: 900, g: 0, q: 1.0 },
    pres: { f: 3150, g: -3.5, q: 2.0 }, // concha resonance notch
    pres2: { f: 5800, g: -3.8, q: 2.4 }, // sibilance notch
    bassTilt: 0, trebleTilt: 3.2, trebleF: 10500, // air lift
    sat: 0, asym: 0, // pristine linear DAC
    comp: { thr: 0, ratio: 1.0 }, // linear
    ir: { type: "studio", size: 0.35, rt60: 0.06, damp: 6000, er: 0.25, tail: 0.08 },
    irMix: 0.12, rattle: 0, out: 0.92, isolation: 0, balance: 1,
    mono: false,
    crossfeed: true,
    noEngine: true,
    seat: "center",
    badge: {
      title: "🎧 Apple EarPods Studio Mix Calibrator:",
      text: "Compensates acoustic sub-bass leakage, removes 220Hz boxiness and 3.1kHz / 5.8kHz concha spikes, and activates studio-monitor-style binaural crossfeed.",
    },
    seatNotice: "ℹ️ Calibrated 60° equilateral studio-monitor soundstage.",
    environmentNotice: "ℹ️ Vehicle engine & road rumble muted for clean studio monitoring.",
  },

  // --- APPLE WIRED EARPODS CONSUMER CHECK ---
  earpods_check: {
    name: "Apple EarPods (Consumer Check)",
    category: "headphones",
    desc: "Test how your mix translates on stock uncalibrated Apple wired earbuds: rolled-off sub-bass, 210Hz plastic resonance, and 3.2kHz/5.8kHz concha spikes.",
    hp: 75, lp: 11000, sub: -4.5, subF: 55, subQ: 1.0,
    door: { f: 210, g: 3.5, q: 1.3 },
    mid: { f: 750, g: -1.0, q: 1.0 },
    pres: { f: 3150, g: 3.8, q: 1.8 },
    pres2: { f: 5800, g: 4.0, q: 2.2 },
    bassTilt: -2, trebleTilt: -3.5,
    sat: 0.22, asym: 0.02,
    comp: { thr: -22, ratio: 2.5 },
    ir: { type: "earbud", size: 0.2, rt60: 0.04, damp: 7000, er: 0.2, tail: 0.05 },
    irMix: 0.1, rattle: 0.05, out: 0.95, isolation: 0.2, balance: 0.95,
    mono: false,
    crossfeed: false,
    noEngine: true,
    seat: "center",
    badge: {
      title: "⚪ EarPods Translation Check:",
      text: "Simulates stock uncalibrated Apple wired earbuds to help verify how a casual EarPods listener may hear a final mix.",
    },
    seatNotice: "ℹ️ Consumer earbud translation check with no added vehicle ambience.",
    environmentNotice: "ℹ️ Vehicle engine & road rumble muted for clean consumer-device monitoring.",
  },
};

export const PRESET_IDS = Object.keys(PRESETS);

/*
 * Space ambience beds
 * -------------------
 * One band-limited noise bed is shared by every space preset; the profile
 * decides where it sits in the spectrum, how loud it lands, and whether it
 * slowly moves (crowd swell, passing trains, wind gusts).
 *
 *   hp / lp   band edges of the bed (Hz)
 *   gain      bed level at full ambience
 *   level     default ambience dial position for this space
 *   sweep     slow movement of the band edge (Hz depth / Hz rate)
 *   trem      slow level movement (0-0.6 depth / Hz rate)
 */
export const SPACE_BEDS = {
  retail: { hp: 170, lp: 3000, gain: 0.035, level: 0.35 },
  club: { hp: 78, lp: 1850, gain: 0.052, level: 0.35, sweep: { depth: 240, rate: 0.075 } },
  arena: { hp: 70, lp: 2100, gain: 0.062, level: 0.5, sweep: { depth: 320, rate: 0.07 }, trem: { depth: 0.14, rate: 0.23 } },
  outdoor_venue: { hp: 360, lp: 2500, gain: 0.05, level: 0.45, sweep: { depth: 280, rate: 0.06 } },
  karaoke_room: { hp: 300, lp: 2400, gain: 0.04, level: 0.32, trem: { depth: 0.22, rate: 0.31 } },
  studio_hall: { hp: 260, lp: 3600, gain: 0.034, level: 0.3, sweep: { depth: 200, rate: 0.05 } },
  mall: { hp: 280, lp: 3200, gain: 0.045, level: 0.36, sweep: { depth: 220, rate: 0.04 }, trem: { depth: 0.1, rate: 0.17 } },
  clothing_shop: { hp: 240, lp: 2800, gain: 0.028, level: 0.28, trem: { depth: 0.12, rate: 0.21 } },
  tube: { hp: 55, lp: 2200, gain: 0.062, level: 0.46, sweep: { depth: 420, rate: 0.05 }, trem: { depth: 0.34, rate: 0.043 } },
  bike: { hp: 480, lp: 4200, gain: 0.055, level: 0.42, sweep: { depth: 380, rate: 0.11 }, trem: { depth: 0.25, rate: 0.19 } },
  street_phone: { hp: 420, lp: 3400, gain: 0.045, level: 0.38, sweep: { depth: 300, rate: 0.09 } },
  living_room: { hp: 210, lp: 2600, gain: 0.026, level: 0.28, trem: { depth: 0.09, rate: 0.12 } },
  living_phone: { hp: 240, lp: 2900, gain: 0.032, level: 0.32, sweep: { depth: 180, rate: 0.045 }, trem: { depth: 0.11, rate: 0.14 } },
};

export const DEFAULT_SPACE_BED = { hp: 220, lp: 2800, gain: 0.03, level: 0.3 };

export const DEFAULT_SETTINGS = {
  enabled: true,
  preset: "sedan",
  volume: 0.65,
  bass: 0,
  treble: 0,
  cabin: 0.6,
  seat: "driver",
  windows: false,
  speed: 60,
  ambience: 0.35,
  ambiencePreset: "",
  ambienceLevels: {},
  rattle: true,
  engine: true,
  mono: false,
  crossfeed: false,
  immersiveMotion: false,
  motionMode: "subtle",
  motionSpeed: 1,
  motionStrength: 0.5,
  advancedReflections: false,
};

/* ---------- helpers ---------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCabinIR(ctx, opts = {}) {
  const {
    type = "cabin",
    size = 1,
    rt60 = 0.1,
    damp = 3500,
    er = 0.6,
    tail = 0.3,
    seed = 7,
  } = opts;
  const sr = ctx.sampleRate;
  const rnd = mulberry32(seed);
  const len = Math.max(Math.ceil(sr * (rt60 * size * 1.7 + 0.04)), 512);
  const buf = ctx.createBuffer(2, len, sr);

  let EARLY;
  if (type === "countertop") {
    // Sharp hard-surface countertop reflection for smart speaker (Amazon Echo)
    EARLY = [
      [2.1, 0.78],
      [4.4, -0.52],
      [7.2, 0.38],
      [11.5, -0.26],
      [16.2, 0.2],
      [22.8, -0.14],
      [31.0, 0.09],
    ];
  } else if (type === "studio") {
    // Controlled acoustic diffusion in studio mixing room
    EARLY = [
      [4.2, 0.22],
      [8.5, -0.16],
      [13.8, 0.12],
      [19.2, -0.09],
      [25.5, 0.06],
    ];
  } else if (type === "nearfield") {
    // A close monitor pair in a controlled small room: sparse, low-level early reflections.
    EARLY = [
      [2.8, 0.18],
      [5.1, -0.13],
      [8.4, 0.09],
      [13.7, -0.06],
    ];
  } else if (type === "phone") {
    // Tiny device-body and hand reflections; deliberately almost dry.
    EARLY = [
      [0.55, 0.26],
      [1.25, -0.17],
      [2.35, 0.1],
    ];
  } else if (type === "retail") {
    // Ceiling speakers over a moderately reflective shop floor and shelving.
    EARLY = [
      [4.5, 0.36],
      [9.8, -0.27],
      [16.4, 0.22],
      [25.7, -0.18],
      [38.5, 0.14],
      [54.0, -0.1],
      [73.0, 0.07],
    ];
  } else if (type === "club") {
    // Concrete, bodies and distant hard surfaces around a loud dancefloor.
    EARLY = [
      [5.8, 0.32],
      [12.0, -0.28],
      [20.5, 0.24],
      [33.0, -0.2],
      [49.0, 0.15],
      [69.0, -0.12],
      [94.0, 0.08],
      [127.0, -0.05],
    ];
  } else if (type === "arena") {
    // Wide, dense reflections off a big arena bowl, plus crowd-body diffusion.
    EARLY = [
      [7.2, 0.3], [15.5, -0.27], [26.0, 0.24], [40.0, -0.2], [58.0, 0.16],
      [82.0, -0.13], [112.0, 0.1], [148.0, -0.07], [190.0, 0.05],
    ];
  } else if (type === "outdoor") {
    // Open-air gig: almost no boundaries, so only distance / air and a few
    // distant building faces come back.
    EARLY = [
      [3.4, 0.12], [9.8, -0.08], [21.0, 0.06], [38.0, -0.04], [62.0, 0.03],
    ];
  } else if (type === "karaoke") {
    // Small private karaoke room: tight slap from four close hard surfaces.
    EARLY = [
      [2.4, 0.5], [4.9, -0.42], [8.1, 0.34], [12.4, -0.27], [18.0, 0.21],
      [25.0, -0.15], [34.0, 0.1],
    ];
  } else if (type === "hall") {
    // Mirrored dance studio: strong early slap plus a wide, bright tail.
    EARLY = [
      [4.1, 0.42], [8.3, -0.34], [13.6, 0.29], [20.5, -0.23], [29.4, 0.18],
      [41.0, -0.13], [56.0, 0.09], [74.0, -0.06],
    ];
  } else if (type === "mall") {
    // Long glassy concourse: repeating reflections from shopfronts.
    EARLY = [
      [6.0, 0.34], [14.2, -0.29], [24.5, 0.25], [38.0, -0.21], [57.0, 0.17],
      [83.0, -0.13], [116.0, 0.1], [158.0, -0.07],
    ];
  } else if (type === "clothing") {
    // Fabric-heavy shop: fewer, softer returns; rails soak up the top end.
    EARLY = [
      [3.4, 0.26], [6.9, -0.19], [11.6, 0.14], [17.8, -0.1], [26.0, 0.07],
      [36.0, -0.05],
    ];
  } else if (type === "tunnel") {
    // Tiled underground platform: dense, slappy, long-lived reflections.
    EARLY = [
      [2.2, 0.52], [4.6, -0.46], [7.1, 0.4], [10.0, -0.35], [13.6, 0.3],
      [18.2, -0.26], [24.0, 0.21], [31.5, -0.17], [41.0, 0.13], [53.0, -0.1],
      [68.0, 0.07], [86.0, -0.05],
    ];
  } else if (type === "living") {
    // Soft-furnished domestic room: sofa, rug and curtains kill the top end,
    // so only a handful of gentle reflections survive.
    EARLY = [
      [3.1, 0.3], [6.4, -0.22], [10.9, 0.16], [17.0, -0.11], [25.2, 0.07],
      [35.0, -0.05],
    ];
  } else if (type === "earbud") {
    EARLY = [
      [0.8, 0.35],
      [1.7, -0.25],
      [2.9, 0.18],
    ];
  } else {
    // Default car cabin
    EARLY = [
      [1.6, 0.62], [2.7, -0.5], [3.9, 0.44], [5.4, -0.36], [7.1, 0.31],
      [9.3, -0.26], [11.8, 0.21], [14.9, 0.17], [18.7, -0.13], [23.5, 0.1],
      [29.0, -0.07], [36.0, 0.05],
    ];
  }

  for (let ch = 0; ch < 2; ch++) {
    const raw = new Float32Array(len);
    for (const [ms, g] of EARLY) {
      const jitter = 1 + (rnd() - 0.5) * 0.3;
      const idx = Math.round(((ms * size * jitter) / 1000) * sr);
      if (idx < len) raw[idx] += g * er * (0.8 + 0.4 * rnd());
    }
    const tailStart = Math.round(0.004 * size * sr);
    const decay = rt60 * size;
    for (let i = tailStart; i < len; i++) {
      const t = (i - tailStart) / sr;
      const env = Math.exp((-6.908 * t) / decay);
      raw[i] += (rnd() * 2 - 1) * env * tail;
    }
    const out = buf.getChannelData(ch);
    let y = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const fc = damp * Math.exp(-t / Math.max(decay, 0.02));
      const a = 1 - Math.exp((-2 * Math.PI * Math.max(fc, 250)) / sr);
      y += a * (raw[i] - y);
      out[i] = y;
    }
  }
  return buf;
}

function makeNoiseBuffer(ctx, seconds = 4, seed = 3) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    const rnd = mulberry32(seed + ch * 101);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = rnd() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5;
    }
    const fade = Math.floor(sr * 0.05);
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[i] = d[i] * k + d[len - fade + i] * (1 - k);
    }
  }
  return buf;
}

function softClipCurve(k, asym = 0, n = 4096) {
  const curve = new Float32Array(n);
  const norm = Math.tanh(k);
  for (let i = 0; i < n; i++) {
    let x = (i / (n - 1)) * 2 - 1;
    x = x + asym * (x * x - 1 / 3);
    curve[i] = Math.tanh(k * x) / norm;
  }
  return curve;
}

function rattleCurve(threshold = 0.5, n = 2048) {
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const a = Math.abs(x);
    curve[i] = a < threshold ? 0 : Math.sign(x) * Math.min(1, (a - threshold) * 12);
  }
  return curve;
}

/* ---------- the engine ---------- */

export class CarAudioEngine {
  constructor(ctx, settings = {}) {
    this.ctx = ctx;
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this._irCache = new Map();
    this._started = false;
    this._build();
    this.applySettings(this.settings);
  }

  _biquad(type, f = 1000, q = 0.707, g = 0) {
    const b = this.ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    b.gain.value = g;
    return b;
  }

  _build() {
    const c = this.ctx;
    this.input = c.createGain();
    this.output = c.createGain();

    this.bypassGain = c.createGain();
    this.chainIn = c.createGain();
    this.input.connect(this.bypassGain).connect(this.output);
    this.input.connect(this.chainIn);

    // Head unit
    this.volume = c.createGain();
    this.headComp = c.createDynamicsCompressor();
    this.headComp.knee.value = 12;
    this.headComp.attack.value = 0.01;
    this.headComp.release.value = 0.25;
    this.bassShelf = this._biquad("lowshelf", 120);
    this.trebleShelf = this._biquad("highshelf", 6000);

    // Speaker + cabin / reference EQ
    this.hp = this._biquad("highpass", 60, 0.8);
    this.subPeak = this._biquad("peaking", 45, 1.0, 0);
    this.doorRes = this._biquad("peaking", 95, 1.1, 4);
    this.midDip = this._biquad("peaking", 380, 0.9, -3.5);
    this.presence = this._biquad("peaking", 3000, 1.4, 1.5);
    this.presence2 = this._biquad("peaking", 5800, 2.0, 0);
    this.lp = this._biquad("lowpass", 11000, 0.7);
    this.lp2 = this._biquad("lowpass", 11000, 0.55);

    // Speaker non-linearity
    this.sat = c.createWaveShaper();
    this.sat.oversample = "2x";

    // Cabin / room reflections
    this.dry = c.createGain();
    this.conv = c.createConvolver();
    this.conv.normalize = false;
    this.wet = c.createGain();
    this.sum = c.createGain();
    this.sum.channelCount = 2;
    this.sum.channelCountMode = "explicit";
    this.sum.channelInterpretation = "speakers";

    // Panel rattle
    this.rattleBP = this._biquad("bandpass", 110, 1.2);
    this.rattleDrive = c.createGain();
    this.rattleShaper = c.createWaveShaper();
    this.rattleShaper.curve = rattleCurve(0.5);
    this.rattleShaper.oversample = "none";
    this.rattleHP = this._biquad("highpass", 1400, 0.7);
    this.rattleBP2 = this._biquad("bandpass", 3200, 1.6);
    this.rattleGain = c.createGain();

    // Mono Sum / Stereo Width Stage
    this.widthSplitter = c.createChannelSplitter(2);
    this.widthMerger = c.createChannelMerger(2);
    this.widthLtoL = c.createGain();
    this.widthRtoR = c.createGain();
    this.widthLtoR = c.createGain();
    this.widthRtoL = c.createGain();

    // Binaural Studio Monitor Crossfeed (Bauer / Linkwitz algorithm)
    this.xfSplitter = c.createChannelSplitter(2);
    this.xfMerger = c.createChannelMerger(2);
    this.xfDirectL = c.createGain();
    this.xfDirectR = c.createGain();
    this.xfDelayLtoR = c.createDelay(0.005);
    this.xfDelayRtoL = c.createDelay(0.005);
    this.xfDelayLtoR.delayTime.value = 0.00028; // 280 µs interaural delay
    this.xfDelayRtoL.delayTime.value = 0.00028;
    this.xfLPLtoR = this._biquad("lowpass", 720, 0.6); // head shadow lowpass
    this.xfLPRtoL = this._biquad("lowpass", 720, 0.6);
    this.xfCrossLtoR = c.createGain();
    this.xfCrossRtoL = c.createGain();

    // Seat position
    this.splitter = c.createChannelSplitter(2);
    this.delayL = c.createDelay(0.05);
    this.delayR = c.createDelay(0.05);
    this.gainL = c.createGain();
    this.gainR = c.createGain();
    this.merger = c.createChannelMerger(2);
    this.rearLP = this._biquad("lowpass", 20000, 0.5);

    this.immersive = new ImmersiveAudio(c);

    // Master
    this.limiter = c.createDynamicsCompressor();
    this.limiter.threshold.value = -3;
    this.limiter.knee.value = 2;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.12;
    this.master = c.createGain();

    // Ambience bus
    this.ambBus = c.createGain();
    this.ambBus.gain.value = 0;

    // --- Wiring ---
    this.chainIn
      .connect(this.volume)
      .connect(this.headComp)
      .connect(this.bassShelf)
      .connect(this.trebleShelf)
      .connect(this.hp)
      .connect(this.subPeak)
      .connect(this.doorRes)
      .connect(this.midDip)
      .connect(this.presence)
      .connect(this.presence2)
      .connect(this.lp)
      .connect(this.lp2)
      .connect(this.sat);

    this.sat.connect(this.dry).connect(this.sum);
    this.sat.connect(this.conv).connect(this.wet).connect(this.sum);
    this.sat
      .connect(this.rattleBP)
      .connect(this.rattleDrive)
      .connect(this.rattleShaper)
      .connect(this.rattleHP)
      .connect(this.rattleBP2)
      .connect(this.rattleGain)
      .connect(this.sum);

    // Mono stage
    this.sum.connect(this.widthSplitter);
    this.widthSplitter.connect(this.widthLtoL, 0).connect(this.widthMerger, 0, 0);
    this.widthSplitter.connect(this.widthLtoR, 0).connect(this.widthMerger, 0, 1);
    this.widthSplitter.connect(this.widthRtoR, 1).connect(this.widthMerger, 0, 1);
    this.widthSplitter.connect(this.widthRtoL, 1).connect(this.widthMerger, 0, 0);

    // Crossfeed stage
    this.widthMerger.connect(this.xfSplitter);
    this.xfSplitter.connect(this.xfDirectL, 0).connect(this.xfMerger, 0, 0);
    this.xfSplitter.connect(this.xfDirectR, 1).connect(this.xfMerger, 0, 1);
    this.xfSplitter.connect(this.xfDelayLtoR, 0).connect(this.xfLPLtoR).connect(this.xfCrossLtoR).connect(this.xfMerger, 0, 1);
    this.xfSplitter.connect(this.xfDelayRtoL, 1).connect(this.xfLPRtoL).connect(this.xfCrossRtoL).connect(this.xfMerger, 0, 0);

    // Seat stage
    this.xfMerger.connect(this.splitter);
    this.splitter.connect(this.delayL, 0).connect(this.gainL).connect(this.merger, 0, 0);
    this.splitter.connect(this.delayR, 1).connect(this.gainR).connect(this.merger, 0, 1);
    this.merger.connect(this.rearLP).connect(this.immersive.input);
    this.ambBus.connect(this.immersive.input);
    this.immersive.output.connect(this.limiter).connect(this.master).connect(this.output);
    this.sat.connect(this.immersive.reflectionInput);
    this.immersive.reflectionOutput.connect(this.limiter);
  }

  start() {
    if (this._started) return;
    this._started = true;
    const c = this.ctx;

    this.noise = c.createBufferSource();
    this.noise.buffer = makeNoiseBuffer(c, 4);
    this.noise.loop = true;

    this.roadLP = this._biquad("lowpass", 240, 0.7);
    this.roadRes = this._biquad("peaking", 85, 2.2, 7);
    this.roadGain = c.createGain();
    this.roadGain.gain.value = 0;
    this.noise.connect(this.roadLP).connect(this.roadRes).connect(this.roadGain).connect(this.ambBus);

    this.windBP = this._biquad("bandpass", 900, 0.5);
    this.windGain = c.createGain();
    this.windGain.gain.value = 0;
    this.noise.connect(this.windBP).connect(this.windGain).connect(this.ambBus);

    this.windLFO = c.createOscillator();
    this.windLFO.type = "sine";
    this.windLFO.frequency.value = 0.11;
    this.windLFOGain = c.createGain();
    this.windLFOGain.gain.value = 0;
    this.windLFO.connect(this.windLFOGain).connect(this.windGain.gain);

    this.engLP = this._biquad("lowpass", 190, 1.2);
    this.engGain = c.createGain();
    this.engGain.gain.value = 0;
    this.engLP.connect(this.engGain).connect(this.ambBus);

    // Low-level indoor / venue bed for the space presets. The program material remains
    // the captured tab/cable audio; this only adds optional shop, crowd or room texture.
    this.storeHP = this._biquad("highpass", 170, 0.55);
    this.storeLP = this._biquad("lowpass", 3000, 0.7);
    // Relative tremolo stage (gain ~1) so a pulsing bed keeps its level
    // scaling: the modulation depth is a ratio, not an absolute gain.
    this.storeTrem = c.createGain();
    this.storeTrem.gain.value = 1;
    this.storeGain = c.createGain();
    this.storeGain.gain.value = 0;
    this.noise
      .connect(this.storeHP)
      .connect(this.storeLP)
      .connect(this.storeTrem)
      .connect(this.storeGain)
      .connect(this.ambBus);

    // Slow movement for the space bed: band-edge sweep (crowd, traffic, trains)
    // and a gentle level surge. Both default to silent and are set per profile.
    this.bedSweepLFO = c.createOscillator();
    this.bedSweepLFO.type = "sine";
    this.bedSweepLFO.frequency.value = 0.1;
    this.bedSweepGain = c.createGain();
    this.bedSweepGain.gain.value = 0;
    this.bedSweepLFO.connect(this.bedSweepGain).connect(this.storeLP.frequency);

    this.bedTremLFO = c.createOscillator();
    this.bedTremLFO.type = "triangle";
    this.bedTremLFO.frequency.value = 0.2;
    this.bedTremGain = c.createGain();
    this.bedTremGain.gain.value = 0;
    this.bedTremLFO.connect(this.bedTremGain).connect(this.storeTrem.gain);

    this.osc1 = c.createOscillator();
    this.osc1.type = "sawtooth";
    this.osc2 = c.createOscillator();
    this.osc2.type = "sine";
    this.osc3 = c.createOscillator();
    this.osc3.type = "triangle";
    this.osc1Gain = c.createGain();
    this.osc1Gain.gain.value = 0.5;
    this.osc2Gain = c.createGain();
    this.osc2Gain.gain.value = 0.7;
    this.osc3Gain = c.createGain();
    this.osc3Gain.gain.value = 0.25;
    this.osc1.connect(this.osc1Gain).connect(this.engLP);
    this.osc2.connect(this.osc2Gain).connect(this.engLP);
    this.osc3.connect(this.osc3Gain).connect(this.engLP);

    this.engLFO = c.createOscillator();
    this.engLFO.frequency.value = 5.3;
    this.engLFOGain = c.createGain();
    this.engLFOGain.gain.value = 12;
    this.engLFO.connect(this.engLFOGain);
    this.engLFOGain.connect(this.osc1.detune);
    this.engLFOGain.connect(this.osc2.detune);
    this.engLFOGain.connect(this.osc3.detune);

    const t = c.currentTime;
    this.noise.start(t);
    this.bedSweepLFO.start(t);
    this.bedTremLFO.start(t);
    this.windLFO.start(t);
    this.osc1.start(t);
    this.osc2.start(t);
    this.osc3.start(t);
    this.engLFO.start(t);

    this._applyAmbience(this.settings, PRESETS[this.settings.preset] || PRESETS.sedan);
  }

  _ramp(param, value, tc = 0.04) {
    const t = this.ctx.currentTime;
    param.cancelScheduledValues(t);
    param.setTargetAtTime(value, t, tc);
  }

  _getIR(presetId, p) {
    let ir = this._irCache.get(presetId);
    if (!ir) {
      ir = makeCabinIR(this.ctx, p.ir);
      this._irCache.set(presetId, ir);
    }
    return ir;
  }

  setEnabled(on) {
    this.settings.enabled = !!on;
    this._ramp(this.bypassGain.gain, on ? 0 : 1);
    this._ramp(this.chainIn.gain, on ? 1 : 0);
    if (this._started) {
      this._ramp(this.ambBus.gain, on ? 1 : 0, 0.2);
    }
  }

  applySettings(partial) {
    const s = (this.settings = { ...this.settings, ...partial });
    const p = PRESETS[s.preset] || PRESETS.sedan;
    const r = (param, v, tc) => this._ramp(param, v, tc);

    const v = clamp(s.volume, 0, 1);
    const windows = !!s.windows;

    // Head unit
    r(this.volume.gain, 0.35 + v * 1.55);
    r(this.headComp.threshold, p.comp.thr);
    r(this.headComp.ratio, p.comp.ratio);
    // Reset time constants when moving between targets so a phone/smart-speaker
    // limiter cannot leak its fast timing into a linear monitor preset.
    r(this.headComp.attack, p.comp.attack ?? 0.01);
    r(this.headComp.release, p.comp.release ?? 0.25);

    r(this.bassShelf.frequency, p.subF ? 100 : 120);
    r(this.bassShelf.gain, clamp(s.bass, -12, 12) + p.bassTilt);
    r(this.trebleShelf.frequency, p.trebleF || 6000);
    r(this.trebleShelf.gain, clamp(s.treble, -12, 12) + p.trebleTilt);

    // Speakers + cabin / target EQ
    r(this.hp.frequency, p.hp);
    r(this.subPeak.frequency, p.subF || 45);
    r(this.subPeak.Q, p.subQ || 1.0);
    r(this.subPeak.gain, p.sub);

    r(this.doorRes.frequency, p.door.f);
    r(this.doorRes.Q, p.door.q);
    r(this.doorRes.gain, p.door.g * (windows ? 0.55 : 1));

    r(this.midDip.frequency, p.mid.f);
    r(this.midDip.Q, p.mid.q);
    r(this.midDip.gain, p.mid.g);

    r(this.presence.frequency, p.pres.f);
    r(this.presence.Q, p.pres.q);
    r(this.presence.gain, p.pres.g);

    if (p.pres2) {
      r(this.presence2.frequency, p.pres2.f);
      r(this.presence2.Q, p.pres2.q);
      r(this.presence2.gain, p.pres2.g);
    } else {
      r(this.presence2.gain, 0);
    }

    // Biquad frequency is bounded by the current context's Nyquist limit.
    // Keep the second low-pass stage inside that range rather than relying on
    // browser clamping (e.g. 20kHz × 1.25 in a 48kHz context).
    const maxFilterFrequency = Math.max(10, this.ctx.sampleRate / 2 - 1);
    r(this.lp.frequency, clamp(p.lp, 10, maxFilterFrequency));
    r(this.lp2.frequency, clamp(p.lp * 1.25, 10, maxFilterFrequency));

    // Saturation
    if (p.sat === 0) {
      this.sat.curve = null;
    } else {
      const drive = 1 + p.sat * (0.4 + v * v * 6.5);
      this.sat.curve = softClipCurve(drive, p.asym);
    }

    // Cabin reflections
    const seatRear = s.seat === "rear";
    this.conv.buffer = this._getIR(s.preset, p);
    r(this.dry.gain, 1);
    r(
      this.wet.gain,
      clamp(s.cabin, 0, 1) * 1.2 * p.irMix * (windows ? 0.55 : 1) * (seatRear ? 1.25 : 1) * (s.advancedReflections ? 0.45 : 1)
    );

    this.immersive.configure(s, p);

    // Panel rattle
    const bassPush = clamp(s.bass, -12, 12) / 12;
    r(this.rattleDrive.gain, s.rattle && p.rattle > 0 ? 3 + v * v * 22 + bassPush * 6 : 0);
    r(this.rattleGain.gain, s.rattle && p.rattle > 0 ? p.rattle * 0.22 : 0);

    // Mono Summing
    const isMono = !!s.mono;
    const w = isMono ? 0 : 1;
    r(this.widthLtoL.gain, (1 + w) * 0.5);
    r(this.widthRtoR.gain, (1 + w) * 0.5);
    r(this.widthLtoR.gain, (1 - w) * 0.5);
    r(this.widthRtoL.gain, (1 - w) * 0.5);

    // Binaural Studio Crossfeed
    const isCrossfeed = !!s.crossfeed && !isMono;
    r(this.xfDirectL.gain, isCrossfeed ? 0.88 : 1.0);
    r(this.xfDirectR.gain, isCrossfeed ? 0.88 : 1.0);
    r(this.xfCrossLtoR.gain, isCrossfeed ? 0.35 : 0.0);
    r(this.xfCrossRtoL.gain, isCrossfeed ? 0.35 : 0.0);

    // Seat position — UK / London right-hand-drive geometry.
    // The driver is on the physical right: right speakers arrive earlier/louder.
    let dL = 0, dR = 0, gL = 1, gR = 1, rearF = 20000;
    switch (s.seat) {
      case "driver":
        dL = 0.0007; gL = 0.78; break;
      case "passenger":
        dR = 0.0007; gR = 0.78; break;
      case "rear":
        gL = gR = 0.85; rearF = 6000; break;
      default:
        break;
    }
    gR *= p.balance;
    r(this.delayL.delayTime, dL);
    r(this.delayR.delayTime, dR);
    r(this.gainL.gain, gL);
    r(this.gainR.gain, gR);
    r(this.rearLP.frequency, rearF);

    r(this.master.gain, p.out);

    this._applyAmbience(s, p);
    this.setEnabled(s.enabled !== false);
  }

  _applyAmbience(s, p) {
    if (!this._started) return;
    const r = (param, v, tc) => this._ramp(param, v, tc);
    const spd = clamp(s.speed, 0, 160) / 100;
    const amb = clamp(s.ambience, 0, 1);
    const windows = !!s.windows;
    const iso = p.isolation;
    const ambienceProfile = p.ambienceProfile || "";

    // The space bed is only used for room / venue targets. It is kept out of
    // every other preset so a target change cannot leave a residual noise path.
    // `ambiencePreset` carries the profile the user last set the ambience slider
    // for, so one shared slider can serve every space without the bed jumping
    // back to a stale value when you switch between spaces.
    let spaceBedGain = 0;
    let bedFreqs = null;
    let bedSweep = null;
    let bedTrem = null;
    if (ambienceProfile) {
      const profile = SPACE_BEDS[ambienceProfile] || DEFAULT_SPACE_BED;
      bedFreqs = [profile.hp, profile.lp];
      bedSweep = profile.sweep || null;
      bedTrem = profile.trem || null;
      const dialled = s.ambiencePreset === ambienceProfile ? amb : profile.level;
      spaceBedGain = dialled * profile.gain;
    }
    if (bedFreqs) {
      r(this.storeHP.frequency, bedFreqs[0], 0.35);
      r(this.storeLP.frequency, bedFreqs[1], 0.35);
      r(this.bedSweepGain.gain, bedSweep ? bedSweep.depth : 0, 0.35);
      r(this.bedSweepLFO.frequency, bedSweep ? bedSweep.rate : 0.2, 0.35);
      r(this.bedTremGain.gain, bedTrem ? bedTrem.depth : 0, 0.35);
      r(this.bedTremLFO.frequency, bedTrem ? bedTrem.rate : 0.3, 0.35);
    }
    r(this.storeGain.gain, spaceBedGain, 0.35);

    if (p.noEngine || !s.engine) {
      r(this.roadGain.gain, 0, 0.2);
      r(this.windGain.gain, 0, 0.2);
      r(this.windLFOGain.gain, 0, 0.2);
      r(this.engGain.gain, 0, 0.2);
      if (s.preset === "alexa" && amb > 0) {
        r(this.roadGain.gain, amb * 0.025, 0.3);
      }
      return;
    }

    const road = amb * (0.03 + spd * spd * 0.42) * (windows ? 1.5 : 1) * iso;
    const wind = amb * Math.pow(spd, 2.5) * (windows ? 0.7 : 0.09) * iso;
    r(this.roadGain.gain, road, 0.3);
    r(this.windGain.gain, wind, 0.3);
    r(this.windLFOGain.gain, wind * 0.45, 0.3);
    r(this.windBP.frequency, windows ? 700 : 1100, 0.3);

    const rpm = 800 + spd * 100 * 21;
    const f = rpm / 30;
    r(this.osc1.frequency, f, 0.4);
    r(this.osc2.frequency, f / 2, 0.4);
    r(this.osc3.frequency, f * 2, 0.4);
    r(this.engLP.frequency, 120 + spd * 90, 0.4);
    const eng = amb * (0.1 + spd * 0.05) * iso * (windows ? 1.3 : 1);
    r(this.engGain.gain, eng, 0.3);
  }

  dispose() {
    this.immersive.dispose();
    try {
      if (this._started) {
        this.noise.stop();
        this.bedSweepLFO.stop();
        this.bedTremLFO.stop();
        this.windLFO.stop();
        this.osc1.stop();
        this.osc2.stop();
        this.osc3.stop();
        this.engLFO.stop();
      }
    } catch (_) {}
    try {
      this.input.disconnect();
      this.output.disconnect();
    } catch (_) {}
  }
}