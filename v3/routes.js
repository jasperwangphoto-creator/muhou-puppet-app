const aliases = { stage: 'theatre', knowledge: 'learn/puppet', craft: 'learn/workshop', practice: 'learn/control', achievements: 'me/achievements' };
const retired = new Set(['challenge', 'perform', 'performance', 'performances', 'learn/challenge', 'learn/performance', 'me/performances']);

export function normalizeRoute(value) {
  let route = String(value || '').replace(/^#?\/?/, '').split('?')[0].replace(/\/+$/, '');
  try { route = decodeURIComponent(route); } catch { return 'theatre'; }
  return retired.has(route) ? 'learn/control' : aliases[route] || route || 'theatre';
}

export const TAB_IDS = ['theatre', 'learn', 'backstage', 'shop', 'me'];
export const PAGE_REGISTRY = Object.freeze([
  ...TAB_IDS.map(tab => ({ pattern: tab, tab, parent: null })),
  { pattern: 'theatre/classics', tab: 'theatre', parent: 'theatre' },
  { pattern: 'theatre/culture', tab: 'theatre', parent: 'theatre' },
  { pattern: 'theatre/plays/:id', tab: 'theatre', parent: 'theatre/classics' },
  ...['puppet', 'workshop', 'control'].map(page => ({ pattern: `learn/${page}`, tab: 'learn', parent: 'learn' })),
  { pattern: 'backstage/explore', tab: 'backstage', parent: 'backstage' },
  { pattern: 'backstage/inheritors/:id', tab: 'backstage', parent: 'backstage' },
  { pattern: 'shop/categories', tab: 'shop', parent: 'shop' },
  { pattern: 'shop/products/:id', tab: 'shop', parent: 'shop/categories' },
  { pattern: 'cart', tab: 'shop', parent: 'shop' },
  { pattern: 'orders', tab: 'me', parent: 'me' },
  ...['achievements', 'favorites', 'works', 'report'].map(page => ({ pattern: `me/${page}`, tab: 'me', parent: 'me' }))
]);

export function routeInfo(value) {
  const route = normalizeRoute(value);
  return PAGE_REGISTRY.find(page => {
    const pattern = page.pattern.split('/'), parts = route.split('/');
    return pattern.length === parts.length && pattern.every((part, index) => part === ':id' ? Boolean(parts[index]) : part === parts[index]);
  }) || { pattern: route, tab: TAB_IDS.includes(route.split('/')[0]) ? route.split('/')[0] : 'theatre', parent: TAB_IDS.includes(route.split('/')[0]) ? route.split('/')[0] : 'theatre', unknown: true };
}

export function fallbackChain(value) {
  const route = normalizeRoute(value), info = routeInfo(route);
  return info.parent ? [...fallbackChain(info.parent), route] : [route];
}