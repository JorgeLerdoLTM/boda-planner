export const fmt = (n) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n || 0);

export const fmtShort = (n) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `$${Math.round(n / 1_000)}K`
      : fmt(n);

export const uid = () => Math.random().toString(36).slice(2, 9);

export const getExpectedAttendees = (invitees, cancellationRate) =>
  Math.round(invitees * (1 - cancellationRate / 100));

export const getFixedTotal = (fixedCosts) =>
  fixedCosts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

export const getPaidTotal = (fixedCosts) =>
  fixedCosts.reduce((sum, c) => sum + (Number(c.paid) || 0), 0);

export const getVariableTotal = (varCosts, attendees, invitees) =>
  varCosts.reduce((sum, c) => {
    const base = c.applies_to === "attendees" ? attendees : invitees;
    return sum + (Number(c.unit_cost) || 0) * base;
  }, 0);

export const getGrandTotal = (fixedTotal, varTotal, contingencyPct) =>
  (fixedTotal + varTotal) * (1 + contingencyPct / 100);

export const getCostPerAttendee = (total, attendees) =>
  attendees > 0 ? total / attendees : 0;

export const getCategoryBreakdown = (fixedCosts, varCosts, attendees, invitees) => {
  const map = {};
  fixedCosts.forEach((c) => {
    map[c.category] = (map[c.category] || 0) + (Number(c.amount) || 0);
  });
  varCosts.forEach((c) => {
    const base = c.applies_to === "attendees" ? attendees : invitees;
    map[c.category] = (map[c.category] || 0) + (Number(c.unit_cost) || 0) * base;
  });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

export const getScenario = (inv, cancelRate, fixedCosts, varCosts, contingency) => {
  const att = getExpectedAttendees(inv, cancelRate);
  const fixed = getFixedTotal(fixedCosts);
  const variable = getVariableTotal(varCosts, att, inv);
  const total = getGrandTotal(fixed, variable, contingency);
  return {
    invitees: inv,
    attendees: att,
    fixed,
    variable,
    total,
    perAttendee: getCostPerAttendee(total, att),
  };
};
