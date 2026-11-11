/* Optional, synthetic binaural scene. This is an approximation, not a measured room or personalised HRTF. */
export const MOTION_MODES = ['subtle', 'look', 'turn', 'concert', 'walk', 'run', 'bike', 'swing'];
const limit = (n, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(Number(n)) ? Number(n) : lo));

// Returns a listener pose in metres and radians. Multiple incommensurate slow
// oscillations keep the movement from sounding like a short repeating LFO.
export function motionPose(mode, t, strength = 1) {
  const s = limit(strength, 0, 1);
  const drift = Math.sin(t * 0.37) * 0.55 + Math.sin(t * 0.19 + 1.2) * 0.3 + Math.sin(t * 0.73 + 0.4) * 0.15;
  const wave = (rate) => Math.sin(t * rate + 0.13 * Math.sin(t * 0.23));
  let x = 0, y = 0, z = 0, yaw = 0, pitch = 0;
  switch (mode) {
    case 'turn': yaw = t * 0.23 * s + drift * 0.025 * s; break;
    case 'look': yaw = s * (0.52 * wave(0.48) + 0.12 * drift); pitch = s * 0.035 * wave(0.31); break;
    case 'concert': y = s * (0.065 * wave(2.9) + 0.018 * wave(5.8)); pitch = s * (0.15 * wave(2.9) + 0.035 * drift); yaw = s * 0.09 * drift; break;
    case 'walk': x = s * (0.045 * wave(3.2) + 0.24 * wave(0.16)); y = s * 0.035 * wave(6.4); z = s * 0.55 * wave(0.12); yaw = s * (0.08 * wave(3.2) + 0.18 * drift); pitch = s * 0.035 * wave(6.4); break;
    case 'run': x = s * (0.075 * wave(4.6) + 0.25 * wave(0.19)); y = s * 0.085 * wave(9.2); z = s * 0.75 * wave(0.17); yaw = s * (0.11 * wave(4.6) + 0.18 * drift); pitch = s * 0.09 * wave(9.2); break;
    case 'bike': x = s * (0.14 * wave(0.85) + 0.35 * wave(0.14)); y = s * (0.022 * wave(5.1) + 0.015 * wave(8.2)); z = s * 0.85 * wave(0.1); yaw = s * (0.17 * wave(0.85) + 0.14 * drift); pitch = s * 0.045 * wave(1.7); break;
    case 'swing': {
      // A pendulum arc: height rises at both ends, velocity peaks at the bottom.
      const angle = 1.05 * Math.sin(t * 1.35 + 0.06 * Math.sin(t * 0.17));
      z = s * 1.5 * Math.sin(angle);
      y = s * 1.5 * (1 - Math.cos(angle));
      x = s * 0.08 * wave(0.43);
      pitch = s * (0.38 * angle + 0.05 * wave(2.7));
      yaw = s * 0.08 * drift;
      break;
    }
    default: yaw = s * 0.12 * drift; pitch = s * 0.045 * wave(0.53); x = s * 0.018 * wave(0.8);
  }
  return { x, y, z, yaw, pitch };
}

function relative(source, pose) {
  const x = source[0] - pose.x, y = source[1] - pose.y, z = source[2] - pose.z;
  const cy = Math.cos(pose.yaw), sy = Math.sin(pose.yaw);
  const rx = x * cy - z * sy, rz = x * sy + z * cy;
  const cp = Math.cos(pose.pitch), sp = Math.sin(pose.pitch);
  return [rx, y * cp - rz * sp, y * sp + rz * cp];
}

