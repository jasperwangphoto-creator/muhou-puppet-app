const item = (id, name, category, unitCents, image, specs = ['标准款', '收藏礼盒'], colors = ['朱砂红', '银杏金']) => Object.freeze({ id, name, category, unitCents, image, specs, colors });

export const PRODUCTS = Object.freeze([
  item('puppet', '杖头木偶摆件 · 银杏仙子', '木偶周边', 29800, 'product-puppet', ['标准摆件', '收藏礼盒']),
  item('plush', '木偶毛绒玩偶 · 花旦', '木偶周边', 16800, 'product-plush', ['迷你款', '标准款']),
  item('charm', '角色挂件 · 小生', '服饰配件', 8800, 'product-charm', ['标准挂件', '礼袋装']),
  item('book', '主题笔记本 · 花旦', '生活文创', 4800, 'product-book', ['横线内页', '空白内页'], ['米宣白', '浅茶褐']),
  item('frame', '木偶摆件 · 戏曲人物立板', '木偶周边', 12800, 'product-frame', ['桌面立板', '装饰画框'], ['朱砂红', '素雅青']),
  item('cushion', '抱枕 · 戏曲脸谱款', '生活文创', 15800, 'product-cushion', ['方形抱枕', '抱枕套'], ['朱砂红', '银杏金']),
  item('bag', '帆布袋 · 戏台记忆', '生活文创', 6800, 'product-bag', ['标准款', '加大款'], ['本色', '浅茶褐']),
  item('fan', '折扇 · 花旦款', '服饰配件', 6800, 'product-fan', ['竹骨折扇', '礼盒装'], ['米宣白', '浅茶褐']),
  item('box', '盲盒 · 木偶公仔', '木偶周边', 7800, 'product-box', ['单盒', '展示盒'], ['朱砂红', '银杏金']),
  item('mask', '面具 · 京剧脸谱', '服饰配件', 9800, 'product-mask', ['装饰面具', '礼盒装'], ['朱砂红', '墨黑'])
]);

export const productById = id => PRODUCTS.find(product => product.id === id);
export const money = cents => (Math.round(Number(cents) || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const lineKey = (productId, spec, color) => [productId, spec, color].map(value => encodeURIComponent(String(value))).join('|');
const quantityOf = value => Math.max(1, Math.min(99, Math.floor(Number(value) || 1)));

export function normalizeLines(lines) {
  const normalized = new Map();
  for (const input of Array.isArray(lines) ? lines : []) {
    if (!input || typeof input !== 'object') continue;
    const product = productById(input.productId);
    if (!product || !product.specs.includes(input.spec) || !product.colors.includes(input.color)) continue;
    const quantity = quantityOf(input.quantity);
    const key = lineKey(product.id, input.spec, input.color);
    const previous = normalized.get(key);
    normalized.set(key, { key, productId: product.id, spec: input.spec, color: input.color, quantity: Math.min(99, quantity + (previous?.quantity || 0)) });
  }
  return [...normalized.values()];
}

export function addLine(lines, productId, spec, color, quantity = 1) {
  return normalizeLines([...normalizeLines(lines), { productId, spec, color, quantity }]);
}

export function setLineQuantity(lines, key, quantity) {
  return normalizeLines(lines).map(line => line.key === key ? { ...line, quantity: quantityOf(quantity) } : line);
}

export function removeLine(lines, key) {
  return normalizeLines(lines).filter(line => line.key !== key);
}

export function cartTotal(lines) {
  return normalizeLines(lines).reduce((total, line) => total + productById(line.productId).unitCents * line.quantity, 0);
}

export function createDemoOrder(lines, { now = Date.now(), id = `DEMO-${now}` } = {}) {
  const validLines = normalizeLines(lines);
  if (!validLines.length) throw new RangeError('购物车为空，请先选择商品');
  return {
    id, createdAt: new Date(now).toISOString(), simulation: true, status: '模拟完成',
    lines: validLines.map(line => { const product = productById(line.productId); return { ...line, name: product.name, unitCents: product.unitCents, image: product.image }; }),
    totalCents: cartTotal(validLines)
  };
}
