// Small React lifecycle harness for Node: stable refs, functional setters,
// dependency-based effects, rerender and cleanup, without a DOM dependency.
export function createHookHarness() {
  const slots: unknown[] = [];
  const effects = new Map<number, { deps?: unknown[]; cleanup?: () => void }>();
  let cursor = 0;
  let pending: (() => void)[] = [];
  const equal = (a?: unknown[], b?: unknown[]) => !!a && !!b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  return {
    useCallback<T extends (...args: never[]) => unknown>(callback: T, deps: unknown[]): T {
      const i = cursor++;
      const previous = slots[i] as { callback: T; deps: unknown[] } | undefined;
      if (previous && equal(previous.deps, deps)) return previous.callback;
      slots[i] = { callback, deps };
      return callback;
    },
    useState<T>(initial: T | (() => T)) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === "function" ? (initial as () => T)() : initial;
      return [slots[i] as T, (next: T | ((old: T) => T)) => {
        slots[i] = typeof next === "function" ? (next as (old: T) => T)(slots[i] as T) : next;
      }] as const;
    },
    useRef<T>(initial: T) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { current: initial };
      return slots[i] as { current: T };
    },
    useEffect(effect: () => void | (() => void), deps?: unknown[]) {
      const i = cursor++;
      if (equal(effects.get(i)?.deps, deps)) return;
      pending.push(() => {
        effects.get(i)?.cleanup?.();
        effects.set(i, { deps, cleanup: effect() || undefined });
      });
    },
    render<T>(hook: () => T) { cursor = 0; pending = []; return hook(); },
    commit() { const work = pending; pending = []; work.forEach((effect) => effect()); },
    cleanup() { effects.forEach((e) => e.cleanup?.()); effects.clear(); },
  };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

export async function flushPromises() { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }
