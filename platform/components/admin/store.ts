"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  getExpectedAttendees,
  getFixedTotal,
  getPaidTotal,
  getVariableTotal,
  getCostPerAttendee,
  getCategoryBreakdown,
} from "@/lib/calculations";
import type { FixedCost, VariableCost } from "@/lib/types";
import type { AdminGuestRow } from "@/lib/queries";
import type { SeatingState } from "@/lib/seating";
import {
  updateFixedAction, addFixedAction, deleteFixedAction,
  updateVarAction, addVarAction, deleteVarAction,
  updateGuestRowAction, addGuestRowAction, deleteGuestRowAction,
  setBudgetParamsAction,
} from "@/app/admin/data-actions";

export interface AdminInitial {
  fixedCosts: FixedCost[];
  varCosts: VariableCost[];
  guests: AdminGuestRow[];
  cancelRate: number;
  contingency: number;
  coupleNames: string;
  seating: SeatingState | null; // couple only; null for the planner
}

const log = (e: unknown) => console.error("[admin persist]", e);

const SAVE_ERROR_MSG =
  "El último cambio NO se guardó. Esto pasa cuando la página quedó abierta durante una actualización — recarga la página y vuelve a capturar ese dato.";

export function useAdminStore(initial: AdminInitial) {
  const [fixedCosts, setFixed] = useState(initial.fixedCosts);
  const [varCosts, setVar] = useState(initial.varCosts);
  const [guests, setGuests] = useState(initial.guests);
  // Always-current guest rows for lookups inside stable callbacks (see updateGuest).
  // Synced in an effect (runs before any user event can fire a handler).
  const guestsRef = useRef(initial.guests);
  useEffect(() => {
    guestsRef.current = guests;
  }, [guests]);

  // ── save feedback: every persist call reports success (✓ chip) or failure (banner) ──
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(0);
  const dismissSaveError = useCallback(() => setSaveError(null), []);
  const track = useCallback(<T,>(p: Promise<T>): Promise<T | undefined> => {
    return p.then(
      (r) => {
        setSaveError(null);
        setSavedAt(Date.now());
        return r;
      },
      (e) => {
        log(e);
        setSaveError(SAVE_ERROR_MSG);
        return undefined;
      },
    );
  }, []);
  const [cancelRate, setCancelRateState] = useState(initial.cancelRate);
  const [contingency, setContingencyState] = useState(initial.contingency);

  // ── derived (identical math to useWeddingStore, scoped to Lista 1) ──
  // Lista 2 households are on hold until promoted: they don't count in the
  // headcount, budget, forecast, or RSVP pills. They show as their own bucket.
  const l1 = useMemo(() => guests.filter((g) => g.invite_round !== 2), [guests]);
  const invitees = useMemo(() => l1.reduce((s, g) => s + (Number(g.plus_one) || 1), 0), [l1]);
  const seatsL2 = useMemo(
    () => guests.filter((g) => g.invite_round === 2).reduce((s, g) => s + (Number(g.plus_one) || 1), 0),
    [guests],
  );
  const seatsNoViene = useMemo(
    () => l1.filter((g) => g.no_viene).reduce((s, g) => s + (Number(g.plus_one) || 1), 0),
    [l1],
  );
  const seatsDudoso = useMemo(
    () => l1.filter((g) => g.dudoso && !g.no_viene).reduce((s, g) => s + (Number(g.plus_one) || 1), 0),
    [l1],
  );
  const attendees = getExpectedAttendees(invitees, cancelRate);
  const fixedTotal = useMemo(() => getFixedTotal(fixedCosts), [fixedCosts]);
  const paidTotal = useMemo(() => getPaidTotal(fixedCosts), [fixedCosts]);
  const varTotal = useMemo(() => getVariableTotal(varCosts, attendees, invitees), [varCosts, attendees, invitees]);
  const subtotal = fixedTotal + varTotal;
  const contBuffer = subtotal * (contingency / 100);
  const grandTotal = subtotal + contBuffer;
  const balance = grandTotal - paidTotal;
  const perAttendee = getCostPerAttendee(grandTotal, attendees);
  const catBreakdown = useMemo(
    () => getCategoryBreakdown(fixedCosts, varCosts, attendees, invitees),
    [fixedCosts, varCosts, attendees, invitees],
  );
  // Confirmed counts the REDUCED attendee number from the RSVP stepper when present
  // (e.g. 4 of 6 seats confirmed → counts 4); falls back to assigned seats.
  const confirmed = useMemo(
    () => l1.filter((g) => g.rsvp === "Confirmed").reduce((s, g) => s + (g.confirmed_seats ?? (Number(g.plus_one) || 1)), 0),
    [l1],
  );
  const declined = useMemo(() => l1.filter((g) => g.rsvp === "Declined").reduce((s, g) => s + (Number(g.plus_one) || 1), 0), [l1]);
  const pending = useMemo(() => l1.filter((g) => g.rsvp === "Pending").reduce((s, g) => s + (Number(g.plus_one) || 1), 0), [l1]);
  const upcoming = useMemo(
    () =>
      fixedCosts
        .filter((c) => c.due && c.due !== "Pagado" && !isNaN(new Date(c.due).getTime()))
        .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
        .slice(0, 5),
    [fixedCosts],
  );

  // ── fixed mutations ──
  const updateFixed = useCallback((id: string, key: string, val: unknown) => {
    setFixed((p) => p.map((r) => (r.id === id ? { ...r, [key]: val } : r)));
    track(updateFixedAction(id, key, val));
  }, [track]);
  const deleteFixed = useCallback((id: string) => {
    setFixed((p) => p.filter((r) => r.id !== id));
    track(deleteFixedAction(id));
  }, [track]);
  const addFixed = useCallback(() => {
    track(addFixedAction()).then((row) => { if (row) setFixed((p) => [...p, row]); });
  }, [track]);

  // ── variable mutations ──
  const updateVar = useCallback((id: string, key: string, val: unknown) => {
    setVar((p) => p.map((r) => (r.id === id ? { ...r, [key]: val } : r)));
    track(updateVarAction(id, key, val));
  }, [track]);
  const deleteVar = useCallback((id: string) => {
    setVar((p) => p.filter((r) => r.id !== id));
    track(deleteVarAction(id));
  }, [track]);
  const addVar = useCallback(() => {
    track(addVarAction()).then((row) => { if (row) setVar((p) => [...p, row]); });
  }, [track]);

  // ── guest mutations (id = household id) ──
  const updateGuest = useCallback((id: string, key: string, val: unknown) => {
    // Coerce to the types the server expects (InlineSelect/checkboxes hand us strings/bools).
    const coerced =
      key === "plus_one" || key === "invite_round" ? Number(val)
      : key === "send_group" ? (val === "" || val == null ? null : Number(val))
      : key === "no_viene" || key === "dudoso" ? Boolean(val)
      : val;
    // Resolve guestId from the ref, NOT inside the setState updater: React defers
    // updater execution, so a variable captured there is often still empty when
    // the persist call would run — silently dropping writes.
    const guestId = guestsRef.current.find((r) => r.id === id)?.guestId ?? "";
    setGuests((p) =>
      p.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, [key]: coerced };
        // Mirror the server's display_name sync: "Nombre Apellido" unless the
        // Invitación field was explicitly overridden (server checks name_override;
        // optimistically we recompute whenever names change — the reload corrects
        // the rare overridden case).
        if (key === "first" || key === "last") {
          next.invitation = `${String(key === "first" ? coerced : r.first ?? "").trim()} ${String(key === "last" ? coerced : r.last ?? "").trim()}`.trim();
        }
        if (key === "invitation") next.invitation = String(coerced ?? "").trim();
        return next;
      }),
    );
    if (guestId) track(updateGuestRowAction(id, guestId, key, coerced));
  }, [track]);
  const deleteGuest = useCallback((id: string) => {
    setGuests((p) => p.filter((r) => r.id !== id));
    track(deleteGuestRowAction(id));
  }, [track]);
  const addGuest = useCallback(() => {
    track(addGuestRowAction()).then((row) => { if (row) setGuests((p) => [...p, row]); });
  }, [track]);

  // ── budget params (debounced persist) ──
  const paramTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistParams = useCallback((cancel: number, cont: number) => {
    if (paramTimer.current) clearTimeout(paramTimer.current);
    paramTimer.current = setTimeout(() => {
      track(setBudgetParamsAction(cancel, cont));
    }, 600);
  }, [track]);
  const setCancelRate = useCallback((n: number) => {
    setCancelRateState(n);
    persistParams(n, contingency);
  }, [contingency, persistParams]);
  const setContingency = useCallback((n: number) => {
    setContingencyState(n);
    persistParams(cancelRate, n);
  }, [cancelRate, persistParams]);

  return {
    coupleNames: initial.coupleNames,
    fixedCosts, varCosts, guests,
    invitees, cancelRate, contingency,
    setCancelRate, setContingency,
    attendees, fixedTotal, paidTotal, varTotal,
    subtotal, contBuffer, grandTotal, balance, perAttendee,
    catBreakdown, upcoming,
    confirmed, declined, pending,
    seatsL2, seatsNoViene, seatsDudoso,
    saveError, savedAt, dismissSaveError,
    updateFixed, deleteFixed, addFixed,
    updateVar, deleteVar, addVar,
    updateGuest, deleteGuest, addGuest,
  };
}

export type AdminStore = ReturnType<typeof useAdminStore>;
