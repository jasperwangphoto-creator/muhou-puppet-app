import { compositionImage, compositionSummary, activeComposition } from './workshop-model.js';
import { PRODUCTS, productById, money, normalizeLines, addLine, setLineQuantity, removeLine, cartTotal, createDemoOrder } from './commerce.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const art = name => `./assets/v3-content/${name}.webp`;
const backArt = name => `./assets/backstage-v2/${name}.webp`;
const homeArt = name => `./assets/backstage-home-v3/${name}.png`;
const PERSON_ID = 'hua-meixia';
const PERSON_ROUTE = `backstage/inheritors/${PERSON_ID}`;
const arrow = '<span aria-hidden="true">→</span>';
const symbols = {
  bag: 'M5 8h14l2 13H3L5 8ZM8 8V6a4 4 0 0 1 8 0v2M8 12v1m8-1v1',
  cart: 'M2 3h3l3 12h11l3-9H6M8 18h11M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  back: 'm15 4-8 8 8 8',
  search: 'M21 21l-6-6M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Z',
  bell: 'M5 17h14l-2-4V8A5 5 0 0 0 7 8v5l-2 4Zm5 3h4M12 1v2',
  craft: 'M12 3c-3 0-5 2-5 5l2 3-5 5v5h16v-5l-5-5 2-3c0-3-2-5-5-5Zm0 8v10M7 16l-3 1m13-1 3 1',
  shirt: 'm8 3-6 5 4 4 2-2v12h8V10l2 2 4-4-6-5c0 4-8 4-8 0Z',
  book: 'M12 5C8 2 4 3 2 4v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-3-2-7-2-10 1Zm0 0v15',
  flower: 'M12 9c-6-8 6-11 3-2 10-1 7 11 0 6 3 10-9 10-6 1-8 6-13-5-3-6-8-6 4-12 6-3Zm0 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  gift: 'M3 8h18v4H3V8Zm2 4h14v9H5v-9Zm7-4v13M12 8C2 8 6-2 12 8Zm0 0c10 0 6-10 0 0Z',
  photo: 'M3 6h5l2-3h4l2 3h5v15H3V6Zm13 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z',
  star: 'm12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z'
};
const symbol = name => `<svg class="c-symbol" viewBox="0 0 24 24" aria-hidden="true"><path d="${symbols[name] || symbols.craft}"/></svg>`;
const go = (label, route, cls = 'c-button') => `<button class="${cls}" data-go="${route}">${label}${arrow}</button>`;
const section = (title, route = '', subtitle = '') => `<div class="c-section-heading"><div><h2><i aria-hidden="true">❋</i>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${route ? go('查看全部', route, 'c-text-button') : ''}</div>`;
const empty = (title, text, route, label) => `<div class="c-empty"><span aria-hidden="true">◇</span><h3>${title}</h3><p>${text}</p>${route ? go(label || '继续探索', route) : ''}</div>`;
const date = value => { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? '本次体验' : parsed.toLocaleDateString('zh-CN'); };
const array = value => Array.isArray(value) ? value : [];
const studio = ctx => { try { return ctx.studioData?.() || { challenges: [], recordings: [] }; } catch { return { challenges: [], recordings: [] }; } };
const LESSONS = [['认识木偶', 'knowledge', 'learn/puppet'], ['制作工坊', 'craft', 'learn/workshop'], ['操偶课堂', 'practice', 'learn/control']];
const lessonCount = state => LESSONS.filter(([,id]) => state.lessons.includes(id)).length;
const PLAY_NAMES = { ginkgo: '银杏仙子', sancha: '三岔口', nvfuma: '女驸马', baigujing: '三打白骨精', muguiying: '穆桂英挂帅', tianguan: '天官赐福' };
const choices = new Map();
let category = '木偶周边';
let search = '';
let badgeSelection = 'knowledge';
let currentRoute = '';

function ensure(state) {
  state.cartLines = normalizeLines(state.cartLines);
  for (const key of ['wishlist', 'favorites', 'lessons', 'works', 'demoOrders', 'achievementClaims', 'inheritorFavorites', 'backstageVisits']) if (!Array.isArray(state[key])) state[key] = [];
  for (const key of ['wishlist', 'favorites', 'lessons', 'achievementClaims', 'inheritorFavorites', 'backstageVisits']) state[key] = [...new Set(state[key].filter(value => typeof value === 'string'))];
  state.inheritorFavorites = [...new Set(state.inheritorFavorites.map(id => id === 'chen' ? PERSON_ID : id))];
  state.works = state.works.filter(work => work && typeof work === 'object' && typeof work.id === 'string');
  state.demoOrders = state.demoOrders.filter(order => order && typeof order === 'object' && Array.isArray(order.lines) && Number.isInteger(order.totalCents) && order.totalCents >= 0).map(order => ({ ...order, lines: order.lines.filter(line => line && typeof line === 'object' && typeof line.productId === 'string' && Number.isInteger(line.quantity) && line.quantity >= 1 && line.quantity <= 99 && Number.isInteger(line.unitCents) && line.unitCents >= 0) }));
}

function header(type, subtitle, back = '') {
  const title = { backstage: '幕后', shop: '文创', me: '我的', achievements: '我的成就' }[type];
  return `<header class="c-header c-header-${type}">${back ? `<button class="c-back" aria-label="返回上一页" data-go="${back}">‹</button>` : ''}<div class="c-header-copy"><h1>${title}<span class="c-seal">非<br>遗</span></h1><p>${subtitle}</p></div><div class="c-header-actions">${type === 'shop' ? `<button aria-label="搜索文创好物" data-go="shop/categories">${symbol('search')}</button><button class="c-cart-link" aria-label="打开购物车" data-go="cart">${symbol('bag')}</button>` : type === 'me' ? `<button aria-label="本地账户说明" data-content-action="settings">⚙</button><button aria-label="查看学习动态" data-content-action="notifications">${symbol('bell')}</button>` : ''}</div></header>`;
}

function backstageHero(subtitle, kind = 'home') {
  const illustrated = kind !== 'compact';
  return `<header class="bh-hero bh-hero-${kind}">
    ${kind !== 'home' ? '<button class="bh-back c-back" aria-label="返回上一页" data-go="backstage">‹</button>' : ''}
    <div class="bh-hero-copy"><h1>${kind === 'home' ? `<span class="bh-home-sr">幕后</span><img class="bh-home-title" src="${homeArt('title')}" width="225" height="94" alt="">` : '幕后<span class="bh-seal">非遗</span>'}</h1><p class="bh-subtitle">${subtitle}</p>${illustrated ? `<p class="bh-intro">${kind === 'home' ? '木偶背后的故事与人，<br>看见匠心与智慧。' : '走进木偶戏的幕后，<br>发现日常里的匠心。'}</p>` : ''}</div>
    ${illustrated ? `<figure class="bh-theme"><img src="${kind === 'home' ? homeArt('theme-home') : backArt('theme-explore')}" width="477" height="${kind === 'home' ? 385 : 365}" alt="艺人与戏曲木偶的主题插画"><figcaption>主题插画</figcaption></figure>` : ''}
  </header>`;
}

