"use client";

import { useMemo, useSyncExternalStore } from "react";

export type CartLine = { id: string; quantity: number };

const CART_KEY = "noma-cart";
const CHANGE_EVENT = "noma-cart-change";

function getSnapshot() {
  return window.localStorage.getItem(CART_KEY) ?? "";
}

function getServerSnapshot() {
  return "";
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function parseCart(raw: string): CartLine[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.flatMap((value): CartLine[] => {
      if (typeof value !== "object" || value === null) return [];
      const line = value as Record<string, unknown>;
      if (
        typeof line.id !== "string" ||
        line.id.length > 128 ||
        typeof line.quantity !== "number" ||
        !Number.isSafeInteger(line.quantity) ||
        line.quantity < 1 ||
        line.quantity > 99
      ) {
        return [];
      }
      return [{ id: line.id, quantity: line.quantity }];
    });
  } catch {
    return [];
  }
}

export function useCart() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => parseCart(snapshot), [snapshot]);
}

export function saveCart(cart: CartLine[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
