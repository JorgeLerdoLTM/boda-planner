"use client";
import type { DragEvent } from "react";

// HTML5 drag payloads shared by the guest panel, the table panel, the palette
// and the map. Browsers hide dataTransfer contents during dragover, so the
// current payload is also kept in module state for hover feedback.

export const DND_MIME = "application/x-seating";
export type DragPayload =
  | { kind: "unit"; key: string }
  | { kind: "shape"; shape: "round" | "square" | "rect" };

let current: DragPayload | null = null;

export function setDrag(e: DragEvent, payload: DragPayload): void {
  e.dataTransfer.setData(DND_MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "move";
  current = payload;
}
export function readDrag(e: DragEvent): DragPayload | null {
  try {
    const s = e.dataTransfer.getData(DND_MIME);
    return s ? (JSON.parse(s) as DragPayload) : current;
  } catch { return current; }
}
export function hasDrag(e: DragEvent): boolean { return Array.from(e.dataTransfer.types).includes(DND_MIME); }
export function currentDrag(): DragPayload | null { return current; }
export function clearDrag(): void { current = null; }