const backstageHeading = (number, title, icon = '') => `<h2 class="bh-section-title">${icon ? `<img src="${homeArt(icon)}" width="60" height="59" alt="">` : `<span aria-hidden="true">${number}</span>`}${title}</h2>`;
const STORIES = {
  room: { name: '走进排练空间', image: 'rehearsal-room', body: '一场排练，从站稳开始。托举主杖时，先保持木偶的身体平稳，再让视线、手势与步伐相互配合。练习者反复调整一个动作的起落、停顿与衔接，才能把角色的情绪送到台前。观察图中的木偶、衣架与道具，想一想：每个角色上场前，需要哪些准备？' }
};

function backstageHome() {
  return `${backstageHero('走进台下，遇见传承')}<div class="bh-body bh-home-body">
    <section aria-label="后台探索">${backstageHeading('壹', '幕后探索', 'badge-explore')}
      <button class="bh-entry bh-room-card" data-go="backstage/explore"><img src="${homeArt('room-art')}" width="470" height="201" alt="木偶排练空间示意"><div><h3>走进排练空间</h3><p>看见木偶戏的日常<br>与匠心。</p><span class="bh-cta">进入探索 ${arrow}</span></div><span class="bh-image-note">场景示意</span></button>
    </section>
    <section aria-label="传承人故事">${backstageHeading('贰', '传承人故事', 'badge-person')}
      <button class="bh-entry bh-person-card" data-go="${PERSON_ROUTE}"><div class="bh-card-photo"><img src="${backArt('hua-meixia-upright')}" width="365" height="620" alt="华美霞操偶表演，真实照片来自国家图书馆"><span class="bh-photo-credit">图源：国家图书馆</span></div><div class="bh-person-card-copy"><p class="bh-eyebrow">杖头木偶戏</p><h3>华美霞</h3><p>国家级代表性传承人</p><span class="bh-cta bh-cta-outline">走进她的故事 ${arrow}</span></div></button>
    </section>
  </div>`;
}

function backstageExplore() {
  return `${backstageHero('后台探索', 'inner')}<div class="bh-body">
    <section class="bh-space-panel"><div class="bh-space-copy">${backstageHeading('壹', '排练空间')}<p class="bh-lead">看见木偶戏的日常，<br>与匠心。</p><button class="bh-cta" data-content-action="story" data-id="room">走进排练空间 ${arrow}</button></div><figure class="bh-space-image"><img src="${backArt('rehearsal-room')}" width="437" height="278" alt="木偶排练空间主题场景"><figcaption>排练空间 · 场景示意</figcaption></figure></section>
    <section class="bh-reading" aria-label="排练观察">${backstageHeading('贰', '看见日常里的匠心')}<ol class="bh-observations"><li><span aria-hidden="true">一</span><div><h3>先让木偶站稳</h3><p>托举主杖，保持身体平稳。一个自然的站姿，是后续动作的起点。</p></div></li><li><span aria-hidden="true">二</span><div><h3>让视线与动作相随</h3><p>从点头到抬手，留意头部、手臂与步伐如何配合，让情绪融入一招一式。</p></div></li><li><span aria-hidden="true">三</span><div><h3>把准备做到细处</h3><p>整理戏服、检查手杖和道具，让角色以完整的姿态走上戏台。</p></div></li></ol></section>
  </div>`;
}

function inheritor(id, state) {
  if (![PERSON_ID, 'chen'].includes(id)) return `${backstageHero('传承人故事', 'compact')}<div class="bh-body">${empty('没有找到这位人物', '请从传承人故事入口重新选择。', 'backstage', '返回幕后')}</div>`;
  const favorite = state.inheritorFavorites.includes(PERSON_ID);
  return `${backstageHero('传承人故事', 'compact')}<div class="bh-body">
    <article class="bh-person-intro"><div class="bh-person-summary"><div class="bh-person-heading"><span class="bh-person-stamp" aria-hidden="true">传承人</span><div><p class="bh-eyebrow">杖头木偶戏</p><h2>华美霞</h2></div></div><p class="bh-person-origin">1947年12月生<br>江苏泰兴籍</p><p class="bh-person-specialty">以旦角操偶见长，<br>让神态与情绪<br>融入一招一式。</p></div><figure class="bh-person-photo"><img src="${backArt('hua-meixia-upright')}" width="365" height="620" alt="华美霞在舞台上操纵水袖木偶，国家图书馆真实照片"><figcaption>操偶表演 · 国家图书馆</figcaption></figure><p class="bh-person-honors">扬州杖头木偶戏<br>国家级代表性传承人 · 国家一级演员</p><p class="bh-biography">从舞台表演到传授技艺，她把细腻的情感注入木偶，也将多年积累的操偶经验传给后来人。</p><button class="bh-cta bh-cta-outline bh-favorite" data-content-action="favorite-person" data-id="${PERSON_ID}" aria-pressed="${favorite}"><span aria-hidden="true">${favorite ? '★' : '☆'}</span>${favorite ? '已收藏 · 取消' : '收藏人物'}</button></article>
    <section class="bh-reading">${backstageHeading('壹', '从学艺到传承')}<div class="bh-story-block"><span class="bh-story-index" aria-hidden="true">01</span><div><h3>师承与磨炼</h3><p>1962年开始学艺，师从蔡艳秋学习木偶旦角表演，之后得到马宏俊等前辈的指导，在长期舞台实践中打磨操纵技艺。</p></div></div><div class="bh-story-block"><span class="bh-story-index" aria-hidden="true">02</span><div><h3>让木偶更有表现力</h3><p>她探索耍枪、舞剑、兰花指、反掌与揉手绢等动作，并发展出二十余种水袖动作，让木偶更细腻地表现人物情感。</p></div></div><div class="bh-story-block"><span class="bh-story-index" aria-hidden="true">03</span><div><h3>把经验传给后来人</h3><p>她编创木偶练功操与水袖动作组合，将舞台经验整理为教学内容，让操偶技艺继续传递。</p></div></div></section>
    <section class="bh-reading">${backstageHeading('贰', '代表角色')}<dl class="bh-role-list"><div><dt>嫦娥<span>《嫦娥奔月》</span></dt><dd>以水袖动作表现人物的柔美与情感。</dd></div><div><dt>阿庆嫂<span>《沙家浜》</span></dt><dd>在提壶、倒茶等细微动作中刻画人物。</dd></div><div><dt>小青<span>《白蛇传》</span></dt><dd>以长枪、剑法与身段展现角色神采。</dd></div></dl></section>
    <footer class="bh-sources"><h2>资料来源</h2><a href="https://www.ihchina.cn/ccr_detail/1956.html" target="_blank" rel="noopener noreferrer">中国非遗网 · 华美霞人物档案 ↗</a><a href="https://www.ihchina.cn/character_detail/8689.html" target="_blank" rel="noopener noreferrer">中国非遗网 · 人物报道 ↗</a><a href="https://ich.nlc.cn/detail/6012" target="_blank" rel="noopener noreferrer">国家图书馆 · 传承人记录档案 ↗</a></footer>
  </div>`;
}


