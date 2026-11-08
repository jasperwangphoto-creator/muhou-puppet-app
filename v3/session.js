/* Pure session rules. The clock is injected so pause and exact boundaries are testable. */
const nowDefault = () => globalThis.performance?.now?.() ?? Date.now();
export const sessionId = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export class ActiveClock {
  constructor(now = nowDefault) { this.now = now; this.base = 0; this.since = 0; this.running = false; }
  start(elapsed = 0) { this.base = Math.max(0, elapsed); this.since = this.now(); this.running = true; return this; }
  elapsed() { return this.base + (this.running ? Math.max(0, this.now() - this.since) : 0); }
  pause() { if (this.running) { this.base = this.elapsed(); this.running = false; } return this.base; }
  resume() { if (!this.running) { this.since = this.now(); this.running = true; } }
}

export const CHALLENGE_CONFIGS = Object.freeze([
  { id: 'basic', name: '基础动作', difficulty: '入门', holdMs: 900, walkDistance: 48, description: '稳稳亮相，依次完成转身、挥袖与台步。' },
  { id: 'steps', name: '行走台步', difficulty: '进阶', holdMs: 1100, walkDistance: 80, description: '增加台步距离，练习舞台内连续移动。' },
  { id: 'sleeves', name: '翻袖转身', difficulty: '进阶', holdMs: 1400, walkDistance: 60, description: '延长亮相保持，完整收势再接下一招。' },
  { id: 'combined', name: '组合挑战', difficulty: '熟练', holdMs: 1800, walkDistance: 105, description: '稳住双臂，完成更长的组合台步。' }
]);
export const GOALS = Object.freeze([
  { id: 'pose', name: '亮相', hint: '同时按住左臂和右臂，双臂到位后稳住姿势。' },
  { id: 'turn', name: '转身', hint: '完成一次转身，等动作自然收势。' },
  { id: 'sleeve', name: '挥袖', hint: '完成一次挥袖，观察衣袖延迟回落。' },
  { id: 'walk', name: '台步', hint: '拖动摇杆或点行走，在舞台内完成实际位移。' }
]);

