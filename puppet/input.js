/* Each pointer owns one control, so joystick and either arm work simultaneously. */
export function bindPuppetInputs(root, controller) {
  const cleanup = [], pointers = new Map(), keys = new Set();
  const joy = root.querySelector('[data-joystick]');
  const knob = joy?.querySelector('.joystick-knob');
  let joystickPointer = null;
  let pointerMove = {x:0,y:0};
  let disposed = false;
  const listen = (el,event,fn,options) => { el?.addEventListener(event,fn,options); cleanup.push(()=>el?.removeEventListener(event,fn,options)); };
  const keyboardMove = () => ({ x:(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0), y:(keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0) });
  const updateMove = () => { const k=keyboardMove(); controller.setMove(pointerMove.x || k.x,pointerMove.y || k.y); };
  const updateArm = side => {
    const held = keys.has(side === 'left'?'q':'e') || [...pointers.values()].some(v=>v.type==='arm'&&v.side===side);
    controller.setArm(side,held);
    root.querySelectorAll(`[data-hold-arm="${side}"]`).forEach(el=>el.classList.toggle('is-held',held));
  };
  const resetJoystick = () => { pointerMove={x:0,y:0}; joystickPointer=null; joy?.classList.remove('is-held'); if(knob)knob.style.transform='translate(0px, 0px)'; updateMove(); };
  const moveJoystick = event => {
    if (event.pointerId !== joystickPointer || !joy) return;
    const rect=joy.getBoundingClientRect(), radius=Math.min(rect.width,rect.height)*.29;
    let x=event.clientX-(rect.left+rect.width/2),y=event.clientY-(rect.top+rect.height/2);
    const d=Math.hypot(x,y); if(d>radius){x=x/d*radius;y=y/d*radius;}
    const normalized=Math.hypot(x,y)/radius;
    pointerMove = normalized < .1 ? {x:0,y:0} : {x:x/radius,y:y/radius};
    if(knob)knob.style.transform=`translate(${x}px, ${y}px)`;
    updateMove();
  };
  const release = event => {
    const item=pointers.get(event.pointerId); if(!item)return;
    pointers.delete(event.pointerId);
    if(item.type==='joystick')resetJoystick();
    if(item.type==='arm')updateArm(item.side);
    try{if(item.el.hasPointerCapture(event.pointerId))item.el.releasePointerCapture(event.pointerId);}catch{}
  };
  const onDown = event => {
    if(root.dataset.inputDisabled==='true')return;
    if(event.button!==0 && event.pointerType==='mouse')return;
    const el=event.target.closest('[data-joystick],[data-hold-arm],[data-puppet-action],[data-puppet-reset]');
    if(!el || !root.contains(el) || el.disabled)return;
    event.preventDefault();
    if(el.hasAttribute('data-joystick')){
      if(joystickPointer!==null)return;
      joystickPointer=event.pointerId;
      pointers.set(event.pointerId,{type:'joystick',el});joy?.classList.add('is-held');
      moveJoystick(event);
    }else if(el.dataset.holdArm){
      pointers.set(event.pointerId,{type:'arm',side:el.dataset.holdArm,el});updateArm(el.dataset.holdArm);
    }else if(el.dataset.puppetAction){
      controller.trigger(el.dataset.puppetAction);
    }else if(el.hasAttribute('data-puppet-reset')){
      clearAll();controller.reset();
    }
    try{el.setPointerCapture(event.pointerId);}catch{}
  };
  const clearAll = () => {
    for(const [id,item] of pointers){try{if(item.el.hasPointerCapture(id))item.el.releasePointerCapture(id);}catch{}}
    pointers.clear();keys.clear();resetJoystick();updateArm('left');updateArm('right');controller.stopInputs();
  };
  const editable = event => event.target.closest('input,textarea,select,[contenteditable="true"]');
  const controlled = new Set(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','q','e','1','2','3','4','5','r']);
  const onKeyDown = event => {
    if(root.dataset.inputDisabled==='true')return;
    const key=event.key.toLowerCase();if(!controlled.has(key)||editable(event)||event.metaKey||event.ctrlKey||event.altKey)return;
    event.preventDefault();if(event.repeat||keys.has(key))return;keys.add(key);
    if(['1','2','3','4','5'].includes(key))controller.trigger(['nod','clap','turn','sleeve','walk'][Number(key)-1]);
    else if(key==='r'){clearAll();controller.reset();}
    else {updateMove();updateArm('left');updateArm('right');}
  };
  const onKeyUp = event => { const key=event.key.toLowerCase();if(!controlled.has(key))return;keys.delete(key);if(root.dataset.inputDisabled==='true')return;updateMove();updateArm('left');updateArm('right'); };
  listen(root,'pointerdown',onDown);
  listen(window,'pointermove',event=>{
    const item=pointers.get(event.pointerId);if(!item)return;
    event.preventDefault();
    const box=item.el.getBoundingClientRect();
    if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom){release(event);return;}
    moveJoystick(event);
  },{passive:false});
  listen(window,'pointerup',release);listen(window,'pointercancel',release);
  listen(root,'lostpointercapture',release);
  // Explicit bounds checking above also releases captured touches that leave a control.
  root.querySelectorAll('[data-hold-arm]').forEach(el=>listen(el,'pointerleave',release));
  listen(window,'keydown',onKeyDown);listen(window,'keyup',onKeyUp);listen(window,'blur',clearAll);
  listen(document,'visibilitychange',()=>{if(document.hidden)clearAll();});
  // Native keyboard/screen-reader activation still works without duplicate pointer clicks.
  listen(root,'click',event=>{if(root.dataset.inputDisabled==='true'||event.detail!==0)return;const el=event.target.closest('[data-puppet-action],[data-puppet-reset]');if(!el||el.disabled)return;if(el.hasAttribute('data-puppet-reset')){clearAll();controller.reset();}else controller.trigger(el.dataset.puppetAction);});
  const inputObserver = new MutationObserver(()=>{if(root.dataset.inputDisabled==='true')clearAll();});
  inputObserver.observe(root,{attributes:true,attributeFilter:['data-input-disabled']});
  cleanup.push(()=>inputObserver.disconnect());
  const dispose = () => {if(disposed)return;disposed=true;clearAll();cleanup.forEach(fn=>fn());};
  dispose.clear = clearAll;
  return dispose;
}
