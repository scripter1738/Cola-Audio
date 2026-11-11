import { CarAudioEngine, PRESETS, PRESET_IDS, DEFAULT_SETTINGS, SPACE_BEDS } from "./car-audio-engine.js";

const $ = (id) => document.getElementById(id);

const SEAT_DESC = {
  driver: "UK right-hand drive: right speakers closer & louder, left side arrives a hair later.",
  passenger: "UK front passenger: left speakers closer & louder, right side arrives a hair later.",
  rear: "Front speakers firing away from you: duller, more cabin wash.",
  center: "Neutral, perfectly balanced studio imaging.",
};

let active = false;
let settings = { ...DEFAULT_SETTINGS };
let ctx = null;
let engine = null;
let mediaStream = null;
let sourceNode = null;
let currentCategory = "all";

function showStatus(text, kind = "") {
  const el = $("status");
  if (!text) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.textContent = text;
  el.className = `status ${kind}`;
}

function fmt(id, v) {
  switch (id) {
    case "volume":
    case "cabin":
    case "ambience":
    case "motionStrength":
      return `${Math.round(v * 100)}%`;
    case "bass":
    case "treble":
      return `${v > 0 ? "+" : ""}${Number(v).toFixed(1)} dB`;
    case "motionSpeed":
      return `${Number(v).toFixed(2)}×`;
    case "speed":
      return `${Math.round(v)} km/h`;
    default:
      return String(v);
  }
}

function renderPresetBadge(p) {
  const badgeEl = $("referenceBadge");
  const visual = p?.visual;
  const badge = p?.badge || (visual?.brand ? {
    title: `🇬🇧 ${visual.brand} ${visual.model} (${visual.generation}) emulation:`,
    text: `UK right-hand-drive ${visual.body} target with a ${visual.acoustic}. Factory audio upgrades, tyres and trim will vary from this baseline.`,
  } : null);
  badgeEl.hidden = !badge;
  if (!badge) {
    badgeEl.replaceChildren();
    return;
  }

  const title = document.createElement("strong");
  title.textContent = badge.title;
  badgeEl.replaceChildren(title, document.createTextNode(` ${badge.text}`));
}

function renderEnvironment(p) {
  const isVehicleTarget = !p.noEngine;
  const hasSpaceAmbience = !!p.ambienceProfile;
  const spaceTitle = p.ambienceTitle
    || (p.ambienceProfile === "club" ? "Club Ambience" : "Shop Ambience");

  $("environmentHeading").textContent = isVehicleTarget
    ? "Driving & Ambience"
    : hasSpaceAmbience
      ? spaceTitle
      : "Environment";
  $("speedRow").hidden = !isVehicleTarget;
  $("ambienceRow").hidden = !isVehicleTarget && !hasSpaceAmbience;
  $("vehicleToggles").hidden = !isVehicleTarget;
  $("ambienceLabel").textContent = isVehicleTarget
    ? "Road & engine noise"
    : p.ambienceLabel || "Room ambience";
  if (hasSpaceAmbience && settings.ambiencePreset !== p.ambienceProfile) {
    // Nothing dialled for this space yet: show the level the bed will
    // actually start from, which may be higher than the stored value.
    const bed = SPACE_BEDS[p.ambienceProfile];
    const level = settings.ambienceLevels?.[p.ambienceProfile]
      ?? bed?.level
      ?? settings.ambience;
    $("ambience").value = level;
    $("ambienceVal").textContent = fmt("ambience", level);
  }

  const notice = $("drivingNotice");
  notice.hidden = !p.environmentNotice;
  notice.textContent = p.environmentNotice || "";
}

