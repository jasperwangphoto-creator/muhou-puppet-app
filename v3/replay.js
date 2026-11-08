import { ActiveClock } from './session.js';

/* A single deterministic timeline drives live recordings and their replay alike. */
export class ControllerTimeline {
  constructor(controller, { stepMs = 1000 / 120 } = {}) {
    this.controller = controller; this.stepMs = stepMs; this.cursor = 0; this.step = 0;
    cancelAnimationFrame(controller.raf); controller.lastFrame = 0; controller.time = 0;
  }
  reset() { this.controller.reset({ source: 'timeline' }); this.controller.lastFrame = 0; this.controller.time = 0; this.cursor = 0; this.step = 0; }
  advanceTo(target) {
    const targetStep = Math.max(this.step, Math.floor((Number(target) || 0) / this.stepMs + .000001));
    while (this.step < targetStep && !this.controller.destroyed) {
      this.cursor = ++this.step * this.stepMs;
      this.controller._tick(this.cursor);
    }
  }
  apply(event) {
    const options = { source: 'replay' };
    if (event.type === 'action') {
      if (!this.controller.trigger(event.id, options)) throw new Error('回放动作时间线冲突，记录版本可能不兼容');
    } else if (event.type === 'move') this.controller.setMove(event.x, event.y, options);
    else if (event.type === 'arm') this.controller.setArm(event.side, event.held, options);
    else if (event.type === 'reset') this.controller.reset(options);
  }
}

export class ReplayTimeline {
  constructor(record, sink, { clock = new ActiveClock() } = {}) {
    this.record = record; this.sink = sink; this.clock = clock; this.state = 'idle'; this.index = 0; this.position = 0;
  }
  play() { if (this.state === 'paused') return this.resume(); this.restart(); }
  restart() { this.sink.reset(); this.index = 0; this.position = 0; this.clock.start(); this.state = 'running'; }
  update() {
    if (this.state !== 'running') return;
    const target = Math.min(this.record.duration, this.clock.elapsed());
    while (this.index < this.record.events.length && this.record.events[this.index].t <= target) {
      const event = this.record.events[this.index++]; this.sink.advanceTo(event.t); this.sink.apply(event);
    }
    this.sink.advanceTo(target); this.position = target;
    if (target >= this.record.duration) { this.clock.pause(); this.state = 'ended'; }
  }
  pause() { if (this.state !== 'running') return false; this.update(); if (this.state === 'ended') return false; this.clock.pause(); this.state = 'paused'; return true; }
  resume() { if (this.state !== 'paused') return false; this.clock.resume(); this.state = 'running'; return true; }
  stop() { this.clock.pause(); this.state = 'stopped'; }
}
