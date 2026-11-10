import { PRESETS } from "./car-audio-engine.js";

const $ = (id) => document.getElementById(id);
const extensionApi = globalThis.chrome?.runtime?.id ? globalThis.chrome : null;

const GENERIC_VISUAL = {
  brand: "CarAudio",
  model: "Cabin target",
  generation: "UK RHD",
  body: "family car cabin",
  panorama: "assets/generic-cabin-panorama.jpg",
  accent: "#f59e0b",
  glow: "rgba(245, 158, 11, 0.34)",
  soft: "rgba(245, 158, 11, 0.14)",
  seatLayout: "five-seat",
};

const SEATS = {
  passenger: {
    row: "front", col: 0, title: "Front passenger seat", description: "Front-left · UK right-hand drive",
    pan: 0.21, zoom: 1.07,
  },
  driver: {
    row: "front", col: 2, title: "Driver's seat", description: "Front-right · UK right-hand drive",
    pan: 0, zoom: 1.1,
  },
  rearLeft: {
    row: "rear", col: 0, title: "Rear-left seat", description: "Rear passenger side",
    pan: 0.34, zoom: 1.0,
  },
  rearCenter: {
    row: "rear", col: 1, title: "Rear centre seat", description: "Rear centre · panoramic cabin view",
    pan: 0.27, zoom: 1.0,
  },
  rearRight: {
    row: "rear", col: 2, title: "Rear-right seat", description: "Behind the UK driver",
    pan: 0.15, zoom: 1.0,
  },
};

const LAYOUTS = {
  "two-seat": ["passenger", "driver"],
  lounge: ["passenger", "driver", "rearLeft", "rearRight"],
  "five-seat": ["passenger", "driver", "rearLeft", "rearCenter", "rearRight"],
};

let selectedPresetId = "bmw_3_series";
let selectedPreset = PRESETS[selectedPresetId];
let visual = GENERIC_VISUAL;
let availableSeatIds = LAYOUTS[GENERIC_VISUAL.seatLayout];
let activeSeatId = "driver";
let yaw = 0;
let imageAspect = 2;
let dragState = null;
let toastTimer = null;
let imageLoadToken = 0;
let hintDismissed = false;

function normaliseAngle(value) {
  return ((value % 360) + 360) % 360;
}

function assetUrl(path) {
  return extensionApi?.runtime?.getURL ? extensionApi.runtime.getURL(path) : path;
}

function visualForPreset(preset) {
  if (!preset?.visual || preset.visual === false) {
    return {
      ...GENERIC_VISUAL,
      model: preset?.name || GENERIC_VISUAL.model,
      body: "car cabin",
    };
  }

  const accent = preset.visual.accent || GENERIC_VISUAL.accent;
  const specialGlow = preset.visual.brand === "Rolls-Royce"
    ? "rgba(246, 212, 135, 0.35)"
    : preset.visual.brand === "Koenigsegg"
      ? "rgba(211, 155, 98, 0.32)"
      : preset.visual.brand === "Bugatti"
        ? "rgba(94, 171, 255, 0.34)"
        : preset.visual.brand === "Mercedes-Benz"
          ? "rgba(87, 224, 208, 0.3)"
          : "rgba(95, 168, 255, 0.33)";

  return {
    ...GENERIC_VISUAL,
    ...preset.visual,
    accent,
    glow: specialGlow,
    soft: preset.visual.brand === "Rolls-Royce"
      ? "rgba(246, 212, 135, 0.14)"
      : preset.visual.brand === "Koenigsegg"
        ? "rgba(211, 155, 98, 0.14)"
        : preset.visual.brand === "Bugatti"
          ? "rgba(94, 171, 255, 0.14)"
          : preset.visual.brand === "Mercedes-Benz"
            ? "rgba(87, 224, 208, 0.13)"
            : "rgba(95, 168, 255, 0.14)",
  };
}

async function requestedPreset() {
  const queryPreset = new URLSearchParams(globalThis.location.search).get("preset");
  if (queryPreset && PRESETS[queryPreset]) return queryPreset;

  if (extensionApi?.storage?.local?.get) {
    try {
      const { visualizerPreset } = await extensionApi.storage.local.get("visualizerPreset");
      if (visualizerPreset && PRESETS[visualizerPreset]) return visualizerPreset;
    } catch (_) {
      // The page also works as a standalone visual preview without extension storage.
    }
  }

  return PRESETS.bmw_3_series ? "bmw_3_series" : Object.keys(PRESETS)[0];
}

