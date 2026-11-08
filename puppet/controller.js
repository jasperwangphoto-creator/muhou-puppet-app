import { createCharacter } from './character-v3.js';

export const ACTIONS = Object.freeze([
  { id: 'nod', name: '点头', duration: 1800, tip: '稳住主杖，以颈部为轴轻轻俯仰，收势后再回正。' },
  { id: 'clap', name: '拍手', duration: 2200, tip: '双手杖向胸前合拢，双掌相近，再缓缓展开。' },
  { id: 'turn', name: '转身', duration: 2400, tip: '目光先行，肩身相随，侧转后轻盈回身。' },
  { id: 'sleeve', name: '挥袖', duration: 2600, tip: '提起手杖、舒展手臂，让水袖随动作自然落下。' },
  { id: 'walk', name: '行走', duration: 2700, tip: '主杖平稳移动，配合细小起伏，带出轻盈台步。' }
]);
const byId = Object.fromEntries(ACTIONS.map(a => [a.id, a]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
const rad = Math.PI / 180;
const ease = t => t * t * (3 - 2 * t);
const restPose = () => ({ head:0, nod:0, body:0, turn:1, leftShoulder:14, rightShoulder:-14, leftElbow:-12, rightElbow:12, bob:0, skirt:0, walk:0 });

/* Pure poses also make the animation and its completion contract testable. */
export function actionPose(id, t) {
  t = clamp(t, 0, 1);
  const p = restPose();
  const envelope = Math.sin(Math.PI * t) ** 2;
  if (id === 'nod') {
    p.head = 14 * Math.sin(t * Math.PI * 2) * Math.sin(t * Math.PI);
    p.nod = envelope * (.6 + .4 * Math.sin(t * Math.PI * 4));
  } else if (id === 'clap') {
    const close = Math.sin(Math.PI * t) ** 2;
    p.leftShoulder = 14 - 21 * close; p.rightShoulder = -p.leftShoulder;
    p.leftElbow = -12 - 20 * close; p.rightElbow = -p.leftElbow;
    p.head = -3 * close;
  } else if (id === 'turn') {
    p.turn = 1 - 1.78 * envelope;
    p.head = -18 * Math.sin(2 * Math.PI * t) * Math.sin(Math.PI * t);
    p.leftShoulder += 19 * envelope; p.rightShoulder -= 9 * envelope;
    p.body = 3 * Math.sin(2 * Math.PI * t);
  } else if (id === 'sleeve') {
    const wave = Math.sin(t * Math.PI * 3);
    p.leftShoulder = 14 + envelope * (65 + 17 * wave);
    p.rightShoulder = -14 - envelope * (45 - 15 * wave);
    p.leftElbow = -12 - 24 * envelope * Math.sin(t * Math.PI * 4);
    p.rightElbow = 12 + 28 * envelope * Math.cos(t * Math.PI * 3);
    p.body = -3 * envelope * wave; p.head = 5 * envelope * wave;
  } else if (id === 'walk') {
    const gait = Math.sin(t * Math.PI * 8) * envelope;
    p.leftShoulder += 16 * gait; p.rightShoulder += 16 * gait;
    p.bob = -4 * Math.abs(gait); p.skirt = 4 * gait;
    // A complete, visible passage returns to its origin, including at a boundary.
    p.walk = Math.sin(t * Math.PI * 2) * 28 * Math.sin(t * Math.PI);
  }
  return p;
}

let controllerSerial = 0;
export class PuppetController {
  constructor(hostElement, options = {}) {
    if (!hostElement) throw new Error('PuppetController requires a stage host');
    this.host = hostElement;
    this.options = options;
    this.id = ++controllerSerial;
    this.character = (options.characterFactory || createCharacter)(hostElement, options.composition || options.color || 0);
    this.position = { x:0, y:0 };
    this.move = { x:0, y:0 };
    this.arms = { left:false, right:false };
    this.pose = restPose();
    this.sleeves = { left:0, right:0 };
    this.active = null;
    this.serial = 0;
    this.destroyed = false;
    this.paused = false;
    this.time = 0;
    this.lastFrame = null;
    this.lastNotify = -Infinity;
    this.lastStatus = '';
    this.host.__puppet = this;
    this._frame = now => { this._tick(now); if (!this.destroyed && !this.paused) this.raf = requestAnimationFrame(this._frame); };
    this.raf = requestAnimationFrame(this._frame);
    this._render();
    this._notify(true);
  }
  trigger(id, { source = 'user' } = {}) {
    if (this.destroyed || this.active || !byId[id]) return false;
    const startedAt = performance.now();
    this.active = { id, source, startedAt, elapsed:0, settling:0, token:`${this.id}:${++this.serial}` };
    this._input({ type:'action', id, token:this.active.token }, source);
    this._notify(true);
    return true;
  }
  setMove(x, y, { source = 'user' } = {}) {
    if (this.destroyed) return;
    x = clamp(x, -1, 1); y = clamp(y, -1, 1);
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    if (Math.abs(x-this.move.x) < .005 && Math.abs(y-this.move.y) < .005) return;
    this.move = { x,y };
    this._input({ type:'move', x,y }, source);
    this._notify(true);
  }
  setArm(side, held, { source = 'user' } = {}) {
    if (this.destroyed || !['left','right'].includes(side) || this.arms[side] === !!held) return;
    this.arms[side] = !!held;
    this._input({ type:'arm', side, held:!!held }, source);
    this._notify(true);
  }
  stopInputs() {
    this.setMove(0,0);
    this.setArm('left',false); this.setArm('right',false);
  }
  reset({ source = 'user' } = {}) {
    if (this.destroyed) return;
    this.active = null;
    this.position = { x:0,y:0 }; this.move = { x:0,y:0 };
    this.arms = { left:false,right:false }; this.pose = restPose();
    this.sleeves = { left:0,right:0 };
    this._input({ type:'reset' }, source);
    this._render(); this._notify(true);
  }
  snapshot() {
    const moving = Math.hypot(this.move.x,this.move.y) > .03;
    const actionName = this.active ? byId[this.active.id].name : '';
    const arms = this.arms.left && this.arms.right ? '双臂抬起' : this.arms.left ? '左臂抬起' : this.arms.right ? '右臂抬起' : '';
    const status = [moving ? '移动' : '', actionName, arms].filter(Boolean).join(' · ') || '待机';
    return { x:this.position.x, y:this.position.y, currentAction:this.active?.id || null,
      status, busy:!!this.active, pose:{ ...this.pose }, move:{...this.move}, arms:{...this.arms},
      progress:this.active ? Math.min(1,this.active.elapsed / byId[this.active.id].duration) : 0 };
  }
  setColor(color=0) {
    this.character.dispose?.();
    this.character=createCharacter(this.host,color);
    this._render();
  }
  async setComposition(composition) {
    if(this.destroyed || !this.character.setComposition)return false;
    this.stopInputs();
    const ready=await this.character.setComposition(composition);
    if(!ready || this.destroyed)return false;
    this.reset({source:'selection'});
    return true;
  }
  pause() {
    if(this.destroyed || this.paused)return;
    this.stopInputs();this.paused=true;cancelAnimationFrame(this.raf);
  }
  resume() {
    if(this.destroyed || !this.paused)return;
    this.paused=false;this.lastFrame=null;this.raf=requestAnimationFrame(this._frame);
  }
  _input(event, source) {
    if (source === 'user') this.options.onInput?.({ ...event, at:performance.now() });
  }
  _notify(force = false) {
    const state = this.snapshot();
    if (force || state.status !== this.lastStatus || this.time - this.lastNotify > 100) {
      this.lastNotify = this.time; this.lastStatus = state.status;
      this.host.dataset.puppetState = state.status;
      this.host.dataset.puppetAction = state.currentAction || 'idle';
      this.options.onStateChange?.(state);
    }
  }
  _tick(now) {
    if (this.destroyed || this.paused) return;
    const dt = this.lastFrame == null ? 16.667 : clamp(now-this.lastFrame,0,50);
    this.lastFrame = now; this.time += dt;
    const moving = Math.hypot(this.move.x,this.move.y) > .03;
    // Reserve room for fully extended arms and their hanging sleeves at either edge.
    this.position.x = clamp(this.position.x + this.move.x * dt * .061, -40,40);
    this.position.y = clamp(this.position.y + this.move.y * dt * .024, -6,12);
    let target = restPose();
    if (this.active) {
      this.active.elapsed += dt;
      target = actionPose(this.active.id, this.active.elapsed / byId[this.active.id].duration);
    }
    const breath = Math.sin(this.time / 670);
    target.bob += moving ? -2.4 * Math.abs(Math.sin(this.time/115)) : breath * .6;
    if (moving) {
      const gait = Math.sin(this.time / 145);
      target.leftShoulder += 9*gait; target.rightShoulder += 9*gait;
      target.skirt += 2.5*gait;
    }
    target.leftShoulder += this.arms.left ? 77 : 0;
    target.rightShoulder -= this.arms.right ? 77 : 0;
    target.leftShoulder = clamp(target.leftShoulder,-36,102);
    target.rightShoulder = clamp(target.rightShoulder,-102,36);
    const blend = 1-Math.exp(-dt/78);
    for (const key of Object.keys(this.pose)) this.pose[key] += (target[key]-this.pose[key])*blend;
    // Independent hanging sleeves lag the shoulder/elbow changes, then settle.
    for (const side of ['left','right']) {
      const sign = side === 'left' ? 1 : -1;
      const sleeveTarget = sign * this.pose[`${side}Shoulder`] * .12 + Math.sin(this.time/520)*1.2;
      this.sleeves[side] += (sleeveTarget-this.sleeves[side])*(1-Math.exp(-dt/160));
    }
    this._render();
    if (this.active && this.active.elapsed >= byId[this.active.id].duration) {
      this.active.settling += dt;
      // Action completes after its end pose has smoothly reached rest, never on a click.
      if (this.active.settling >= 260) {
        const event = { id:this.active.id, token:this.active.token, source:this.active.source,
          startedAt:this.active.startedAt, completedAt:now };
        this.active = null;
        this._notify(true);
        this.options.onActionComplete?.(event);
      }
    }
    this._notify();
  }
  _render() {
    if(this.character.render){
      this.character.render(this.pose,this.position,this.sleeves);
      this.host.dataset.puppetX=this.position.x.toFixed(2);this.host.dataset.puppetY=this.position.y.toFixed(2);
      return;
    }
    const p = this.pose, part = this.character.parts;
    const actionX = clamp(this.position.x+p.walk,-40,40);
    part.character.setAttribute('transform',`translate(${200+actionX} ${270+this.position.y+p.bob}) scale(${p.turn} 1) rotate(${p.body})`);
    part.head.setAttribute('transform',`translate(0 ${-148+p.nod*4}) rotate(${p.head} 0 14) scale(1 ${1-p.nod*.11})`);
    part.skirt.setAttribute('transform',`rotate(${p.skirt} 0 -40)`);
    part.shadow.setAttribute('cx',200+actionX);
    part.shadow.setAttribute('cy',354+this.position.y);
    part.shadow.setAttribute('rx',Math.max(30,61*Math.abs(p.turn)));
    for (const side of ['left','right']) {
      const x = side === 'left' ? -32 : 32;
      const shoulder = p[`${side}Shoulder`], elbow = p[`${side}Elbow`];
      part[`${side}-upper-arm`].setAttribute('transform',`translate(${x} -130) rotate(${shoulder})`);
      part[`${side}-forearm`].setAttribute('transform',`translate(0 44) rotate(${elbow})`);
      const wristX = x - 44*Math.sin(shoulder*rad)-44*Math.sin((shoulder+elbow)*rad);
      const wristY = -130+44*Math.cos(shoulder*rad)+44*Math.cos((shoulder+elbow)*rad);
      part[`${side}-sleeve`].setAttribute('transform',`translate(${wristX} ${wristY-8}) rotate(${this.sleeves[side]})`);
    }
    this.host.dataset.puppetX = this.position.x.toFixed(2);
    this.host.dataset.puppetY = this.position.y.toFixed(2);
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.character.dispose?.();
    this.active = null; this.move={x:0,y:0}; this.arms={left:false,right:false};
    if (this.host.__puppet === this) delete this.host.__puppet;
  }
}