function productCard(product, compact = false) {
  return `<article class="c-product-card ${compact ? 'is-compact' : ''}"><button class="c-product-open" data-go="shop/products/${product.id}"><img src="${art(product.image)}" alt="${esc(product.name)}" loading="lazy"><h3>${esc(product.name)}</h3><p>${esc(product.category)} · 设计图演示选品</p></button><div><span class="c-price"><small>¥</small>${money(product.unitCents)}</span><button class="c-bag-button" data-go="shop/products/${product.id}" aria-label="选择${esc(product.name)}规格">${symbol('bag')}</button></div></article>`;
}

function shopHome(state) {
  const image = name => `./assets/shop-home-v2/${name}.png`;
  const allProducts = (label, cls = '') => `<button class="${cls}" data-content-action="category-go" data-category="全部">${label}${arrow}</button>`;
  const heading = label => `<div class="shop-home-heading"><h2><img src="${image('section-flower')}" alt="">${label}</h2>${allProducts('查看更多')}</div>`;
  const cartCount = state.cartLines.reduce((total, line) => total + line.quantity, 0);
  const notes = ['泰兴杖头木偶戏角色周边', '泰兴杖头木偶潮流IP', '非遗元素设计', '文化IP文创'];
  return `<div class="shop-home-canvas">
    <header class="shop-home-header">
      <img class="shop-home-art" src="${image('header')}" alt="">
      <h1 class="shop-home-sr-only">文创</h1>
      <p>把非遗带回家，让文化有温度</p>
      <div class="shop-home-actions">
        <button aria-label="搜索文创好物" data-content-action="category-go" data-category="全部">${symbol('search')}</button>
        <button class="shop-home-cart" aria-label="打开购物车，${cartCount}件商品" data-go="cart"><svg class="c-symbol" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3h3l3 14h12l2-11H6M8 12h13M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg>${cartCount ? `<span class="shop-home-cart-count" aria-hidden="true">${cartCount > 99 ? '99+' : cartCount}</span>` : ''}</button>
      </div>
    </header>
    <div class="shop-home-content">
      <section class="shop-home-banner" aria-labelledby="shop-arrivals-title">
        <img class="shop-home-art" src="${image('new-arrivals')}" alt="花旦木偶摆件、礼盒和角色挂件">
        <h2 id="shop-arrivals-title">非遗文创 · 新品上架</h2><p>经典角色 × 现代设计</p>
        <button data-go="shop/products/puppet">立即选购${arrow}</button>
      </section>
      <div class="shop-home-pagination" aria-hidden="true"><i></i><i></i><i></i></div>
      <section aria-label="热门推荐">
        ${heading('热门推荐')}
        <div class="shop-home-products">${PRODUCTS.slice(0, 4).map((product, index) => `<article class="c-product-card">
          <button class="c-product-open" data-go="shop/products/${product.id}"><div class="shop-home-product-art"><img src="${image(`product-${product.id}`)}" alt="${esc(product.name)}" width="195" height="184">${index === 1 ? '<span class="shop-home-badge">新品</span>' : index === 2 ? '<span class="shop-home-badge is-hot">热销</span>' : ''}</div><h3>${esc(product.name)}</h3><p>${notes[index]}</p></button>
          <div><span class="c-price"><small>¥</small>${money(product.unitCents)}</span><button class="c-bag-button" data-go="shop/products/${product.id}" aria-label="选择${esc(product.name)}规格">${symbol('bag')}</button></div>
        </article>`).join('')}</div>
      </section>
      <section class="shop-home-categories" aria-labelledby="shop-categories-title">
        <div><h2 id="shop-categories-title">文创分类</h2><p>寻找属于你的<br>非遗好物</p>${allProducts('全部商品')}</div>
        ${[['puppet', '木偶摆件', '木偶周边'], ['plush', '毛绒玩偶', '木偶周边'], ['charm', '挂件', '服饰配件'], ['bag', '帆布袋', '生活文创']].map(([id, label, category]) => `<button data-content-action="category-go" data-category="${category}"><img src="${image(`category-${id}`)}" alt=""><span>${label}${arrow}</span></button>`).join('')}
      </section>
      <section class="shop-home-exclusive" aria-label="独家设计">
        ${heading('独家设计')}
        <div class="shop-home-design">
          <img class="shop-home-art" src="${image('design-story')}" alt="匠人手绘木偶妆容的细节">
          <h3>幕后设计 · 灵感从哪里来？</h3><p>每一件文创，都有一个故事</p>
          <button data-content-action="design" data-id="design-puppet" data-title="幕后设计">了解更多${arrow}</button>
        </div>
      </section>
    </div>
  </div>`;
}

const catalogArt = name => `./assets/shop-catalog-v1/${name}.png`;
const CATALOG_FEATURED = ['puppet', 'charm', 'frame', 'cushion'];
const CATALOG_RECOMMENDED = ['fan', 'book', 'box', 'mask'];
const CATALOG_NOTES = { puppet: '木偶造型｜戏服纹样', charm: '精致小巧｜随身携带', frame: '国风设计｜家居装饰', cushion: '柔软舒适｜传统美学' };

function catalogProductCard(product, compact = false) {
  const image = [...CATALOG_FEATURED, ...CATALOG_RECOMMENDED].includes(product.id) ? catalogArt(`product-${product.id}`) : art(product.image);
  return `<article class="c-product-card${compact ? ' is-compact' : ''}${['frame', 'cushion'].includes(product.id) ? ' is-landscape' : ''}"><button class="c-product-open" data-go="shop/products/${product.id}"><div class="catalog-product-art"><img src="${image}" alt="${esc(product.name)}" loading="lazy"></div><h3>${esc(product.name)}</h3>${compact ? '' : `<p>${CATALOG_NOTES[product.id] || esc(product.category)}</p>`}</button><div class="catalog-product-price"><span class="c-price"><small>¥</small>${money(product.unitCents)}</span><button class="c-bag-button" data-go="shop/products/${product.id}" aria-label="选择${esc(product.name)}规格">${symbol('cart')}</button></div></article>`;
}