export class ImmersiveAudio {
  constructor(ctx) {
    this.ctx = ctx;
    this.input = ctx.createGain(); this.output = ctx.createGain();
    this.reflectionInput = ctx.createGain(); this.reflectionOutput = ctx.createGain();
    this.dry = ctx.createGain(); this.spatial = ctx.createGain();
    this.spatial.gain.value = 0;
    this.input.connect(this.dry).connect(this.output);
    const split = ctx.createChannelSplitter(2);
    this.input.connect(split);
    this.sources = [[-1, 0.1, -1.8], [1, 0.1, -1.8]].map((pos, i) => {
      const pan = this.panner(); const gain = ctx.createGain(); gain.gain.value = 0.72;
      split.connect(pan, i); pan.connect(gain).connect(this.spatial);
      return { pan, pos };
    });
    this.spatial.connect(this.output);
    // First-order image-source-inspired reflections: unequal paths, damping,
    // directional HRTF and arrival times. Late decay remains the existing IR.
    this.reflections = [
      { pos: [-3, 0.3, -2], factor: 0.23, damp: 6500 },
      { pos: [3, 0.3, -2], factor: 0.21, damp: 5800 },
      { pos: [0.2, -2, -2.4], factor: 0.17, damp: 4200 },
      { pos: [-0.3, 2.5, -2.8], factor: 0.14, damp: 4600 },
      { pos: [1, 0.2, 4], factor: 0.12, damp: 3200 },
    ].map((spec) => {
      const delay = ctx.createDelay(0.35), filter = ctx.createBiquadFilter(), pan = this.panner(), gain = ctx.createGain();
      filter.type = 'lowpass'; filter.frequency.value = Math.min(spec.damp, ctx.sampleRate / 2 - 1);
      gain.gain.value = spec.factor;
      this.reflectionInput.connect(delay).connect(filter).connect(pan).connect(gain).connect(this.reflectionOutput);
      return { ...spec, delay, pan };
    });
    this.reflectionLevel = ctx.createGain();
    this.reflectionLevel.gain.value = 0;
    // Level gate avoids altering the legacy signal when the option is off.
    this.reflectionOutput.connect(this.reflectionLevel);
    this.reflectionOutput = this.reflectionLevel;
    this.timer = null; this.phase = 0; this.lastTime = ctx.currentTime; this.settings = {};
  }
  panner() {
    const p = this.ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse';
    p.refDistance = 2; p.rolloffFactor = 0.16; return p;
  }
  set(param, value, time = 0.08) {
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setTargetAtTime(value, now, time);
  }
  position(panner, pos) {
    this.set(panner.positionX, pos[0]); this.set(panner.positionY, pos[1]); this.set(panner.positionZ, pos[2]);
  }
  configure(settings, preset) {
    const wasMoving = !!this.settings.immersiveMotion;
    this.settings = { ...settings }; this.preset = preset;
    const moving = !!settings.immersiveMotion;
    this.set(this.dry.gain, moving ? 0 : 1); this.set(this.spatial.gain, moving ? 1 : 0);
    const mix = limit(settings.cabin, 0, 1) * (preset.irMix || 0) * (settings.windows ? 0.55 : 1) * (settings.seat === 'rear' ? 1.25 : 1);
    this.set(this.reflectionLevel.gain, settings.advancedReflections ? mix * 0.8 : 0);
    if (moving && !wasMoving) { this.lastTime = this.ctx.currentTime; }
    this.update();
    if (moving && !this.timer) this.timer = setInterval(() => this.update(), 40);
    if (!moving && this.timer) { clearInterval(this.timer); this.timer = null; }
  }
  update() {
    const now = this.ctx.currentTime;
    const dt = Math.max(0, Math.min(now - this.lastTime, 0.2)); this.lastTime = now;
    const speed = limit(this.settings.motionSpeed ?? 1, 0.25, 2);
    if (this.settings.immersiveMotion) this.phase += dt * speed;
    const mode = MOTION_MODES.includes(this.settings.motionMode) ? this.settings.motionMode : 'subtle';
    const pose = this.settings.immersiveMotion ? motionPose(mode, this.phase, this.settings.motionStrength ?? 0.5) : motionPose('subtle', 0, 0);
    for (const source of this.sources) this.position(source.pan, relative(source.pos, pose));
    const size = limit(this.preset?.ir?.size ?? 1, 0.5, 3);
    for (const reflection of this.reflections) {
      const pos = reflection.pos.map(v => v * size);
      const rel = relative(pos, pose); this.position(reflection.pan, rel);
      const distance = Math.hypot(...rel);
      this.set(reflection.delay.delayTime, limit((distance - 1.5) / 343, 0.003, 0.25), 0.12);
    }
  }
  dispose() { if (this.timer) clearInterval(this.timer); this.timer = null; this.input.disconnect(); this.reflectionInput.disconnect(); this.output.disconnect(); this.reflectionOutput.disconnect(); }
}
