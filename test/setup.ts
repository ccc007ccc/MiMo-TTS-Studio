// 测试环境初始化
import 'fake-indexeddb/auto'

// jsdom 没有 atob/btoa 的 Buffer-aware 版本，原生即可
// 也确保 TextEncoder/TextDecoder 存在
if (typeof globalThis.TextEncoder === 'undefined') {
  // @ts-expect-error
  globalThis.TextEncoder = (await import('util')).TextEncoder
}
if (typeof globalThis.TextDecoder === 'undefined') {
  // @ts-expect-error
  globalThis.TextDecoder = (await import('util')).TextDecoder
}