function filteredProducts() {
  const products = category === '木偶周边' ? CATALOG_FEATURED.map(productById) : PRODUCTS.filter(product => ['全部', '新品推荐', '热销榜单'].includes(category) || product.category === category);
  return products.filter(product => (product.name + product.category).includes(search.trim()));
}

function categoriesPage(state) {
  const products = filteredProducts(), cartCount = state.cartLines.reduce((total, line) => total + line.quantity, 0);
  const ornament = `<img src="${catalogArt('icon-all')}" alt="" aria-hidden="true">`;
  return `<header class="catalog-header"><button class="c-back catalog-back" data-go="shop" aria-label="返回上一页">${symbol('back')}</button><h1>文创<span class="catalog-seal">非<br>遗</span></h1><p>把非遗带回家，让文化有温度</p>
    <label class="catalog-search">${symbol('search')}<input id="c-product-search" type="search" placeholder="搜索文创好物" value="${esc(search)}" aria-label="搜索文创商品"></label>
    <button class="catalog-cart" data-go="cart" aria-label="打开购物车，${cartCount}件商品">${symbol('cart')}<span class="catalog-cart-count"${cartCount ? '' : ' hidden'}>${cartCount}</span></button></header>
  <section class="catalog-hero" aria-label="非遗文创推荐"><h2>非遗文创 · 匠心好物</h2><p>把传统之美，带进日常生活</p><button data-content-action="category-go" data-category="全部">探索全部 ${arrow}</button></section>
  <div class="c-catalog-layout"><nav class="c-category-sidebar" aria-label="筛选商品分类">${[['全部', 'all'], ['木偶周边', 'puppet'], ['生活文创', 'lifestyle'], ['服饰配件', 'accessories'], ['新品推荐', 'new'], ['热销榜单', 'bestsellers']].map(([name, icon]) => `<button class="${category === name ? 'is-active' : ''}" data-content-action="category" data-category="${name}" aria-pressed="${category === name}"><span aria-hidden="true"><img src="${catalogArt(`icon-${icon}`)}" alt=""></span>${name}</button>`).join('')}</nav>
    <div class="catalog-main"><div class="c-catalog-heading"><h2>${ornament}${esc(category)}<span aria-hidden="true">◆</span></h2><p>把舞台上的灵动，带回你的生活</p></div>
      <p class="c-search-count${search ? '' : ' is-idle'}" role="status">${products.length} 件演示商品${search ? ` · “${esc(search)}”` : ''}</p>
      <div id="c-catalog-results" class="c-product-grid">${products.length ? products.map(product => catalogProductCard(product)).join('') : empty('没有找到相关好物', '试试“花旦”“木偶”或切换分类。')}</div>
      <section class="c-catalog-promo"><h2>${ornament}联名文创专区</h2><p>从戏台之美，发现日常灵感</p><button data-go="shop/products/bag" aria-label="查看帆布袋商品">查看更多 ${arrow}</button></section>
      <section class="c-catalog-recommendations" aria-label="猜你喜欢"><div class="catalog-recommendation-heading"><h2>${ornament}猜你喜欢 <span aria-hidden="true">✦</span></h2><button data-content-action="category-go" data-category="全部">查看更多 ›</button></div><div class="c-product-grid">${CATALOG_RECOMMENDED.map(id => catalogProductCard(productById(id), true)).join('')}</div></section>
    </div></div><p class="catalog-note">本地购物演示，不发生真实支付与配送。新品与热销为设计选品展示。</p>`;
}

function productPage(id, state) {
  const product = productById(id);
  if (!product) return `${header('shop', '文创好物', 'shop/categories')}${empty('没有找到这件商品', '这件商品可能不在本地演示选品中。', 'shop/categories', '浏览全部商品')}`;
  const selected = choices.get(id) || { spec: product.specs[0], color: product.colors[0], quantity: 1, image: 0 };
  choices.set(id, selected);
  const gallery = product.id === 'puppet' ? ['detail-puppet', 'detail-face', 'detail-back', 'detail-hand'] : [product.image];
  return `${header('shop', '把非遗带回家，让文化有温度', 'shop/categories')}<div class="c-page-pad"><p class="c-breadcrumb"><button data-go="shop">文创</button> › <button data-go="shop/categories">${product.category}</button> › ${esc(product.name.split(' · ').pop())}</p><div class="c-gallery c-bordered"><button class="c-gallery-main" data-content-action="view-product" data-id="${id}" aria-label="放大商品图片"><img src="${art(gallery[selected.image] || gallery[0])}" alt="${esc(product.name)}${selected.image ? '细节' : '全貌'}"></button><div class="c-gallery-thumbs">${gallery.map((image, index) => `<button class="${selected.image === index ? 'is-active' : ''}" data-content-action="gallery" data-id="${id}" data-index="${index}" aria-label="查看商品图${index + 1}" aria-pressed="${selected.image === index}"><img src="${art(image)}" alt=""></button>`).join('')}<span>${selected.image + 1}/${gallery.length}</span></div></div><section class="c-product-summary c-bordered"><div><h2>${esc(product.name)}</h2><p>非遗灵感 · 设计图选品 · 本地购物演示</p><strong class="c-price"><small>¥</small>${money(product.unitCents)}</strong></div><button class="c-favorite ${state.wishlist.includes(id) ? 'is-active' : ''}" data-content-action="favorite-product" data-id="${id}" aria-pressed="${state.wishlist.includes(id)}"><span aria-hidden="true">★</span>${state.wishlist.includes(id) ? '已收藏' : '收藏'}</button></section><div class="c-services">${[['♙', '非遗灵感'], ['▧', '角色纹样'], ['♢', '传统色彩'], ['▣', '日常收藏']].map(([symbol, label]) => `<div><span>${symbol}</span><b>${label}</b></div>`).join('')}</div><section class="c-spec-panel c-bordered"><h2>选择规格</h2><fieldset><legend>规格</legend>${product.specs.map(spec => `<button class="c-chip ${selected.spec === spec ? 'is-active' : ''}" data-content-action="spec" data-id="${id}" data-value="${spec}" aria-pressed="${selected.spec === spec}">${spec}</button>`).join('')}</fieldset><fieldset><legend>配色</legend>${product.colors.map(color => `<button class="c-chip ${selected.color === color ? 'is-active' : ''}" data-content-action="color" data-id="${id}" data-value="${color}" aria-pressed="${selected.color === color}"><i style="background:${['朱砂红', '墨黑'].includes(color) ? color === '墨黑' ? '#29231c' : '#af2520' : '#bc9148'}"></i>${color}</button>`).join('')}</fieldset><div class="c-quantity-row"><span>数量</span><div class="c-quantity"><button data-content-action="quantity" data-id="${id}" data-delta="-1" aria-label="减少数量" ${selected.quantity <= 1 ? 'disabled' : ''}>−</button><input aria-label="商品数量" data-content-quantity="${id}" type="number" min="1" max="99" value="${selected.quantity}"><button data-content-action="quantity" data-id="${id}" data-delta="1" aria-label="增加数量" ${selected.quantity >= 99 ? 'disabled' : ''}>＋</button></div></div><p class="c-note">规格与配色将写入购物车。图像展示原稿造型，配色仅为演示选项；所有规格同价。</p><div class="c-simulation">模拟下单，不发生真实支付 · 不提供真实配送</div></section><section class="c-product-story c-bordered"><img src="${art('design-puppet')}" alt="木偶面部与头饰特写"><div><h2>木偶背后的故事</h2><p>一偶一世界，演绎千年风华</p>${go('了解更多', PERSON_ROUTE, 'c-button c-outline')}</div></section><div class="c-purchase-bar"><button data-content-action="service" aria-label="查看购物演示说明">♡<small>说明</small></button><button data-go="cart" aria-label="购物车">${symbol('bag')}<small>购物车<span class="c-cart-count">${state.cartLines.reduce((total, line) => total + line.quantity, 0) || ''}</span></small></button><button class="c-button c-brown" data-content-action="add-cart" data-id="${id}">加入购物车</button><button class="c-button" data-content-action="buy" data-id="${id}">模拟购买</button></div></div>`;
}

