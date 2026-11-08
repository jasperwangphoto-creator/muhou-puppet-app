const KEY = 'muhou-studio-v3';
const DB_NAME = 'muhou-replays-v3';
const ACTIONS = new Set(['nod', 'clap', 'turn', 'sleeve', 'walk']);
const STAGES = new Set(['water', 'city', 'plum']);
const safeGlobal = name => { try { return globalThis[name]; } catch { return undefined; } };
const fresh = () => ({ schemaVersion: 3, practiced: [], challenges: [], recordings: [], stage: 'water', play: '踏雪寻梅', storageError: '', replayStorageReady: false });

export function validRecording(record) {
  if (!record || record.formatVersion !== 1 || typeof record.id !== 'string' || !STAGES.has(record.stage) ||
    typeof record.play !== 'string' || !Number.isFinite(record.duration) || record.duration < 500 || record.duration > 120000 ||
    !Array.isArray(record.events) || record.events.length > 50000 || typeof record.roleVersion !== 'string' ||
    typeof record.stageVersion !== 'string' || typeof record.controllerVersion !== 'string') return false;
  let time = 0;
  for (const event of record.events) {
    if (!event || !Number.isFinite(event.t) || event.t < time || event.t < 0 || event.t > record.duration) return false;
    time = event.t;
    if (event.type === 'action') { if (!ACTIONS.has(event.id)) return false; }
    else if (event.type === 'move') { if (![event.x, event.y].every(value => Number.isFinite(value) && Math.abs(value) <= 1)) return false; }
    else if (event.type === 'arm') { if (!['left', 'right'].includes(event.side) || typeof event.held !== 'boolean') return false; }
    else if (event.type !== 'reset') return false;
  }
  return true;
}

export function recordingMetadata(record) {
  const { events, ...metadata } = record;
  return { ...metadata, eventsCount: events.length };
}
export function readMetadata(storage) {
  const value = fresh();
  try {
    const raw = JSON.parse(storage?.getItem(KEY) || 'null');
    if (!raw) return value;
    if (raw.schemaVersion !== 3) { value.storageError = '发现旧版数据，本版未把旧挑战成绩当作已完成记录。'; return value; }
    value.stage = STAGES.has(raw.stage) ? raw.stage : 'water';
    value.play = ['踏雪寻梅', '水袖轻舞', '武生亮相'].includes(raw.play) ? raw.play : '踏雪寻梅';
    value.practiced = Array.isArray(raw.practiced) ? [...new Set(raw.practiced.filter(id => ACTIONS.has(id)))] : [];
    value.challenges = Array.isArray(raw.challenges) ? raw.challenges.filter(record => record && typeof record.id === 'string' &&
      Number.isInteger(record.count) && record.count >= 0 && record.count <= 4 && record.score === record.count * 25 &&
      Number.isFinite(record.durationMs) && record.durationMs >= 0 && record.durationMs <= 60000 &&
      ['优秀', '良好', '未完成'].includes(record.rating) && typeof record.success === 'boolean' &&
      record.success === (record.count === 4 && record.reason === 'complete' && record.durationMs < 60000) &&
      record.rating === (record.success ? record.durationMs <= 40000 ? '优秀' : '良好' : '未完成')).slice(-100) : [];
    value.recordings = Array.isArray(raw.recordings) ? raw.recordings.filter(record => record && typeof record.id === 'string' &&
      STAGES.has(record.stage) && Number.isFinite(record.duration) && typeof record.play === 'string').slice(-20) : [];
  } catch { value.storageError = '本机记录格式损坏，本次使用空白数据。'; }
  return value;
}

const requestValue = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error || new Error('读取本机记录失败'));
});
const transactionDone = transaction => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error || new Error('本机存储写入失败'));
  transaction.onabort = () => reject(transaction.error || new Error('本机存储写入已中止'));
});

export class StudioRepository {
  constructor({ storage = safeGlobal('localStorage'), indexedDB = safeGlobal('indexedDB') } = {}) {
    this.storage = storage; this.indexedDB = indexedDB; this.state = readMetadata(storage); this.db = null;
    this.ready = this._open();
  }
  async _open() {
    try {
      if (!this.indexedDB) throw new Error('当前环境不支持 IndexedDB，演出无法持久保存。');
      const request = this.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('recordings')) request.result.createObjectStore('recordings', { keyPath: 'id' }); };
      this.db = await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (value, error) => {
          if (settled) { if (value) value.close(); return; }
          settled = true; clearTimeout(timer); error ? reject(error) : resolve(value);
        };
        const timer = setTimeout(() => finish(null, new Error('本机回放数据库打开超时，请重试保存。')), 8000);
        request.onsuccess = () => finish(request.result);
        request.onerror = () => finish(null, request.error || new Error('打开本机回放数据库失败。'));
        request.onblocked = () => finish(null, new Error('本机回放数据库被其他页面占用，请关闭其他页面后重试。'));
      });
      this.db.onversionchange = () => { this.db?.close(); this.db = null; this.state.replayStorageReady = false; };
      const records = await requestValue(this.db.transaction('recordings', 'readonly').objectStore('recordings').getAll());
      this.state.recordings = records.filter(validRecording).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(-20).map(recordingMetadata);
      this.state.replayStorageReady = true;
      return true;
    } catch (error) { this.state.storageError = error?.message || '本机回放数据库不可用。'; this.state.replayStorageReady = false; return false; }
  }
  persist() {
    try {
      if (!this.storage) throw new Error('本机小数据存储不可用');
      const { storageError, replayStorageReady, ...small } = this.state;
      this.storage.setItem(KEY, JSON.stringify(small)); return true;
    } catch { this.state.storageError = '本机存储不可用或空间不足，本次进度尚未持久保存。'; return false; }
  }
  setSelection(stage, play) { if (STAGES.has(stage)) this.state.stage = stage; if (typeof play === 'string') this.state.play = play; return this.persist(); }
  practice(id) { if (!ACTIONS.has(id) || this.state.practiced.includes(id)) return true; this.state.practiced.push(id); return this.persist(); }
  saveChallenge(result) {
    if (!this.state.challenges.some(record => record.id === result.id)) this.state.challenges.push({ ...result });
    this.state.challenges = this.state.challenges.slice(-100); return this.persist();
  }
  async saveRecording(record) {
    if (!validRecording(record)) throw new Error('演出记录格式不完整，未保存。');
    await this.ready;
    if (!this.db && this.indexedDB) { this.ready = this._open(); await this.ready; }
    if (!this.db) throw new Error(this.state.storageError || '本机回放数据库不可用，演出未保存。');
    const metadata = recordingMetadata(record);
    const next = [...this.state.recordings.filter(item => item.id !== record.id), metadata];
    const removed = next.splice(0, Math.max(0, next.length - 20));
    const transaction = this.db.transaction('recordings', 'readwrite');
    const done = transactionDone(transaction), records = transaction.objectStore('recordings');
    records.put(record); for (const item of removed) records.delete(item.id);
    await done;
    this.state.recordings = next;
    return { saved: true, metadataSaved: this.persist() };
  }
  async getRecording(id) {
    await this.ready;
    if (!this.db && this.indexedDB) { this.ready = this._open(); await this.ready; }
    if (!this.db) throw new Error(this.state.storageError || '本机回放数据库不可用。');
    const record = await requestValue(this.db.transaction('recordings', 'readonly').objectStore('recordings').get(id));
    if (!validRecording(record)) throw new Error('这场演出已丢失或记录损坏，无法回放。');
    return record;
  }
}

export const studioRepository = new StudioRepository();