export class ChallengeSession {
  constructor({ clock = new ActiveClock(), config = CHALLENGE_CONFIGS[0], durationMs = 60000, makeId = sessionId } = {}) {
    this.clock = clock; this.config = config; this.durationMs = durationMs; this.makeId = makeId;
    this.state = 'idle'; this.count = 0; this.result = null; this.tokens = new Set();
    this.holdSince = null; this.walkDistance = 0; this.previousPoint = null;
  }
  start() {
    if (this.state === 'running' || this.state === 'paused') return false;
    this.id = this.makeId(); this.state = 'running'; this.count = 0; this.result = null;
    this.tokens.clear(); this.holdSince = null; this.walkDistance = 0; this.previousPoint = null;
    this.clock.start(); this.goalSinceWall = this.clock.now(); return true;
  }
  get goal() { return GOALS[this.count] || null; }
  get elapsed() { return Math.min(this.durationMs, this.clock.elapsed()); }
  get remaining() { return Math.max(0, this.durationMs - this.clock.elapsed()); }
  _active() {
    if (this.state !== 'running') return false;
    if (this.clock.elapsed() >= this.durationMs) { this.finish('timeout'); return false; }
    return true;
  }
  _advance() {
    this.count++; this.holdSince = null; this.previousPoint = null; this.goalSinceWall = this.clock.now();
    if (this.count === GOALS.length) this.finish('complete');
  }
  sample(puppet) {
    if (!this._active() || !puppet) return;
    if (this.goal.id === 'pose') {
      const stable = !puppet.busy && puppet.arms?.left && puppet.arms?.right &&
        puppet.pose?.leftShoulder >= 65 && puppet.pose?.rightShoulder <= -65;
      if (!stable) this.holdSince = null;
      else {
        if (this.holdSince === null) this.holdSince = this.clock.elapsed();
        if (this.clock.elapsed() - this.holdSince >= this.config.holdMs) this._advance();
      }
    } else if (this.goal.id === 'walk') {
      const point = { x: Math.max(-40, Math.min(40, (Number(puppet.x) || 0) + (Number(puppet.pose?.walk) || 0))), y: Number(puppet.y) || 0 };
      const moving = Math.hypot(puppet.move?.x || 0, puppet.move?.y || 0) > .03 || puppet.currentAction === 'walk';
      if (moving && this.previousPoint) this.walkDistance += Math.hypot(point.x - this.previousPoint.x, (point.y - this.previousPoint.y) * 1.6);
      this.previousPoint = point;
      if (this.walkDistance >= this.config.walkDistance) this._advance();
    }
  }
  actionComplete(event) {
    if (!this._active() || event?.source !== 'user' || !event.token || this.tokens.has(event.token)) return false;
    this.tokens.add(event.token);
    if (event.startedAt < this.goalSinceWall || !['turn', 'sleeve'].includes(this.goal?.id) || event.id !== this.goal.id) return false;
    this._advance(); return true;
  }
  pause() {
    if (!this._active()) return false;
    this.clock.pause(); this.state = 'paused'; this.holdSince = null; this.previousPoint = null; return true;
  }
  resume() { if (this.state !== 'paused') return false; this.clock.resume(); this.state = 'running'; return true; }
  finish(reason = 'manual') {
    if (this.result || !['running', 'paused'].includes(this.state)) return this.result;
    const durationMs = Math.min(this.durationMs, this.clock.elapsed()); this.clock.pause(); this.state = 'ended';
    const success = this.count === GOALS.length && reason === 'complete' && durationMs < this.durationMs;
    const rating = success ? durationMs <= 40000 ? '优秀' : '良好' : '未完成';
    this.result = { id: this.id, formatVersion: 1, configId: this.config.id, count: this.count,
      score: this.count * 25, durationMs, seconds: Math.ceil(durationMs / 1000), rating, success, reason,
      date: new Date().toISOString(), goals: GOALS.map(goal => goal.id) };
    return this.result;
  }
  snapshot() {
    return { state: this.state, count: this.count, goal: this.goal, remaining: this.remaining, elapsed: this.elapsed,
      holdProgress: this.holdSince === null ? 0 : Math.min(1, (this.clock.elapsed() - this.holdSince) / this.config.holdMs),
      walkProgress: Math.min(1, this.walkDistance / this.config.walkDistance), result: this.result };
  }
}

export class PerformanceSession {
  constructor({ clock = new ActiveClock(), limitMs = 120000, makeId = sessionId } = {}) {
    this.clock = clock; this.limitMs = limitMs; this.makeId = makeId; this.state = 'idle'; this.events = []; this.result = null;
  }
  start(config) {
    if (['running', 'paused'].includes(this.state)) return false;
    this.id = this.makeId(); this.config = { ...config }; this.events = []; this.result = null; this.state = 'running'; this.clock.start(); return true;
  }
  input(event, at = this.clock.elapsed()) {
    if (this.state !== 'running' || !Number.isFinite(at)) return;
    const { type, id, x, y, side, held } = event;
    const recorded = { type, t: Math.max(0, Math.min(at, this.clock.elapsed(), this.limitMs)) };
    if (type === 'action') recorded.id = id;
    else if (type === 'move') Object.assign(recorded, { x, y });
    else if (type === 'arm') Object.assign(recorded, { side, held });
    else if (type !== 'reset') return;
    this.events.push(recorded);
  }
  pause() { if (this.state !== 'running') return false; this.clock.pause(); this.state = 'paused'; return true; }
  resume() { if (this.state !== 'paused') return false; this.clock.resume(); this.state = 'running'; return true; }
  finish(interrupted = false) {
    if (this.result || !['running', 'paused'].includes(this.state)) return this.result;
    const duration = Math.min(this.limitMs, this.clock.elapsed()); this.clock.pause(); this.state = 'ended';
    this.result = { ...this.config, id: this.id, formatVersion: 1, date: new Date().toISOString(), duration,
      events: this.events.map(event => ({ ...event })), interrupted };
    return this.result;
  }
}