function cartPage(state) {
  const lines = normalizeLines(state.cartLines);
  return `${header('shop', '我的购物车', 'shop')}<div class="c-page-pad"><h2 class="c-plain-title">我的购物车 <small>${lines.length} 种选品</small></h2>${lines.length ? `<div class="c-cart-list">${lines.map(line => { const product = productById(line.productId); return `<article class="c-cart-row c-bordered"><button data-go="shop/products/${product.id}"><img src="${art(product.image)}" alt="${esc(product.name)}"></button><div><h3>${esc(product.name)}</h3><p>${line.spec} · ${line.color}</p><b class="c-price">¥${money(product.unitCents)}</b><div class="c-quantity"><button data-content-action="cart-quantity" data-key="${esc(line.key)}" data-delta="-1" aria-label="减少${esc(product.name)}数量" ${line.quantity <= 1 ? 'disabled' : ''}>−</button><span>${line.quantity}</span><button data-content-action="cart-quantity" data-key="${esc(line.key)}" data-delta="1" aria-label="增加${esc(product.name)}数量" ${line.quantity >= 99 ? 'disabled' : ''}>＋</button></div></div><button class="c-remove" data-content-action="remove-cart" data-key="${esc(line.key)}" aria-label="移除${esc(product.name)}${line.spec}${line.color}">移除</button></article>`; }).join('')}</div><div class="c-cart-total"><span>合计</span><strong class="c-price">¥${money(cartTotal(lines))}</strong></div><div class="c-simulation">模拟下单，不发生真实支付。订单保存在当前浏览器；无真实付款、发货或物流。</div><button class="c-button c-wide" data-content-action="checkout">确认模拟下单，不发生真实支付 →</button>` : empty('购物车还是空的', '挑选喜欢的木偶好物，选择规格与配色后加入。', 'shop', '去逛逛文创')}${go('查看模拟订单', 'orders', 'c-text-button c-order-link')}</div>`;
}

function ordersPage(state) {
  return `${header('shop', '我的模拟订单', 'me')}<div class="c-page-pad"><p class="c-simulation">所有订单仅为本地模拟记录，不发生真实支付与配送。</p>${state.demoOrders.length ? state.demoOrders.slice().reverse().map(order => `<article class="c-order c-bordered"><header><b>模拟完成</b><small>${date(order.createdAt)}</small></header><p class="c-order-id">${esc(order.id)}</p>${array(order.lines).map(line => `<button class="c-order-product" data-go="shop/products/${esc(line.productId)}"><img src="${art(line.image || productById(line.productId)?.image || 'product-puppet')}" alt=""><div><b>${esc(line.name)}</b><p>${esc(line.spec)} · ${esc(line.color)} × ${line.quantity}</p><span>¥${money(line.unitCents)}</span></div></button>`).join('')}<footer><span>共 ${array(order.lines).reduce((total, line) => total + Number(line.quantity || 0), 0)} 件</span><strong>模拟合计 ¥${money(order.totalCents)}</strong></footer></article>`).join('') : empty('还没有模拟订单', '文创商品支持规格、配色与数量选择，确认后生成本地模拟订单。', 'shop', '浏览文创好物')}</div>`;
}

function badgeData(ctx) {
  const data = studio(ctx), state = ctx.state;
  return [
    { id: 'knowledge', title: '初识木偶', image: 'badge-first', unlocked: state.lessons.includes('knowledge'), requirement: '完成“认识木偶”课程', route: 'learn/puppet' },
    { id: 'practice', title: '基础操偶', image: 'badge-practice', unlocked: array(data.practiced).length >= 5 || state.lessons.includes('practice'), requirement: '在操偶课堂完整练习五个基础动作', route: 'learn/control' },
    { id: 'craft', title: '巧手制偶', image: 'badge-stage', unlocked: state.works.length > 0, requirement: '在制作工坊保存一位木偶', route: 'learn/workshop' },
    { id: 'backstage', title: '探索幕后', image: 'badge-backstage', unlocked: state.backstageVisits.length >= 1, requirement: '阅读一篇幕后图片导览', route: 'backstage/explore' }
  ];
}

function badges(ctx, small = false) {
  return `<div class="c-badges ${small ? 'c-badges-small' : ''}">${badgeData(ctx).map(badge => `<button class="c-badge ${badge.unlocked ? 'is-unlocked' : 'is-locked'} ${badgeSelection === badge.id ? 'is-selected' : ''}" data-content-action="badge" data-id="${badge.id}" aria-label="${badge.title}，${badge.unlocked ? ctx.state.achievementClaims.includes(badge.id) ? '已领取' : '已解锁，待领取' : '未解锁'}"><img src="${art(badge.image)}" alt=""><b>${badge.title}</b><small>${badge.unlocked ? ctx.state.achievementClaims.includes(badge.id) ? '已领取' : '待领取' : '未解锁'}</small></button>`).join('')}</div>`;
}