function vehicleName() {
  return visual.brand === "CarAudio" ? selectedPreset.name : `${visual.brand} ${visual.model}`;
}

function renderView() {
  const scene = $("immersiveScene");
  const seat = SEATS[activeSeatId];
  if (!scene.clientHeight || !seat) return;

  const imageHeight = scene.clientHeight * seat.zoom;
  const orbitWidth = Math.max(scene.clientWidth, scene.clientHeight * imageAspect) * seat.zoom;
  const yawOffset = -(yaw / 360) * orbitWidth;
  const seatOffset = seat.pan * orbitWidth;
  const yOffset = (scene.clientHeight - imageHeight) * 0.5;

  scene.style.backgroundSize = `${Math.ceil(orbitWidth)}px ${Math.ceil(imageHeight)}px`;
  scene.style.backgroundPosition = `${Math.round(yawOffset + seatOffset)}px ${Math.round(yOffset)}px`;
  scene.style.setProperty("--reflection-shift", `${Math.round((seat.pan - 0.15) * 24)}px`);
  scene.dataset.seat = activeSeatId;
}

function setYaw(nextYaw) {
  yaw = normaliseAngle(nextYaw);
  renderView();
}

function dismissHint() {
  if (hintDismissed) return;
  hintDismissed = true;
  $("entryHint").classList.add("is-hidden");
}

function showSeatToast() {
  const seat = SEATS[activeSeatId];
  $("seatTitle").textContent = seat.title;
  $("seatDescription").textContent = seat.description;
  const toast = $("seatToast");
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1850);
}

function setSeat(nextSeatId, { announce = true } = {}) {
  if (!availableSeatIds.includes(nextSeatId) || !SEATS[nextSeatId]) return;
  activeSeatId = nextSeatId;
  renderView();
  if (announce) showSeatToast();
}

function nearestSeat(seats, targetCol) {
  return seats.reduce((best, candidate) => {
    if (!best) return candidate;
    const candidateDistance = Math.abs(candidate.col - targetCol);
    const bestDistance = Math.abs(best.col - targetCol);
    if (candidateDistance < bestDistance) return candidate;
    // When rear centre moves forward, favour the UK driver's side on ties.
    if (candidateDistance === bestDistance && candidate.col > best.col) return candidate;
    return best;
  }, null);
}

function moveSeat(horizontal, vertical) {
  const current = SEATS[activeSeatId];
  const available = availableSeatIds.map((id) => SEATS[id]);
  let next = null;

  if (horizontal) {
    const sameRow = available.filter((seat) => seat.row === current.row);
    const inDirection = sameRow.filter((seat) => horizontal < 0
      ? seat.col < current.col
      : seat.col > current.col);
    if (inDirection.length) {
      next = horizontal < 0
        ? inDirection.reduce((best, seat) => seat.col > best.col ? seat : best)
        : inDirection.reduce((best, seat) => seat.col < best.col ? seat : best);
    }
  }

  if (vertical && !next) {
    const targetRow = vertical < 0 ? "front" : "rear";
    const otherRow = available.filter((seat) => seat.row === targetRow);
    if (otherRow.length && targetRow !== current.row) next = nearestSeat(otherRow, current.col);
  }

  if (next) setSeat(Object.entries(SEATS).find(([, seat]) => seat === next)?.[0]);
}

function setHelp(open) {
  $("helpOverlay").hidden = !open;
  if (open) dismissHint();
}

async function requestImmersiveFullscreen() {
  const scene = $("immersiveScene");
  if (document.fullscreenElement || !document.fullscreenEnabled) return;
  try {
    await scene.requestFullscreen();
  } catch (_) {
    // Fullscreen remains optional for browser contexts that disallow it.
  }
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await requestImmersiveFullscreen();
  } catch (_) {}
}