function render() {
  const p = PRESETS[settings.preset] || PRESETS.sedan;
  document.body.classList.toggle("inactive", !active);
  $("power").setAttribute("aria-pressed", active ? "true" : "false");

  document.querySelectorAll(".chip").forEach((el) => {
    el.classList.toggle("active", el.dataset.preset === settings.preset);
  });
  $("presetDesc").textContent = p.desc || "";
  renderPresetBadge(p);

  // Sliders
  for (const id of ["volume", "bass", "treble", "cabin", "speed", "ambience", "motionSpeed", "motionStrength"]) {
    $(id).value = settings[id];
    $(`${id}Val`).textContent = fmt(id, settings[id]);
  }
  for (const id of ["windows", "rattle", "engine"]) {
    $(id).checked = !!settings[id];
  }

  // Mono & Crossfeed
  $("immersiveMotion").checked = !!settings.immersiveMotion;
  $("advancedReflections").checked = !!settings.advancedReflections;
  $("motionMode").value = settings.motionMode;
  $("motionControls").hidden = !settings.immersiveMotion;

  $("mono").checked = !!settings.mono;
  $("crossfeed").checked = !!settings.crossfeed;
  $("spaceLabel").textContent = p.noEngine ? "Room / space" : "Room / Cabin IR";

  // Listening position
  const isVehicleTarget = p.category === "car";
  $("seatHeading").textContent = isVehicleTarget ? "Where you sit" : "Listening position";
  $("seatMap").hidden = !isVehicleTarget;
  $("seatDesc").hidden = !isVehicleTarget;
  document.querySelectorAll(".seat").forEach((el) => {
    el.classList.toggle("active", el.dataset.seat === settings.seat);
  });
  $("seatDesc").textContent = SEAT_DESC[settings.seat] || "";
  const seatNotice = $("seatNotice");
  seatNotice.hidden = !p.seatNotice;
  seatNotice.textContent = p.seatNotice || "";
  $("driveSideBadge").hidden = p.category !== "car" || p.visual === false;

  const visualizer = $("openVisualizer");
  const canVisualize = p.category === "car" && p.visual !== false;
  visualizer.hidden = !canVisualize;
  visualizer.disabled = !canVisualize;
  if (canVisualize) {
    const vehicleName = p.visual?.brand
      ? `${p.visual.brand} ${p.visual.model}`
      : p.name;
    $("visualizerLabel").textContent = `Explore ${vehicleName} in 360°`;
  }

  renderEnvironment(p);
}

function buildPresets() {
  const wrap = $("presets");
  wrap.innerHTML = "";
  for (const id of PRESET_IDS) {
    const p = PRESETS[id];
    const b = document.createElement("button");
    b.className = "chip";
    b.dataset.preset = id;
    b.dataset.category = p.category || "car";
    b.textContent = p.name;
    b.addEventListener("click", () => selectPreset(id));
    wrap.appendChild(b);
  }
  filterPresets();
}

function matchesCategory(p, category) {
  if (category === "all") return true;
  // Space filters are grouped: "space:all", "space:venue", "space:room",
  // "space:public".
  if (category.startsWith("space:")) {
    if (p.category !== "space") return false;
    const group = category.slice("space:".length);
    return group === "all" || p.segment === group;
  }
  return p.category === category || p.brand === category || p.segment === category;
}

function filterPresets() {
  document.querySelectorAll(".chip").forEach((el) => {
    el.hidden = !matchesCategory(PRESETS[el.dataset.preset], currentCategory);
  });
}

function selectPreset(id) {
  const p = PRESETS[id];
  const previous = PRESETS[settings.preset] || PRESETS.sedan;
  const patch = { preset: id };
  if (p.mono !== undefined) patch.mono = p.mono;
  // Each space gets its own starting bed level and remembers the dial
  // separately, so moving club -> living room does not leave a
  // nightclub-sized bed running under the telly.
  const bed = p.ambienceProfile ? SPACE_BEDS[p.ambienceProfile] : null;
  if (bed) {
    patch.ambience = settings.ambienceLevels?.[p.ambienceProfile] ?? bed.level;
    patch.ambiencePreset = p.ambienceProfile;
  } else if (previous.ambienceProfile) {
    // Back to a vehicle: hand the ambience dial back at a sane level
    // rather than whatever a venue bed was dialled to.
    patch.ambience = DEFAULT_SETTINGS.ambience;
    patch.ambiencePreset = "";
  }
  if (p.crossfeed !== undefined) patch.crossfeed = p.crossfeed;
  if (p.seat !== undefined) patch.seat = p.seat;

  if (p.noEngine) {
    patch.engine = false;
    patch.rattle = p.rattle > 0;
    patch.windows = false;
  } else if (previous.noEngine) {
    // Restore useful vehicle defaults after leaving a non-vehicle target.
    patch.engine = DEFAULT_SETTINGS.engine;
    patch.rattle = DEFAULT_SETTINGS.rattle;
    patch.windows = DEFAULT_SETTINGS.windows;
  }
  change(patch);
}