function mePage(ctx) {
  const state = ctx.state, data = studio(ctx), count = lessonCount(state), practiced = array(data.practiced).length;
  const unlocked = badgeData(ctx).filter(badge => badge.unlocked).length, experience = Math.min(100, count * 25 + practiced * 5), level = Math.floor(experience / 25) + 1;
  const work = activeComposition(state);
  return `${header('me', '一场与木偶的相遇')}<div class="c-page-pad"><section class="c-profile c-bordered"><img class="c-avatar" src="${art('me-avatar')}" alt="木偶角色头像"><div><h2>本地戏迷</h2><p>${count ? '一招一式，慢慢成长' : '初入戏台，未来可期'}</p><div class="c-level"><span>Lv.${level}</span><progress max="100" value="${experience}">${experience}%</progress><small>${experience} / 100</small></div></div><span class="c-profile-stamp">我的<br>木偶人生</span><div class="c-stat-grid">${[['原创木偶', state.works.length, 'me/works'], ['练习动作', practiced, 'learn/control'], ['学习进度', count, 'me/report'], ['成就徽章', unlocked, 'me/achievements']].map(([label, value, route]) => `<button data-go="${route}"><span aria-hidden="true">☆</span><strong>${value}</strong>${label}</button>`).join('')}</div></section><section class="c-personal-panel c-bordered">${section('我的木偶', 'me/works', '让亲手制作的木偶动起来')}<button class="c-latest-performance" data-go="learn/control"><img class="${work.id ? 'workshop-saved-puppet' : 'c-default-puppet'}" src="${work.id ? compositionImage(work) : art('detail-puppet')}" alt="${work.id ? esc(work.name) : '红衣花旦木偶示意图'}"><div><h3>${state.works.length ? esc(work.name) : '第一位木偶，等你创造'}</h3><p>${esc(compositionSummary(work))}</p><span>进入操偶课堂 →</span></div></button></section><section class="c-personal-panel c-bordered">${section('我的成就', 'me/achievements', '在这里，见证你的成长')}${badges(ctx, true)}</section><div class="c-personal-actions"><button class="c-favorites-tile c-bordered" data-go="me/favorites"><h2>我的收藏 <span>›</span></h2><p>剧目 / 传承人 / 商品</p><img src="${art('detail-face')}" alt=""></button><div><button class="c-bordered" data-content-action="share"><h2>分享卡 <span>›</span></h2><p>生成你的学艺纪念卡</p></button><button class="c-bordered" data-go="me/report"><h2>学习报告 <span>›</span></h2><p>你的学习成果与建议</p></button></div></div><button class="c-my-order c-bordered" data-go="orders"><span aria-hidden="true">▤</span><h2>我的订单</h2><p>查看本地模拟订单</p><b>›</b></button><button class="c-my-order c-bordered" data-go="me/works"><span aria-hidden="true">♙</span><h2>我的作品</h2><p>${state.works.length} 位原创木偶</p><b>›</b></button><section class="c-continue c-bordered"><h2>继续探索</h2><p>更多木偶故事，等你发现…</p>${go('走进幕后', 'backstage', 'c-text-button')}</section><p class="c-note">作品和学习进度保存在当前浏览器，不会跨设备同步。</p></div>`;
}

function achievementsPage(ctx) {
  const badgesList = badgeData(ctx), selected = badgesList.find(badge => badge.id === badgeSelection) || badgesList[0];
  const claimed = ctx.state.achievementClaims.includes(selected.id), total = badgesList.filter(badge => badge.unlocked).length;
  return `${header('achievements', '记录每一次学艺的成长', 'me')}<div class="c-page-pad"><section class="c-growth c-bordered"><div class="c-ribbon">成长路线 <small>从认识木偶到亲手操偶，见证你的成长之路</small></div><div class="c-growth-stops">${badgesList.slice(0, 4).map(badge => `<button class="${badge.unlocked ? 'is-done' : ''}" data-go="${badge.route}"><img src="${art(badge.image)}" alt=""><b>${badge.title}</b><span>${badge.unlocked ? '已达成' : '未解锁'}</span></button>`).join('')}</div></section><section class="c-personal-panel c-bordered">${section('成就徽章墙', '', '每一枚徽章，都是你热爱的证明')}${badges(ctx)}</section><section class="c-badge-detail c-bordered"><div class="c-ribbon">徽章详情</div><div><img class="${selected.unlocked ? '' : 'is-locked'}" src="${art(selected.image)}" alt="${selected.title}徽章"><div><h2>${selected.title}</h2><p>${selected.requirement}</p><dl><div><dt>达成状态</dt><dd>${selected.unlocked ? '已达成' : '尚未达成'}</dd></div><div><dt>领取状态</dt><dd>${claimed && selected.unlocked ? '已领取' : selected.unlocked ? '可领取' : '未解锁'}</dd></div></dl>${selected.unlocked ? `<button class="c-button" data-content-action="claim-badge" data-id="${selected.id}" ${claimed ? 'disabled' : ''}>${claimed ? '已领取' : '领取这枚徽章'}</button>` : go('前往体验', selected.route, 'c-button c-outline')}</div></div></section><button class="c-certificate-banner c-bordered" data-content-action="certificate"><div><small>荣誉展示</small><h2>非遗学习成长证书</h2><p>以传承为名，见证你的热爱与坚持</p><span>已解锁 ${total} / ${badgesList.length} 枚徽章 · 查看规则 →</span></div><img src="${art('certificate')}" alt="设计图中的证书示意"></button><p class="c-note">成就来自本机实际学艺记录。证书为 App 学习纪念，不是官方资质认证。</p></div>`;
}

function favoritesPage(state) {
  return `${header('me', '我的收藏', 'me')}<div class="c-page-pad">${section('文创好物')}<div class="c-product-grid">${PRODUCTS.filter(product => state.wishlist.includes(product.id)).map(product => productCard(product)).join('') || empty('还没有收藏好物', '在商品页点亮收藏，喜欢的木偶好物就会留在这里。', 'shop', '逛逛文创')}</div>${section('收藏剧目')}<div class="c-saved-links">${state.favorites.map(id => `<button class="c-bordered" data-go="theatre/plays/${esc(id)}"><b>《${esc(PLAY_NAMES[id] || id)}》</b><span>查看剧目 →</span></button>`).join('') || '<p class="c-note">还没有收藏剧目。看戏时，记得留住你的心动。</p>'}</div>${section('传承人故事')}${state.inheritorFavorites.includes(PERSON_ID) ? `<button class="c-saved-person c-bordered" data-go="${PERSON_ROUTE}"><img src="${backArt('hua-meixia-upright')}" alt="华美霞操偶"><div><h3>华美霞</h3><p>杖头木偶戏国家级代表性传承人 · 查看故事 →</p></div></button>` : '<p class="c-note">还没有收藏传承人故事。</p>'}</div>`;
}

