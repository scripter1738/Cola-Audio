import { test } from 'node:test';
import assert from 'node:assert/strict';
import { motionPose, ImmersiveAudio, MOTION_MODES } from '../immersive-audio.js';
import { DEFAULT_SETTINGS, PRESETS } from '../car-audio-engine.js';

class Param {
  constructor(value = 0) { this.value = value; }
  cancelScheduledValues() {}
  setTargetAtTime(value) { assert.ok(Number.isFinite(value)); this.value = value; }
}
class Node {
  constructor() { this.gain = new Param(1); this.delayTime = new Param(); this.frequency = new Param(); this.positionX = new Param(); this.positionY = new Param(); this.positionZ = new Param(); }
  connect(node) { return node; }
  disconnect() {}
}
class Context {
  constructor() { this.currentTime = 0; this.sampleRate = 48000; }
  createGain() { return new Node(); }
  createChannelSplitter() { return new Node(); }
  createPanner() { return new Node(); }
  createDelay() { return new Node(); }
  createBiquadFilter() { return new Node(); }
}

test('all motion modes are finite, varied, and neutral at zero strength', () => {
  for (const mode of MOTION_MODES) {
    const a = motionPose(mode, 0.5, 1), b = motionPose(mode, 3.5, 1);
    assert.notDeepEqual(a, b, mode);
    assert.ok(Object.values(a).every(Number.isFinite), mode);
    assert.ok(Object.values(motionPose(mode, 8, 0)).every(v => v === 0), mode);
  }
});

test('swing follows a rising arc at both ends, lowest at the centre', () => {
  const bottom = motionPose('swing', 0, 1);
  const high = motionPose('swing', Math.PI / (2 * 1.35), 1);
  const otherHigh = motionPose('swing', 3 * Math.PI / (2 * 1.35), 1);
  assert.ok(high.y > bottom.y + 0.5 && otherHigh.y > bottom.y + 0.5);
  assert.ok(high.z * otherHigh.z < 0);
});

test('independent toggles, controls and timer cleanup', () => {
  const ctx = new Context(), spatial = new ImmersiveAudio(ctx);
  const preset = PRESETS.sedan;
  spatial.configure(DEFAULT_SETTINGS, preset);
  assert.equal(spatial.dry.gain.value, 1); assert.equal(spatial.spatial.gain.value, 0);
  assert.equal(spatial.reflectionLevel.gain.value, 0); assert.equal(spatial.timer, null);
  spatial.configure({ ...DEFAULT_SETTINGS, advancedReflections: true }, preset);
  assert.ok(spatial.reflectionLevel.gain.value > 0); assert.equal(spatial.spatial.gain.value, 0);
  spatial.configure({ ...DEFAULT_SETTINGS, immersiveMotion: true, motionMode: 'swing' }, preset);
  assert.equal(spatial.dry.gain.value, 0); assert.equal(spatial.reflectionLevel.gain.value, 0);
  assert.ok(spatial.timer);
  ctx.currentTime = 0.1; spatial.update(); assert.ok(spatial.phase > 0);
  spatial.configure({ ...DEFAULT_SETTINGS, advancedReflections: true, cabin: 0 }, preset);
  assert.equal(spatial.reflectionLevel.gain.value, 0); assert.equal(spatial.timer, null);
  spatial.dispose();
});

test('every preset and motion mode can be configured together', () => {
  const ctx = new Context(), spatial = new ImmersiveAudio(ctx);
  for (const preset of Object.values(PRESETS)) {
    for (const mode of MOTION_MODES) {
      spatial.configure({ ...DEFAULT_SETTINGS, immersiveMotion: true, advancedReflections: true, motionMode: mode, motionSpeed: 2, motionStrength: 1 }, preset);
      ctx.currentTime += 0.04; spatial.update();
      for (const r of spatial.reflections) assert.ok(r.delay.delayTime.value >= 0.003 && r.delay.delayTime.value <= 0.25);
    }
  }
  spatial.dispose(); assert.equal(spatial.timer, null);
});
