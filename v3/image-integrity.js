// Some image decoders accept truncated files without firing an error event.
export function completeImage(bytes) {
  if (bytes.length < 16) return false;
  const text = (start, end) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes[0] === 137 && text(1, 4) === 'PNG') {
    return text(bytes.length - 8, bytes.length - 4) === 'IEND' && bytes[bytes.length - 1] === 130;
  }
  if (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') {
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true) + 8 === bytes.length;
  }
  return bytes[0] === 255 && bytes[1] === 216 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217;
}

export function installImageIntegrity() {
  const images = new WeakMap();
  const release = image => {
    const state = images.get(image);
    state?.controller?.abort();
    if (state?.blob) URL.revokeObjectURL(state.blob);
    images.delete(image);
  };
  async function verify(event) {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.isConnected || images.has(image)) return;
    const source = image.currentSrc || image.src;
    const url = new URL(source, document.baseURI);
    if (url.origin !== location.origin || !url.pathname.includes('/assets/') || !/\.(png|jpe?g|webp)$/i.test(url.pathname)) return;
    const state = { controller: null, blob: null };
    images.set(image, state);
    image.dataset.imageState = 'checking';
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!image.isConnected || image.src !== source) return;
      state.controller = new AbortController();
      const timeout = setTimeout(() => state.controller.abort(), 20000);
      try {
        const request = new URL(url);
        if (attempt) request.searchParams.set('image-retry', `${Date.now()}-${attempt}`);
        const response = await fetch(request, { cache: attempt ? 'no-store' : 'force-cache', signal: state.controller.signal });
        if (!response.ok) throw new Error('Image request failed');
        const blob = await response.blob();
        if (!completeImage(new Uint8Array(await blob.arrayBuffer()))) throw new Error('Incomplete image');
        if (!image.isConnected || image.src !== source) return;
        state.blob = URL.createObjectURL(blob);
        image.classList.remove('image-failed');
        image.dataset.imageState = 'verified';
        image.src = state.blob;
        return;
      } catch {
        if (!image.isConnected) return;
      } finally {
        clearTimeout(timeout);
      }
    }
    image.dataset.imageState = 'failed';
    image.classList.add('image-failed');
    image.alt ||= '图片加载失败，请刷新重试';
  }
  document.addEventListener('load', verify, true);
  document.addEventListener('error', verify, true);
  new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.removedNodes) {
        if (node.nodeType !== 1 || node.isConnected) continue;
        if (node instanceof HTMLImageElement) release(node);
        node.querySelectorAll('img').forEach(release);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
}
