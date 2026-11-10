/*
 * CarAudio – background service worker
 * Routes messages between the popup and the offscreen audio processor,
 * keeps track of which tabs/devices are being processed, and manages badges.
 */

const OFFSCREEN_URL = "offscreen.html";
let creatingOffscreen = null;

async function hasOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  return contexts.length > 0;
}

async function ensureOffscreen() {
  if (await hasOffscreen()) return;
  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_URL,
        reasons: ["USER_MEDIA"],
        justification:
          "Process captured tab or line-in audio through the car-cabin DSP chain and play it back.",
      })
      .finally(() => {
        creatingOffscreen = null;
      });
  }
  await creatingOffscreen;
}

async function closeOffscreenIfIdle() {
  const state = await getState();
  if (Object.keys(state.activeTabs).length === 0 && (await hasOffscreen())) {
    try {
      await chrome.offscreen.closeDocument();
    } catch (_) {
      /* ignore */
    }
  }
}

async function getState() {
  const { activeTabs = {} } = await chrome.storage.session.get("activeTabs");
  return { activeTabs };
}

async function setActive(tabId, settings) {
  const { activeTabs } = await getState();
  activeTabs[tabId] = settings;
  await chrome.storage.session.set({ activeTabs });
  await chrome.storage.local.set({ lastSettings: settings });
  setBadge(tabId, true);
}

async function clearActive(tabId) {
  const { activeTabs } = await getState();
  delete activeTabs[tabId];
  await chrome.storage.session.set({ activeTabs });
  setBadge(tabId, false);
}

function setBadge(tabId, on) {
  if (typeof tabId !== "number") {
    try {
      chrome.action.setBadgeText({ text: on ? "FL" : "" });
      chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" });
      chrome.action.setBadgeTextColor?.({ color: "#1a1108" });
    } catch (_) {}
    return;
  }
  try {
    chrome.action.setBadgeText({ tabId, text: on ? "ON" : "" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#f59e0b" });
    chrome.action.setBadgeTextColor?.({ tabId, color: "#1a1108" });
  } catch (_) {
    /* tab may be gone */
  }
}

function toOffscreen(msg) {
  return chrome.runtime.sendMessage({ ...msg, target: "offscreen" });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.target !== "background") return;

  (async () => {
    switch (msg.type) {
      case "START": {
        await ensureOffscreen();
        const res = await toOffscreen({
          type: "START",
          mode: msg.mode,
          tabId: msg.tabId,
          streamId: msg.streamId,
          deviceId: msg.deviceId,
          settings: msg.settings,
        });
        if (res && res.ok) await setActive(msg.tabId, msg.settings);
        return res || { ok: false, error: "No response from audio processor" };
      }
      case "STOP": {
        if (await hasOffscreen()) {
          try {
            await toOffscreen({ type: "STOP", tabId: msg.tabId });
          } catch (_) {
            /* ignore */
          }
        }
        await clearActive(msg.tabId);
        await closeOffscreenIfIdle();
        return { ok: true };
      }
      case "UPDATE": {
        const { activeTabs } = await getState();
        if (!activeTabs[msg.tabId]) return { ok: false, error: "Not active" };
        await setActive(msg.tabId, msg.settings);
        try {
          return await toOffscreen({
            type: "UPDATE",
            tabId: msg.tabId,
            settings: msg.settings,
          });
        } catch (e) {
          return { ok: false, error: String(e && e.message ? e.message : e) };
        }
      }
      case "GET_STATE": {
        const { activeTabs } = await getState();
        const { lastSettings } = await chrome.storage.local.get("lastSettings");

        let active = !!activeTabs[msg.tabId] || !!activeTabs["fl-studio"];
        let isTabActive = !!activeTabs[msg.tabId];
        let isFLActive = !!activeTabs["fl-studio"];

        if (active && !(await hasOffscreen())) {
          active = false;
          if (isTabActive) await clearActive(msg.tabId);
          if (isFLActive) await clearActive("fl-studio");
        }

        return {
          ok: true,
          active,
          mode: isFLActive ? "device" : "tab",
          settings: active
            ? activeTabs[msg.tabId] || activeTabs["fl-studio"]
            : lastSettings || null,
          activeCount: Object.keys(activeTabs).length,
        };
      }
      case "CAPTURE_ENDED": {
        await clearActive(msg.tabId);
        await closeOffscreenIfIdle();
        return { ok: true };
      }
      default:
        return { ok: false, error: "Unknown message" };
    }
  })()
    .then(sendResponse)
    .catch((e) => sendResponse({ ok: false, error: String(e && e.message ? e.message : e) }));

  return true; // async response
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { activeTabs } = await getState();
  if (activeTabs[tabId]) {
    if (await hasOffscreen()) {
      try {
        await toOffscreen({ type: "STOP", tabId });
      } catch (_) {
        /* ignore */
      }
    }
    await clearActive(tabId);
    await closeOffscreenIfIdle();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.session.set({ activeTabs: {} });
});