function refreshProfile(presetId) {
  selectedPresetId = PRESETS[presetId] ? presetId : "bmw_3_series";
  selectedPreset = PRESETS[selectedPresetId] || PRESETS.sedan;
  visual = visualForPreset(selectedPreset);
  availableSeatIds = LAYOUTS[visual.seatLayout] || LAYOUTS["five-seat"];
  if (!availableSeatIds.includes(activeSeatId)) activeSeatId = availableSeatIds.includes("driver") ? "driver" : availableSeatIds[0];

  document.documentElement.style.setProperty("--accent", visual.accent);
  document.documentElement.style.setProperty("--accent-glow", visual.glow);
  document.documentElement.style.setProperty("--accent-soft", visual.soft);

  const name = vehicleName();
  document.title = `${name} — CarAudio Immersive Cabin`;
  $("vehicleLabel").textContent = `${name.toUpperCase()} · ${visual.generation.toUpperCase()}`;
  $("helpVehicleName").textContent = name;
  const scene = $("immersiveScene");
  scene.classList.toggle("has-starlight", !!visual.starlight);
  scene.setAttribute(
    "aria-label",
    `Immersive ${name} cabin. Use the arrow keys to move between seats and drag to look around.`
  );

  const token = ++imageLoadToken;
  const image = new Image();
  image.onload = () => {
    if (token !== imageLoadToken) return;
    imageAspect = image.naturalWidth && image.naturalHeight
      ? image.naturalWidth / image.naturalHeight
      : 2;
    renderView();
  };
  image.src = assetUrl(visual.panorama);
  scene.style.backgroundImage = `url("${assetUrl(visual.panorama)}")`;
  setYaw(0);
  setSeat(activeSeatId, { announce: false });
}

function setupPointerControls() {
  const scene = $("immersiveScene");

  scene.addEventListener("pointerdown", (event) => {
    if ($("helpOverlay").hidden === false) {
      setHelp(false);
      return;
    }
    void requestImmersiveFullscreen();
    dragState = { pointerId: event.pointerId, startX: event.clientX, startYaw: yaw };
    scene.setPointerCapture?.(event.pointerId);
    scene.classList.add("is-dragging");
    dismissHint();
  });

  scene.addEventListener("pointermove", (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const width = Math.max(scene.clientWidth, 1);
    const degrees = ((event.clientX - dragState.startX) / width) * 210;
    setYaw(dragState.startYaw - degrees);
  });

  const endDrag = (event) => {
    if (!dragState || (event && event.pointerId !== dragState.pointerId)) return;
    try {
      scene.releasePointerCapture?.(dragState.pointerId);
    } catch (_) {}
    dragState = null;
    scene.classList.remove("is-dragging");
  };

  scene.addEventListener("pointerup", endDrag);
  scene.addEventListener("pointercancel", endDrag);
  scene.addEventListener("lostpointercapture", endDrag);
}

function setupKeyboardControls() {
  document.addEventListener("keydown", (event) => {
    const helpOpen = !$("helpOverlay").hidden;
    const key = event.key;

    if (key === "?" || (key === "/" && event.shiftKey)) {
      event.preventDefault();
      setHelp(!helpOpen);
      return;
    }
    if (key === "Escape" && helpOpen) {
      event.preventDefault();
      setHelp(false);
      return;
    }
    if (helpOpen) return;

    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "A", "d", "D"].includes(key)) {
      event.preventDefault();
      void requestImmersiveFullscreen();
      dismissHint();
    }
    if (key === "f" || key === "F") {
      event.preventDefault();
      dismissHint();
    }

    switch (key) {
      case "ArrowLeft":
        moveSeat(-1, 0);
        break;
      case "ArrowRight":
        moveSeat(1, 0);
        break;
      case "ArrowUp":
        moveSeat(0, -1);
        break;
      case "ArrowDown":
        moveSeat(0, 1);
        break;
      case "a":
      case "A":
        setYaw(yaw - 18);
        break;
      case "d":
      case "D":
        setYaw(yaw + 18);
        break;
      case "f":
      case "F":
        void toggleFullscreen();
        break;
      default:
        break;
    }
  });
}

async function init() {
  refreshProfile(await requestedPreset());
  setupPointerControls();
  setupKeyboardControls();
  $("immersiveScene").focus({ preventScroll: true });
  showSeatToast();
  setTimeout(dismissHint, 5200);

  globalThis.addEventListener("resize", renderView, { passive: true });
  document.addEventListener("fullscreenchange", renderView);

  extensionApi?.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes.visualizerPreset) return;
    const nextId = changes.visualizerPreset.newValue;
    if (nextId && PRESETS[nextId] && nextId !== selectedPresetId) refreshProfile(nextId);
  });
}

init();
