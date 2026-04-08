import { useState, useMemo, useCallback } from "react";
import { SEED_FIXED, SEED_VARIABLE, SEED_GUESTS, DEFAULT_SETTINGS } from "../data/weddingData";
import {
  getExpectedAttendees,
  getFixedTotal,
  getPaidTotal,
  getVariableTotal,
  getGrandTotal,
  getCostPerAttendee,
  getCategoryBreakdown,
  uid,
} from "../utils/calculations";

export function useWeddingStore() {
  const [fixedCosts, setFixed] = useState(SEED_FIXED);
  const [varCosts, setVar] = useState(SEED_VARIABLE);
  const [guests, setGuests] = useState(SEED_GUESTS);
  const [invitees, setInvitees] = useState(DEFAULT_SETTINGS.totalInvitees);
  const [cancelRate, setCancelRate] = useState(DEFAULT_SETTINGS.cancellationRate);
  const [contingency, setContingency] = useState(DEFAULT_SETTINGS.contingency);

  // Derived values
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

  // RSVP counts
  const confirmed = useMemo(() => guests.filter((g) => g.rsvp === "Confirmed").length, [guests]);
  const declined = useMemo(() => guests.filter((g) => g.rsvp === "Declined").length, [guests]);
  const pending = useMemo(() => guests.filter((g) => g.rsvp === "Pending").length, [guests]);
  const plusOnes = useMemo(() => guests.filter((g) => g.plus_one >= 2).length, [guests]);

  // Fixed cost mutations
  const updateFixed = useCallback((id, key, val) => setFixed((p) => p.map((r) => (r.id === id ? { ...r, [key]: val } : r))), []);
  const deleteFixed = useCallback((id) => setFixed((p) => p.filter((r) => r.id !== id)), []);
  const addFixed = useCallback(
    () => setFixed((p) => [...p, { id: "f" + uid(), category: "", name: "", amount: 0, paid: 0, due: "", status: "Por Definir", notes: "" }]),
    [],
  );

  // Variable cost mutations
  const updateVar = useCallback((id, key, val) => setVar((p) => p.map((r) => (r.id === id ? { ...r, [key]: val } : r))), []);
  const deleteVar = useCallback((id) => setVar((p) => p.filter((r) => r.id !== id)), []);
  const addVar = useCallback(
    () => setVar((p) => [...p, { id: "v" + uid(), category: "", name: "", applies_to: "attendees", unit_cost: 0, min_guests: 0, notes: "" }]),
    [],
  );

  // Guest mutations
  const updateGuest = useCallback((id, key, val) => setGuests((p) => p.map((r) => (r.id === id ? { ...r, [key]: val } : r))), []);
  const deleteGuest = useCallback((id) => setGuests((p) => p.filter((r) => r.id !== id)), []);
  const addGuest = useCallback(
    () =>
      setGuests((p) => [
        ...p,
        { id: "g" + uid(), side: "Lorel", group: "", first: "", last: "", plus_one: 1, phone: "", rsvp: "Pending", inv_sent: "Not Sent", dietary: "", notes: "" },
      ]),
    [],
  );

  // Upcoming payments
  const upcoming = useMemo(
    () =>
      fixedCosts
        .filter((c) => c.due && c.due !== "Pagado" && !isNaN(new Date(c.due)))
        .sort((a, b) => new Date(a.due) - new Date(b.due))
        .slice(0, 5),
    [fixedCosts],
  );

  return {
    // State
    fixedCosts, varCosts, guests,
    invitees, cancelRate, contingency,
    // Setters
    setInvitees, setCancelRate, setContingency,
    // Derived
    attendees, fixedTotal, paidTotal, varTotal,
    subtotal, contBuffer, grandTotal, balance, perAttendee,
    catBreakdown, upcoming,
    confirmed, declined, pending, plusOnes,
    // Mutations
    updateFixed, deleteFixed, addFixed,
    updateVar, deleteVar, addVar,
    updateGuest, deleteGuest, addGuest,
  };
}
