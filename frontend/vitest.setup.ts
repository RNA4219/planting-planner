if (typeof globalThis.ResizeObserver === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => ({}),
})