function worksPage(state) {
  const preview = work => `<img class="workshop-saved-puppet" src="${compositionImage(work)}" alt="${esc(work.name || '我的木偶')} · ${esc(compositionSummary(work))}" width="256" height="384" loading="lazy">`;
  return `${header('me', '我的作品', 'me')}<div class="c-page-pad">${state.works.length ? `<div class="c-works">${state.works.slice().reverse().map(work => `<article class="c-work c-bordered"><div class="c-work-image">${preview(work)}</div><h2>${esc(work.name || '我的木偶')}</h2><p>${date(work.createdAt)} · ${esc(compositionSummary(work))}</p><small>头部与身体的组合造型</small><div><button class="c-button" data-content-action="control-work" data-id="${esc(work.id)}">去操偶 →</button><button class="c-button c-outline" data-content-action="open-work" data-id="${esc(work.id)}">再次编辑 →</button><button class="c-text-button" data-content-action="delete-work" data-id="${esc(work.id)}">删除</button></div></article>`).join('')}</div>` : empty('第一位木偶，等你创造', '挑一个角色，选一身服饰，为它取一个名字。', 'learn/workshop', '去制作工坊')}</div>`;
}

function reportPage(ctx) {
  const state = ctx.state, lessons = lessonCount(state), practiced = array(studio(ctx).practiced);
  return `${header('me', '我的学习报告', 'me')}<div class="c-page-pad"><section class="c-report-summary c-bordered"><small>本地学习记录</small><h2>每一次尝试，都让手艺更近一点</h2><p>已完成 ${lessons} / 3 项学习体验</p><progress value="${lessons}" max="3">${lessons}</progress><p>原创木偶 ${state.works.length} 位 · 已练习 ${practiced.length} / 5 个动作</p></section><div class="c-report-lessons">${LESSONS.map(([name, id, route]) => `<button class="c-bordered" data-go="${route}"><span>${state.lessons.includes(id) ? '✓' : '○'}</span><div><h3>${name}</h3><p>${state.lessons.includes(id) ? '已完成 · 温故知新' : '尚未完成 · 开始这一站'}</p></div><b>›</b></button>`).join('')}</div>${go('继续练习操偶', 'learn/control', 'c-button')}<p class="c-note">动作完整演完后计入练习进度。报告统计当前浏览器的实际学习行为。</p></div>`;
}

export function renderContent(route, ctx) {
  const legacyFavorite = array(ctx.state.inheritorFavorites).includes('chen');
  ensure(ctx.state);
  if (legacyFavorite) ctx.save?.();
  let content = null;
  if (route === 'backstage') content = backstageHome();
  else if (route === 'backstage/explore') content = backstageExplore();
  else if (route.startsWith('backstage/inheritors/')) content = inheritor(route.split('/')[2], ctx.state);
  else if (route === 'shop') content = shopHome(ctx.state);
  else if (route === 'shop/categories') content = categoriesPage(ctx.state);
  else if (route.startsWith('shop/products/')) content = productPage(route.split('/')[2], ctx.state);
  else if (route === 'cart') content = cartPage(ctx.state);
  else if (route === 'orders') content = ordersPage(ctx.state);
  else if (route === 'me') content = mePage(ctx);
  else if (route === 'me/achievements') content = achievementsPage(ctx);
  else if (route === 'me/favorites') content = favoritesPage(ctx.state);
  else if (route === 'me/works') content = worksPage(ctx.state);
  else if (route === 'me/report') content = reportPage(ctx);
  if (content === null) return null;
  currentRoute = route;
  return `<div class="c-page c-route-${route.split('/')[0]}${route === 'shop' ? ' c-shop-home' : ''}${route === 'shop/categories' ? ' c-shop-catalog' : ''}${route === 'backstage' ? ' bh-home-page' : ''}">${content}</div>`;
}

