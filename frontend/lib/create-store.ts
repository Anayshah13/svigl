"use client";

import { useSyncExternalStore } from "react";

type Listener = () => void;
type SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => void;

export type StoreApi<T> = {
  getState: () => T;
  setState: SetState<T>;
  subscribe: (listener: Listener) => () => void;
};

export type UseStore<T> = {
  (): T;
  <U>(selector: (state: T) => U): U;
} & StoreApi<T>;

/**
 * Minimal external store with a Zustand-like API:
 * - `useStore(selector)` for React subscriptions
 * - `useStore.getState()` / `useStore.setState()` for imperative updates
 */
export function createStore<T>(
  createState: (set: SetState<T>, get: () => T) => T,
): UseStore<T> {
  let state: T;
  const listeners = new Set<Listener>();

  const getState = () => state;

  const setState: SetState<T> = (partial) => {
    const nextPartial = typeof partial === "function" ? partial(state) : partial;
    state = { ...state, ...nextPartial };
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  state = createState(setState, getState);

  function useStore(): T;
  function useStore<U>(selector: (state: T) => U): U;
  function useStore<U>(selector?: (state: T) => U): T | U {
    return useSyncExternalStore(
      subscribe,
      () => (selector ? selector(getState()) : getState()),
      () => (selector ? selector(getState()) : getState()),
    );
  }

  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;

  return useStore as UseStore<T>;
}
