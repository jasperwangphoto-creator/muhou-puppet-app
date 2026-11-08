import {esc,button} from './core.js';

export const theatreVideos={
  huahaoyueyuan:{
    title:'花好月圆',
    src:'./assets/theatre-video/huahaoyueyuan-720p.mp4',
    poster:'./assets/theatre-video/huahaoyueyuan-poster.jpg',
    duration:347.673
  }
};

const learningARVideo={title:'AR 木偶演示',src:'./assets/learn-video/ar-puppet-demo.mp4',poster:'./assets/learn-video/ar-puppet-poster.jpg'};

export function openTheatreVideo(id,ctx,options={}){
  const learningAR=id==='learn-ar';
  const media=learningAR?learningARVideo:Object.hasOwn(theatreVideos,id)?theatreVideos[id]:null;
  if(!media)return()=>{};
  const heading=learningAR?media.title:`《${media.title}》`;
  ctx.openModal(`<div class="theatre-video-dialog"><h2 id="theatre-video-title">${esc(heading)}</h2><p class="theatre-video-caption">${learningAR?'AR 演示视频 · 10秒':'演出视频 · 5分48秒'}</p><video class="theatre-video-player" src="${esc(media.src)}" poster="${esc(media.poster)}" controls playsinline preload="metadata" tabindex="0" aria-label="${esc(heading)}${learningAR?'视频':'演出视频'}"></video><p class="theatre-video-status" role="status">视频加载中…</p><button class="paper-button outline theatre-video-retry" hidden>重新播放</button>${learningAR?'':`<div class="theatre-video-footer">${button('查看剧目介绍',`theatre/plays/${id}`,'outline')}</div>`}</div>`,{kind:'video',id,time:options.time||0});
  const modalRoot=document.querySelector('#modal-root');
  const dialog=modalRoot.querySelector('.paper-modal');
  dialog.classList.add('theatre-video-modal');
  if(learningAR)dialog.classList.add('learn-ar-video-modal');
  dialog.setAttribute('aria-labelledby','theatre-video-title');
  const video=dialog.querySelector('video');
  const status=dialog.querySelector('.theatre-video-status');
  const retry=dialog.querySelector('.theatre-video-retry');
  let disposed=false;
  const loading=()=>{status.textContent='正在缓冲…';status.hidden=false;};
  const ready=()=>{status.hidden=true;retry.hidden=true;};
  const error=()=>{status.textContent='视频暂时无法播放，请重试。';status.hidden=false;retry.hidden=false;};
  const play=()=>{
    const request=video.play();
    request?.catch(reason=>{
      if(disposed||reason.name==='AbortError')return;
      if(reason.name==='NotAllowedError'){status.textContent='点击播放器中的播放按钮开始观看。';status.hidden=false;}
      else error();
    });
  };
  const restart=()=>{video.load();play();};
  const visibility=()=>{if(document.hidden)video.pause();};
  video.addEventListener('waiting',loading);
  video.addEventListener('canplay',ready);
  video.addEventListener('playing',ready);
  video.addEventListener('error',error);
  retry.addEventListener('click',restart);
  document.addEventListener('visibilitychange',visibility);
  const observer=new MutationObserver(()=>{if(!video.isConnected)dispose();});
  function dispose(){
    if(disposed)return;
    disposed=true;observer.disconnect();
    document.removeEventListener('visibilitychange',visibility);
    video.removeEventListener('waiting',loading);
    video.removeEventListener('canplay',ready);
    video.removeEventListener('playing',ready);
    video.removeEventListener('error',error);
    retry.removeEventListener('click',restart);
    video.pause();video.removeAttribute('src');video.load();
  }
  observer.observe(modalRoot,{childList:true,subtree:true});
  if(options.restored){
    const restoreTime=()=>{if(disposed)return;video.currentTime=Math.min(Number(options.time)||0,Number.isFinite(video.duration)?video.duration:0);video.pause();status.textContent='已恢复观看位置，点击播放继续';status.hidden=false;};
    video.addEventListener('loadedmetadata',restoreTime,{once:true});
    video.load();
  }else play();
  return dispose;
}