async function openVisualizer() {
  const p = PRESETS[settings.preset] || PRESETS.sedan;
  if (p.category !== "car" || p.visual === false) return;

  try {
    await chrome.storage.local.set({ visualizerPreset: settings.preset });
    await chrome.tabs.create({ url: chrome.runtime.getURL("visualizer.html") });
  } catch (error) {
    showStatus(`Could not open the cabin viewer: ${error?.message || error}`, "error");
  }
}

function change(partial) {
  settings = { ...settings, ...partial };
  render();
  if (engine) {
    engine.applySettings(settings);
  }
}

async function populateDevices() {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    const select = $("deviceSelect");
    select.innerHTML = "";

    const audioInputs = devices.filter((d) => d.kind === "audioinput");
    audioInputs.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.deviceId;
      opt.textContent = d.label || `Audio Input ${select.length + 1}`;
      if (
        opt.textContent.toLowerCase().includes("cable") ||
        opt.textContent.toLowerCase().includes("blackhole") ||
        opt.textContent.toLowerCase().includes("virtual")
      ) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
  } catch (err) {
    showStatus("Microphone permission denied. Cannot list audio inputs.", "error");
  }
}

async function turnOn() {
  const selectedDeviceId = $("deviceSelect").value;
  if (!selectedDeviceId) {
    showStatus("Please select an audio input device first.", "error");
    return;
  }

  try {
    ctx = new AudioContext({ latencyHint: "interactive" });

    const constraints = {
      audio: {
        deviceId: { exact: selectedDeviceId },
        autoGainControl: false,
        echoCancellation: false,
        noiseSuppression: false,
        channelCount: 2,
      },
      video: false,
    };

    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    sourceNode = ctx.createMediaStreamSource(mediaStream);
    engine = new CarAudioEngine(ctx, settings);

    sourceNode.connect(engine.input);
    engine.output.connect(ctx.destination);
    engine.start();

    if (ctx.state === "suspended") await ctx.resume();

    active = true;
    showStatus("Live DSP active for audio input!", "ok");
  } catch (e) {
    active = false;
    showStatus(String(e?.message || e), "error");
  } finally {
    render();
  }
}

async function turnOff() {
  if (engine) {
    engine.dispose();
    engine = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
  if (ctx) {
    await ctx.close();
    ctx = null;
  }
  active = false;
  showStatus("");
  render();
}

async function init() {
  buildPresets();

  document.querySelectorAll(".tab-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.category;
      filterPresets();
    });
  });

  for (const id of ["volume", "bass", "treble", "cabin", "speed", "ambience", "motionSpeed", "motionStrength"]) {
    $(id).addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      if (id !== "ambience") {
        change({ [id]: value });
        return;
      }
      const profile = PRESETS[settings.preset]?.ambienceProfile;
      if (!profile) {
        change({ ambience: value });
        return;
      }
      // Remember the dial against this space so switching away and back
      // restores it instead of resetting to the default bed level.
      change({
        ambience: value,
        ambiencePreset: profile,
        ambienceLevels: { ...(settings.ambienceLevels || {}), [profile]: value },
      });
    });
  }
  for (const id of ["windows", "rattle", "engine"]) {
    $(id).addEventListener("change", (e) => change({ [id]: e.target.checked }));
  }

  for (const id of ["immersiveMotion", "advancedReflections"]) {
    $(id).addEventListener("change", (e) => change({ [id]: e.target.checked }));
  }
  $("motionMode").addEventListener("change", (e) => change({ motionMode: e.target.value }));

  $("mono").addEventListener("change", (e) => change({ mono: e.target.checked }));
  $("crossfeed").addEventListener("change", (e) => change({ crossfeed: e.target.checked }));

  document.querySelectorAll(".seat").forEach((el) => {
    el.addEventListener("click", () => change({ seat: el.dataset.seat }));
  });
  $("openVisualizer").addEventListener("click", openVisualizer);
  $("reset").addEventListener("click", () => change({ ...DEFAULT_SETTINGS }));
  $("power").addEventListener("click", () => (active ? turnOff() : turnOn()));

  await populateDevices();
  render();
}

init();