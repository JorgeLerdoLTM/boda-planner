import { C } from "../../utils/theme";

export function CurrencyToggle({ currency, rate, toggle }) {
  return (
    <button
      onClick={toggle}
      title={`1 USD = ${rate.toFixed(2)} MXN`}
      style={{
        background: currency === "USD" ? C.blueLt : "#F0EFED",
        border: "none",
        color: currency === "USD" ? C.blueDk : C.muted,
        padding: "4px 10px",
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "'Inter', sans-serif",
        cursor: "pointer",
        letterSpacing: "0.04em",
        transition: "all 0.15s ease",
      }}
    >
      {currency === "MXN" ? "MXN → USD" : "USD → MXN"}
    </button>
  );
}