export function bindContent(root, ctx) {
  const controller = new AbortController();
  const { signal } = controller;
  const refresh = () => ctx.navigate(currentRoute, { keepScroll: true });
  const persist = () => ctx.save();
  const modal = html => ctx.openModal?.(`<div class="c-modal-content">${html}</div>`);
  function visit(id) {
    if (!ctx.state.backstageVisits.includes(id)) { ctx.state.backstageVisits.push(id); ctx.state.explored = true; persist(); }
  }
  function click(event) {
    const button = event.target.closest('[data-content-action]');
    if (!button || button.disabled || (!root.contains(button) && !button.closest('[role="dialog"]'))) return;
    const data = button.dataset, state = ctx.state;
    const product = productById(data.id), selected = product && choices.get(product.id);
    switch (data.contentAction) {
      case 'category-go': category = data.category; search = ''; ctx.navigate('shop/categories'); break;
      case 'category': category = data.category; refresh(); break;
      case 'spec': case 'color': if (selected && product[data.contentAction === 'spec' ? 'specs' : 'colors'].includes(data.value)) { selected[data.contentAction] = data.value; refresh(); } break;
      case 'gallery': if (selected) { selected.image = Number(data.index) || 0; refresh(); } break;
      case 'quantity': if (selected) { selected.quantity = Math.max(1, Math.min(99, selected.quantity + Number(data.delta))); refresh(); } break;
      case 'favorite-product': state.wishlist = state.wishlist.includes(data.id) ? state.wishlist.filter(id => id !== data.id) : [...state.wishlist, data.id]; persist(); refresh(); break;
      case 'favorite-person': state.inheritorFavorites = state.inheritorFavorites.includes(data.id) ? state.inheritorFavorites.filter(id => id !== data.id) : [...state.inheritorFavorites, data.id]; persist(); refresh(); break;
      case 'add-cart': case 'buy': if (selected && product) { state.cartLines = addLine(state.cartLines, product.id, selected.spec, selected.color, selected.quantity); persist(); if (data.contentAction === 'buy') { ctx.navigate('cart'); ctx.toast('请核对选品后确认模拟下单'); } else { ctx.toast(`已加入购物车 · ${selected.spec} · ${selected.color}`); refresh(); } } break;
      case 'cart-quantity': { const line = state.cartLines.find(line => line.key === data.key); if (line) { state.cartLines = setLineQuantity(state.cartLines, data.key, line.quantity + Number(data.delta)); persist(); refresh(); } break; }
      case 'remove-cart': state.cartLines = removeLine(state.cartLines, data.key); persist(); refresh(); break;
      case 'checkout': if (state.cartLines.length) { try { const order = createDemoOrder(state.cartLines, { id: `DEMO-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}` }); state.demoOrders.push(order); state.cartLines = []; persist(); ctx.navigate('orders'); ctx.toast('模拟订单已保存，未发生付款'); } catch (error) { ctx.toast(error.message); } } break;
      case 'story': { const story = STORIES[data.id]; if (!story) break; visit(data.id); modal(`<img src="${backArt(story.image)}" alt="排练空间示意"><small>排练空间 · 图文观察</small><h2>${story.name}</h2><p>${story.body}</p><p class="c-note">配图为场景示意。已记录你的这次幕后探索。</p>`); break; }
      case 'culture': modal(`<h2>木偶技艺图鉴</h2><img src="${art('carving')}" alt="木偶雕刻设计图"><h3>从结构开始认识</h3><p>主杖控制木偶的头部和身体，手杖配合双手。先观察造型，再尝试点头与抬手，就能从动作中体会操偶的配合。</p><p>本地版本提供图片观察、角色制作与二维操偶。人物历史及采访材料尚待补充核实。</p>${go('认识木偶', 'learn/puppet')}`); break;
      case 'design': modal(`<img src="${art(data.id)}" alt="${esc(data.title)}"><h2>${esc(data.title)}</h2><p>从木偶的眉眼、凤冠与服饰纹样中寻找灵感，让戏台上的角色走进日常生活。</p><p class="c-note">设计图配图及示例文创叙事，无已接通的真实售卖服务。</p>${go('浏览文创好物', 'shop/categories')}`); break;
      case 'view-product': if (product) { const gallery = product.id === 'puppet' ? ['detail-puppet', 'detail-face', 'detail-back', 'detail-hand'] : [product.image]; modal(`<img src="${art(gallery[selected?.image || 0])}" alt="${esc(product.name)}"><h2>${esc(product.name)}</h2><p>提供设计图中的商品图片。未提供商品实拍视频。</p>`); } break;
      case 'service': modal('<h2>本地购物演示说明</h2><p>商品、价格和规格用于毕业设计交互展示。可选择规格配色、加入购物车、收藏并生成模拟订单。</p><p>模拟下单，不发生真实支付；没有真实客服、库存、物流或退换货服务。</p>'); break;
      case 'badge': badgeSelection = data.id; if (currentRoute !== 'me/achievements') ctx.navigate('me/achievements'); else refresh(); break;
      case 'claim-badge': { const badge = badgeData(ctx).find(badge => badge.id === data.id); if (badge?.unlocked && !state.achievementClaims.includes(badge.id)) { state.achievementClaims.push(badge.id); persist(); ctx.toast('已领取这枚成长徽章'); refresh(); } break; }
      case 'certificate': { const unlocked = badgeData(ctx).filter(badge => badge.unlocked).length; modal(`<div class="c-certificate-preview"><small>幕后的人 · 本地学习纪念</small><h2>非遗学习成长证书</h2><p>本地戏迷</p><p>你已解锁 ${unlocked} / ${badgeData(ctx).length} 枚成长徽章。</p><p>${unlocked === badgeData(ctx).length ? '你完成了认识、制偶、操偶与幕后探索。愿热爱在指尖继续。' : '完成认识木偶、制作木偶、基础操偶及幕后探索，即可点亮完整成长证书。'}</p><small>本证书为 App 学习纪念，不是官方资质认证。</small></div>${go('查看学习报告', 'me/report')}`); break; }
      case 'settings': modal('<h2>本地演示账户</h2><p>昵称：本地戏迷</p><p>收藏、作品、学习进度、购物车和模拟订单保存在当前浏览器。历史本机记录继续保留。</p><p>当前没有真实登录、支付和云同步。清除浏览器网站数据会删除本机记录。</p>'); break;
      case 'notifications': { const claimed = badgeData(ctx).filter(badge => badge.unlocked && state.achievementClaims.includes(badge.id)).length; modal(`<h2>你的学习动态</h2><p>已完成 ${lessonCount(state)} 项学习，解锁 ${badgeData(ctx).filter(badge => badge.unlocked).length} 枚徽章。</p>${claimed ? `<p>已领取 ${claimed} 枚成长徽章。</p>` : '<p>完成体验后，记得前往“我的成就”领取徽章。</p>'}${go('查看成长徽章', 'me/achievements')}`); break; }
      case 'share': { const data = studio(ctx); modal(`<div class="c-share-preview"><img src="${art('me-stage')}" alt="木偶戏台"><small>幕后的人 · 我的学艺纪念</small><h2>手中有杖，心中有戏</h2><p>本地戏迷</p><p>完成 ${lessonCount(state)} 项学习 · 制作 ${state.works.length} 位木偶</p><p>一招一式，都是与木偶的相遇。</p></div><p class="c-note">可使用设备截图保存这张纪念卡。以上数据来自本机实际记录。</p>`); break; }
      case 'control-work': { if (state.works.some(work => work.id === data.id)) { state.activeWorkId = data.id; persist(); ctx.navigate('learn/control'); } break; }
      case 'open-work': { const work = state.works.find(work => work.id === data.id); if (work) { state.craftDraft = { ...work }; persist(); ctx.navigate('learn/workshop'); } break; }
      case 'delete-work': { const work = state.works.find(work => work.id === data.id); if (work) { state.works = state.works.filter(work => work.id !== data.id); if (state.activeWorkId === data.id) state.activeWorkId = activeComposition(state).id || null; persist(); refresh(); ctx.toast('作品已删除'); } break; }
    }
  }
  function input(event) {
    const target = event.target;
    if (target.id === 'c-product-search') {
      search = target.value;
      const list = root.querySelector('#c-catalog-results'), count = root.querySelector('.c-search-count'), products = filteredProducts();
      if (list) list.innerHTML = products.length ? products.map(product => catalogProductCard(product)).join('') : empty('没有找到相关好物', '试试“花旦”“木偶”或切换分类。');
      if (count) { count.textContent = `${products.length} 件演示商品${search ? ` · “${search}”` : ''}`; count.classList.toggle('is-idle', !search); }
    }
  }
  function change(event) {
    const target = event.target, id = target.dataset.contentQuantity;
    if (id && choices.has(id)) { choices.get(id).quantity = Math.max(1, Math.min(99, Math.floor(Number(target.value) || 1))); target.value = choices.get(id).quantity; refresh(); }
  }
  document.addEventListener('click', click, { signal });
  root.addEventListener('input', input, { signal });
  root.addEventListener('change', change, { signal });
  return () => controller.abort();
}


export function captureContentView() {
  return { category, search, badgeSelection, choices: [...choices.entries()].map(([id, choice]) => [id, { ...choice }]) };
}
export function restoreContentView(view) {
  if (typeof view.category === 'string') category = view.category;
  if (typeof view.search === 'string') search = view.search;
  if (typeof view.badgeSelection === 'string') badgeSelection = view.badgeSelection;
  if (Array.isArray(view.choices)) {
    choices.clear();
    for (const pair of view.choices) {
      if (!Array.isArray(pair)) continue;
      const [id, choice] = pair, product = productById(id);
      if (product && choice && product.specs.includes(choice.spec) && product.colors.includes(choice.color)) choices.set(id, { ...choice, quantity: Math.max(1, Math.min(99, Math.floor(Number(choice.quantity) || 1))), image: Math.max(0, Math.min(3, Math.floor(Number(choice.image) || 0))) });
    }
  }
}
