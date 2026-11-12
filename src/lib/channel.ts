import type { BusMessage } from './types';

/** أحداث بين تبويبات المتصفح نفسه (مثلاً المشرف والشاشة على نفس الجهاز) */
const NAME = 'congrats-wall-bus';
let channel: BroadcastChannel | null | undefined;

function get(): BroadcastChannel | null {
  if (channel !== undefined) return channel;
  try {
    channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(NAME);
  } catch {
    channel = null;
  }
  return channel;
}

export function postBus(msg: BusMessage): void {
  try {
    get()?.postMessage(msg);
  } catch {
    /* تجاهل */
  }
}

export function onBus(handler: (msg: BusMessage) => void): () => void {
  let ch: BroadcastChannel | null = null;
  try {
    // قناة مستقلة للمستمع: BroadcastChannel لا يستقبل رسائل نفس الكائن
    ch = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(NAME);
  } catch {
    ch = null;
  }
  if (!ch) return () => undefined;
  const listener = (e: MessageEvent<BusMessage>) => handler(e.data);
  ch.addEventListener('message', listener);
  return () => {
    ch?.removeEventListener('message', listener);
    ch?.close();
  };
}
