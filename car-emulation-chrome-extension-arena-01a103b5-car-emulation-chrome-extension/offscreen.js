import { CarAudioEngine } from "./car-audio-engine.js";

const pipelines = new Map(); // tabId -> { ctx, stream, source, engine }

async function start(tabId, mode, streamId, deviceId, settings) {
  stop(tabId);

  let stream;
  if (mode === "device") {
    // Force stereo and disable browser voice suppression for FL Studio
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        autoGainControl: false,
        echoCancellation: false,
        noiseSuppression: false,
        channelCount: 2,
      },
      video: false,
    });
  } else {
    // Normal Tab Capture
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
      video: false,
    });
  }

  const ctx = new AudioContext({ latencyHint: "interactive" });
  const source = ctx.createMediaStreamSource(stream);
  const engine = new CarAudioEngine(ctx, settings);
  source.connect(engine.input);
  engine.output.connect(ctx.destination);
  engine.start();

  const track = stream.getAudioTracks()[0];
  if (track) {
    track.addEventListener("ended", () => {
      if (pipelines.get(tabId)?.stream === stream) {
        stop(tabId);
        chrome.runtime
          .sendMessage({ target: "background", type: "CAPTURE_ENDED", tabId })
          .catch(() => {});
      }
    });
  }

  pipelines.set(tabId, { ctx, stream, source, engine });
  if (ctx.state === "suspended") await ctx.resume();
}

function stop(tabId) {
  const p = pipelines.get(tabId);
  if (!p) return;
  pipelines.delete(tabId);
  try {
    p.engine.dispose();
  } catch (_) {}
  try {
    p.stream.getTracks().forEach((t) => t.stop());
  } catch (_) {}
  try {
    p.ctx.close();
  } catch (_) {}
}

function update(tabId, settings) {
  const p = pipelines.get(tabId);
  if (!p) throw new Error("Audio stream is not active");
  p.engine.applySettings(settings);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.target !== "offscreen") return;

  (async () => {
    switch (msg.type) {
      case "START":
        await start(msg.tabId, msg.mode, msg.streamId, msg.deviceId, msg.settings || {});
        return { ok: true };
      case "STOP":
        stop(msg.tabId);
        return { ok: true };
      case "UPDATE":
        update(msg.tabId, msg.settings || {});
        return { ok: true };
      case "PING":
        return { ok: true, tabs: [...pipelines.keys()] };
      default:
        return { ok: false, error: "Unknown message" };
    }
  })()
    .then(sendResponse)
    .catch((e) => sendResponse({ ok: false, error: String(e && e.message ? e.message : e) }));

  return true;
});