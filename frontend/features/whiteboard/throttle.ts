/** Lightweight throttle for sync callbacks (~30fps by default). */

export function throttle<T extends unknown[]>(
  fn: (...args: T) => void,
  waitMs: number,
): ((...args: T) => void) & { flush: () => void; cancel: () => void } {
  let lastArgs: T | null = null;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastCall = 0;

  const invoke = () => {
    timeout = null;
    lastCall = Date.now();
    if (lastArgs) {
      const args = lastArgs;
      lastArgs = null;
      fn(...args);
    }
  };

  const throttled = ((...args: T) => {
    lastArgs = args;
    const now = Date.now();
    const remaining = waitMs - (now - lastCall);
    if (remaining <= 0 || remaining > waitMs) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      invoke();
    } else if (!timeout) {
      timeout = setTimeout(invoke, remaining);
    }
  }) as ((...args: T) => void) & { flush: () => void; cancel: () => void };

  throttled.flush = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    if (lastArgs) invoke();
  };

  throttled.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    lastArgs = null;
  };

  return throttled;
}
