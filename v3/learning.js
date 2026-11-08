import {renderWorkshop,mountWorkshop} from './workshop.js';
import {openTheatreVideo,theatreVideos} from './theatre-video.js';
import {art,esc,icon,button,section,title,plays,playImage,CULTURE} from './core.js';
let theatreTab='today',hotspot='head';
const roles=['生角','武生','旦角','丑角','包公','嫦娥','白骨精','铁扇公主'];
const lessons=[['认识木偶','puppet'],['制作工坊','workshop'],['操偶课堂','control']];
const cultureIcons={origin:'culture-history',art:'culture-art',performance:'culture-performance',value:'culture-value'};
const parts={head:['头部','眉眼、面部彩绘与神态塑造角色的性格。'],costume:['服饰','衣纹、色彩与头饰共同提示角色的身份。'],rod:['杖杆','主杖稳定头身，手杖帮助双手完成动作。'],joint:['操控机关','肩、肘与颈部的协调，让动作连贯自然。']};
function hero(kind){return `<div class="design-hero hero-${kind}"><img src="${art(`hero-${kind}.png`)}" alt="${kind==='theatre'?'戏台 · 泰兴杖头木偶戏，一方舞台演绎百年风华':'学艺 · 从认识木偶到亲手让它动起来'}"><button class="hero-search icon-button" data-action="search" aria-label="搜索">${icon('search')}</button></div>`;}
function playTiles(list=plays.slice(2)){return `<div class="classic-grid">${list.filter(p=>!['nvfuma','baigujing'].includes(p.id)).map(p=>`<button class="classic-card" data-go="theatre/plays/${p.id}"><img src="${playImage(p)}" alt="${p.name}木偶剧照"><h3>《${p.name}》</h3><small>${p.role} | 经典</small></button>`).join('')}</div>`;}
const theatreArt = name => `./assets/theatre-home-v2/${name}.png`;
const theatreClassics = [['muguiying','穆桂英挂帅','京剧 | 传奇'],['jiangtaigong','姜太公钓鱼','神话 | 传说'],['hongse','红色娘子军','现代 | 革命'],['shajiabang','沙家浜','现代 | 革命']];
function theatreSection(label,route,more='查看更多'){return `<div class="section-title theatre-home-section"><h2><img src="${theatreArt('section-flower')}" alt="">${label}</h2><button class="text-button" data-go="${route}">${more} <span aria-hidden="true">→</span></button></div>`;}
function theatre(){return `<section class="learning-page theatre-page theatre-home" aria-label="戏台首页">
  <header class="theatre-home-hero">
    <img class="theatre-home-hero-art" src="${theatreArt('hero')}" width="850" height="350" alt="凤冠红衣木偶与水墨楼阁，戏台书法题字">
    <h1 class="theatre-home-sr-only">戏台</h1><div class="theatre-home-intro"><h2>泰兴杖头木偶戏</h2><p>一方舞台，演绎百年风华</p></div>
    <div class="theatre-home-tools"><button data-action="search" aria-label="搜索">${icon('search')}</button><button data-learn="scan-info" aria-label="扫一扫">${icon('scan')}</button></div>
  </header>
  <nav class="theatre-tabs theatre-home-tabs" aria-label="戏台分类">${[['today','今日剧目'],['classic','经典剧目'],['culture','木偶戏文化']].map(([id,label])=>`<button data-learn="theatre-tab" data-value="${id}" aria-pressed="${theatreTab===id}" class="${theatreTab===id?'selected':''}"><span class="theatre-home-fan" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M2 12C3 2 21 2 22 12L13 19h-2ZM5 8l6 10m-1-13 2 13m3-13-2 13m6-10-6 10M10 21h4"/></svg></span>${label}<span class="theatre-home-fan" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M2 12C3 2 21 2 22 12L13 19h-2ZM5 8l6 10m-1-13 2 13m3-13-2 13m6-10-6 10M10 21h4"/></svg></span></button>`).join('')}</nav>
  <div class="theatre-home-content">
    ${theatreTab==='today'?`<article class="today-play theatre-home-today" aria-label="今日上演：花好月圆"><img class="theatre-home-panel-art" src="${theatreArt('today')}" width="786" height="272" alt="蓝衣与红衣木偶相对而立，演绎花好月圆"><button class="theatre-home-watch" data-go="theatre/plays/huahaoyueyuan" aria-label="查看《花好月圆》剧目详情"><span class="theatre-home-watch-icon" aria-hidden="true">${icon('play')}</span></button><span class="theatre-home-ribbon">今日上演</span><div class="theatre-home-today-copy"><h2>《花好月圆》</h2><p><span class="theatre-home-time">${icon('clock')}05:48</span><span>${icon('play')}演出视频</span></p><button class="theatre-home-ticket" data-go="theatre/plays/huahaoyueyuan">查看剧目 <span aria-hidden="true">→</span></button></div></article>`:''}
    ${['today','classic'].includes(theatreTab)?`<section class="theatre-home-classic-section" aria-label="经典剧目">${theatreSection('经典剧目','theatre/classics')}<div class="classic-grid theatre-home-classics">${theatreClassics.map(([id,name,tag])=>`<button class="classic-card theatre-home-card" data-go="theatre/plays/${id}" aria-label="《${name}》 ${tag}"><img src="${theatreArt(`play-${id}`)}" width="178" height="151" alt="${name}木偶造型"><span class="theatre-home-card-copy" style="background-image:url('${theatreArt(`card-${id}`)}')"><span class="theatre-home-card-title">《${name}》</span><small>${tag}<span aria-hidden="true">→</span></small></span></button>`).join('')}</div></section>`:''}
    ${['today','culture'].includes(theatreTab)?`<section class="theatre-home-culture-section" aria-label="木偶戏文化">${theatreSection('木偶戏文化','theatre/culture','更多')}<div class="culture-row theatre-home-culture">${CULTURE.map(([id,label])=>`<button data-learn="culture" data-id="${id}"><span class="culture-icon" aria-hidden="true"><img src="${theatreArt(cultureIcons[id])}" width="98" height="96" alt=""></span><span>${label}</span></button>`).join('')}</div></section>`:''}
  </div>
</section>`;}
function detail(id,ctx){const p=plays.find(v=>v.id===id);if(!p)return `${title('未找到这出戏','','theatre')}${button('返回戏台','theatre')}`;return `<section class="learning-page play-detail">${title(`《${p.name}》`,'一根木杖，万般人生','theatre')}<div class="page-pad"><div class="play-intro paper-panel"><div class="play-poster"><img src="${playImage(p)}" alt="${p.name}海报"><b>${p.name}</b></div><div><h2 class="red-label">《${p.name}》</h2><p>◉ 木偶戏 · ${p.role}</p><p>◷ ${theatreVideos[p.id]?'演出视频 5分48秒':`演示章节约 ${p.duration} 分钟`}</p><p>♧ 传统造型 · 指尖传艺</p><p>${p.summary}</p>${theatreVideos[p.id]?`<button class="paper-button play-video-entry" data-learn="play-video" data-id="${p.id}">${icon('play')}观看演出视频</button>`:''}<button class="text-button" data-learn="favorite" data-id="${p.id}" aria-pressed="${ctx.state.favorites.includes(p.id)}">${icon('heart')}${ctx.state.favorites.includes(p.id)?'已收藏':'收藏'}</button> <button class="text-button" data-learn="share-play" data-id="${p.id}">${icon('share')}分享</button></div></div>${section('剧情与看点')}<div class="chapter-list paper-panel">${p.chapters.map(([name,description],i)=>`<button data-learn="chapter" data-id="${p.id}" data-index="${i}"><span class="chapter-number">0${i+1}</span><img src="${playImage(p)}" alt=""><div><h3>${name}<small>${String(i*15).padStart(2,'0')}:00 — ${String((i+1)*15).padStart(2,'0')}:00</small></h3><p>${description}</p></div></button>`).join('')}</div><p class="material-note">${theatreVideos[p.id]?'演出视频由你提供；下方内容为动作观察导览，暂无真实排期或票务服务。':'本页提供剧目导览示例与动作体验，尚未提供完整剧目视频、真实排期或票务。'}</p></div></section>`;}
const learnHomeAsset = name => `./assets/learn-home-v1/${name}.png`;
function learn(){
  const cards=[
    {name:'认识木偶',route:'puppet',lines:['探秘木偶的结构','与奥秘']},
    {name:'制作工坊',route:'workshop',lines:['亲手设计','专属木偶形象']},
    {name:'操偶课堂',route:'control',lines:['学习操偶技巧','掌握表演精髓']}
  ];
  return `<section class="learning-page learn-home" aria-label="学艺首页"><div class="learn-home-canvas">
    <header class="learn-home-hero">
      <img class="learn-home-hero-art" src="${learnHomeAsset('hero')}" width="852" height="400" alt="学艺：从认识木偶，到亲手让它动起来。泰兴杖头木偶戏。">
      <button class="learn-home-search" data-action="search" aria-label="搜索"><span class="learn-home-sr-only">搜索剧目、课程和好物</span></button>
    </header>
    <nav class="learning-quick learn-home-path" aria-label="学习路径">
      <img class="learn-home-path-ribbon" src="${learnHomeAsset('path-ribbon')}" alt="学习路径">
      ${lessons.map(([name,id],i)=>`<button class="learn-home-step" data-go="learn/${id}" style="--step-x:${[250,474,698][i]}" aria-label="第${i+1}步：${name}"><span class="learn-path-icon"><img src="${learnHomeAsset(`path-${i+1}`)}" alt="" width="104" height="120"></span><span class="learn-home-step-label">${name}</span></button>`).join('')}
      ${[364,588].map(x=>`<img class="learn-home-path-arrow" src="${learnHomeAsset('path-arrow')}" style="--arrow-x:${x}" alt="">`).join('')}
      <img class="learn-home-path-scenery" src="${learnHomeAsset('path-scenery')}" alt="">
    </nav>
    <section class="learn-cards learn-home-courses" aria-label="学艺课程">
      ${cards.map((card,i)=>`<button class="learn-card learn-home-course learn-home-course-${i+1}" data-go="learn/${card.route}" aria-label="${card.name}"><img class="learn-home-course-art" src="${learnHomeAsset(`course-${i+1}`)}" alt=""><span class="learn-home-course-copy"><span class="learn-home-course-title">${card.name}</span><span class="learn-home-course-description">${card.lines.join('<br>')}</span></span><span class="learn-home-course-arrow" aria-hidden="true">→</span></button>`).join('')}
    </section>
    <button class="learn-home-ar" data-learn="play-video" data-id="learn-ar" aria-label="播放 AR 木偶演示视频">
      <span class="learn-home-ar-preview"><img src="./assets/learn-video/ar-puppet-poster.jpg" width="240" height="320" alt="红衣木偶舒展衣袖"><span class="learn-home-ar-play" aria-hidden="true">${icon('play')}</span></span>
      <span class="learn-home-ar-copy"><span class="learn-home-ar-tag">AR 演示 · 00:10</span><strong>AR 木偶演示</strong><span>看衣袖轻扬，观木偶身段</span><span class="learn-home-ar-watch">观看视频 <span aria-hidden="true">→</span></span></span>
    </button>
    <section class="today-challenge learn-home-challenge" aria-labelledby="learn-home-challenge-title">
      <span class="learn-practice-heading">今日练习</span>
      <div class="learn-home-challenge-copy"><h2 id="learn-home-challenge-title">完成一个基础动作</h2><p>迈出第一步，成为操偶小能手</p></div>
      <button class="learn-home-challenge-button" data-go="learn/control">开始学习 <span aria-hidden="true">→</span></button>
    </section>
    <img class="learn-home-closing-scenery" src="${learnHomeAsset('closing-scenery')}" alt="">
  </div></section>`;
}
function knowledge(){return `<section class="learning-page knowledge-page"><header class="knowledge-hero"><button class="round-back" data-go="learn" aria-label="返回学艺">${icon('back')}</button><h1>认识<span>木偶</span><small class="seal">学艺</small></h1><p>看懂一尊杖头木偶</p><small>一木一世界，一杖一人生。<br>探索藏在木偶戏里的百年温度。</small></header><div class="knowledge-scene"><img src="${art('puppet-2.png')}" alt="木偶头部、服饰、杖杆与操控机关结构"><div class="structure-hotspots">${Object.entries(parts).map(([key,[name]],i)=>`<button class="hotspot hs-${i} ${hotspot===key?'selected':''}" data-learn="hotspot" data-id="${key}" aria-pressed="${hotspot===key}">${name}</button>`).join('')}</div></div><div class="page-pad"><div class="structure-copy paper-panel"><h2>${parts[hotspot][0]}</h2><p>${parts[hotspot][1]}</p></div>${section('角色巡游')}<div class="role-row">${roles.slice(0,4).map((name,i)=>`<button data-learn="role-info" data-id="${i}"><img src="${art(`puppet-${i}.png`)}" alt="${name}木偶"><b>${name}</b><small>${['俊雅端正，举止从容','英武亮相，动作有力','眉眼传情，衣袖轻扬','生动诙谐，神态鲜明'][i]}</small></button>`).join('')}</div><div class="knowledge-footer paper-panel"><p>传承百年技艺<br>感受木偶之美</p>${button('下一步 · 制作木偶','learn/workshop')}</div><button class="paper-button outline wide" data-learn="knowledge-complete">我已认识木偶，去操偶课堂 →</button></div></section>`;}
export function renderLearning(route,ctx){if(route==='theatre')return theatre();if(route.startsWith('theatre/plays/'))return detail(route.split('/')[2],ctx);if(route==='theatre/classics')return `${title('经典剧目','','theatre')}<div class="page-pad">${playTiles(plays)}</div>`;if(route==='theatre/culture')return `${title('木偶戏文化','','theatre')}<div class="page-pad">${CULTURE.map(([id,label,copy])=>`<article class="paper-panel culture-detail"><h2>${label}</h2><p>${copy}</p>${button('走近操偶','learn/control','outline')}</article>`).join('')}<p class="material-note">学习导览示例。未将未经核实的具体历史或人物经历作为史实。</p></div>`;if(route==='learn')return learn();if(route==='learn/puppet')return knowledge();if(route==='learn/workshop')return renderWorkshop(ctx);return null;}
export function bindLearning(root,ctx){const stopWorkshop=mountWorkshop(root,ctx);let stopVideo=()=>{};const click=e=>{const b=e.target.closest('[data-learn]');if(!b)return;const a=b.dataset.learn;if(a==='play-video'){stopVideo();stopVideo=openTheatreVideo(b.dataset.id,ctx);}if(a==='ticket-info'){ctx.openModal('<h2>《花好月圆》</h2><p>参考图排期展示：15:30 · 泰兴木偶剧团</p><p>当前为本地体验，暂无真实演出排期查询与票务服务，不会创建订单或扣款。</p>'+button('查看剧目介绍','theatre/plays/huahaoyueyuan'));}if(a==='scan-info'){ctx.openModal(scanInfoHTML,{kind:'html',source:'scan-info'});}if(a==='theatre-tab'&&['today','classic','culture'].includes(b.dataset.value)){theatreTab=b.dataset.value;ctx.navigate('theatre');}if(a==='hotspot'){hotspot=b.dataset.id;ctx.navigate('learn/puppet',{keepScroll:true});}if(a==='culture'){const c=CULTURE.find(v=>v[0]===b.dataset.id);ctx.openModal(`<h2>${c[1]}</h2><p>${c[2]}</p>${button('进入学艺','learn')}`);}if(a==='favorite'){const id=b.dataset.id;ctx.state.favorites=ctx.state.favorites.includes(id)?ctx.state.favorites.filter(v=>v!==id):[...ctx.state.favorites,id];ctx.save();ctx.navigate(`theatre/plays/${id}`,{keepScroll:true});}if(a==='chapter'){const p=plays.find(v=>v.id===b.dataset.id),c=p.chapters[Number(b.dataset.index)];ctx.openModal(`<h2>${c[0]}</h2><p>${c[1]}</p><p>${theatreVideos[p.id]?'本章节提供动作观察导览，演出视频可在剧目介绍上方观看。':'本章节提供动作观察导览，暂无原始剧目视频。'}</p>${button('进入动作体验','learn/control')}`);}if(a==='share-play'){const p=plays.find(v=>v.id===b.dataset.id);ctx.openModal(`<h2>《${p.name}》</h2><p>${p.summary}</p><p>幕后的人 · 一方戏台，万般人生</p><button class="paper-button" data-action="share" data-title="《${p.name}》" data-text="${esc(p.summary)}">分享这出戏</button>`);}if(a==='role-info'){const i=Number(b.dataset.id);ctx.openModal(`<img class="role-modal-image" src="${art(`puppet-${i}.png`)}" alt="${roles[i]}"><h2>${roles[i]}</h2><p>${['文雅角色造型，留意脸部彩绘与稳健姿态。','英武角色造型，留意头冠与服饰的丰富纹样。','眉眼传神，水袖与手部动作细腻相随。','神态生动，以夸张的表情和动作传递趣味。'][i]}</p><small>角色学习导览示例</small>`);}if(a==='knowledge-complete'){ctx.onLesson('knowledge');ctx.navigate('learn/control');}};root.addEventListener('click',click);return()=>{stopVideo();root.removeEventListener('click',click);stopWorkshop();};}


export function captureLearningView() { return { theatreTab, hotspot }; }
export function restoreLearningView(view) {
  const migrated = view.theatreTab === 'digital';
  if (migrated) view.theatreTab = 'today';
  if (['today', 'classic', 'culture'].includes(view.theatreTab)) theatreTab = view.theatreTab;
  if (Object.hasOwn(parts, view.hotspot)) hotspot = view.hotspot;
  return migrated;
}

export const scanInfoHTML = '<h2>扫一扫</h2><p>当前体验暂未接入相机与扫码服务。你可以使用搜索查找剧目。</p>';

/** Rebuild older saved scan dialogs from current content instead of replaying stale HTML. */
export function restoreLearningOverlay(descriptor) {
  if (descriptor.kind !== 'html' || !(descriptor.source === 'scan-info' || /<h2(?:\s[^>]*)?>扫一扫<\/h2>/.test(descriptor.html || ''))) return false;
  const changed = descriptor.html !== scanInfoHTML || descriptor.source !== 'scan-info';
  descriptor.html = scanInfoHTML; descriptor.source = 'scan-info';
  return changed;
}
