export async function initializePlatform({onBack,onPause}) {
  // Browser and installed builds share the same routes, data, and sessions.
  const isNative=globalThis.Capacitor?.isNativePlatform?.() || ['capacitor:','ionic:'].includes(location.protocol);
  if(!isNative)return()=>{};
  const listeners=[];
  try {
    const {App}=await import('../vendor/capacitor-app.js');
    listeners.push(await App.addListener('backButton',()=>{if(onBack()===false)App.minimizeApp();}));
    listeners.push(await App.addListener('appStateChange',({isActive})=>{if(!isActive)onPause();}));
  } catch(error) { console.warn('本机适配层未加载：',error.message); }
  return()=>listeners.forEach(listener=>listener.remove());
}
