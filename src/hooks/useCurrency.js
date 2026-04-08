import { useState, useEffect, useCallback } from "react";

const FALLBACK_RATE = 17.66;

export function useCurrency() {
  const [currency, setCurrency] = useState("MXN");
  const [rate, setRate] = useState(FALLBACK_RATE);

  useEffect(() => {
    fetch("https://api.exchangerate-api.com/v4/latest/USD")
      .then((r) => r.json())
      .then((data) => {
        if (data?.rates?.MXN) setRate(data.rates.MXN);
      })
      .catch(() => {});
  }, []);

  const toggle = useCallback(() => setCurrency((c) => (c === "MXN" ? "USD" : "MXN")), []);

  const convert = useCallback(
    (mxn) => (currency === "MXN" ? mxn : mxn / rate),
    [currency, rate],
  );

  const fmt = useCallback(
    (n) =>
      new Intl.NumberFormat(currency === "MXN" ? "es-MX" : "en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(convert(n || 0)),
    [currency, convert],
  );

  const fmtShort = useCallback(
    (n) => {
      const v = convert(n || 0);
      const sym = currency === "MXN" ? "$" : "US$";
      return v >= 1_000_000
        ? `${sym}${(v / 1_000_000).toFixed(1)}M`
        : v >= 1_000
          ? `${sym}${Math.round(v / 1_000)}K`
          : fmt(n);
    },
    [currency, convert, fmt],
  );

  return { currency, rate, toggle, convert, fmt, fmtShort };
}
