import { WORKSHOP_CANVAS, WORKSHOP_HEAD_OFFSET, compositionLayers } from './workshop-model.js';

export class WorkshopRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.frame = document.createElement('canvas');
    for (const target of [canvas, this.frame]) {
      target.width = WORKSHOP_CANVAS.width;
      target.height = WORKSHOP_CANVAS.height;
    }
    this.cache = new Map();
    this.sequence = 0;
    this.disposed = false;
    this.current = null;
  }

  load(path) {
    if (this.cache.has(path)) {
      const cached = this.cache.get(path);
      this.cache.delete(path);
      this.cache.set(path, cached);
      return cached;
    }
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        if (image.naturalWidth !== WORKSHOP_CANVAS.width || image.naturalHeight !== WORKSHOP_CANVAS.height) {
          reject(new Error('木偶素材尺寸不匹配'));
        } else resolve(image);
      };
      image.onerror = () => reject(new Error('木偶素材暂未加载，请重试'));
      image.src = path;
    }).catch(error => {
      // Do not delete a newer request inserted after LRU eviction.
      if (this.cache.get(path) === promise) this.cache.delete(path);
      throw error;
    });
    this.cache.set(path, promise);
    while (this.cache.size > 12) this.cache.delete(this.cache.keys().next().value);
    return promise;
  }

  async setParts(headId, bodyId) {
    if (this.disposed) return false;
    const paths = compositionLayers(headId, bodyId);
    const sequence = ++this.sequence;
    let images;
    try { images = await Promise.all(paths.map(path => this.load(path))); }
    catch (error) {
      if (this.disposed || sequence !== this.sequence) return false;
      throw error;
    }
    if (this.disposed || sequence !== this.sequence) return false;
    const context = this.frame.getContext('2d');
    context.clearRect(0, 0, this.frame.width, this.frame.height);
    for (const [index, image] of images.entries()) {
      const head = index === 1 || index === 3;
      context.drawImage(image, head ? WORKSHOP_HEAD_OFFSET.x : 0, head ? WORKSHOP_HEAD_OFFSET.y : 0);
    }
    const visible = this.canvas.getContext('2d');
    visible.clearRect(0, 0, this.canvas.width, this.canvas.height);
    visible.drawImage(this.frame, 0, 0);
    this.current = { headId, bodyId };
    return true;
  }

  dispose() {
    this.disposed = true;
    ++this.sequence;
    this.cache.clear();
    this.frame.width = this.frame.height = 0;
  }
}
