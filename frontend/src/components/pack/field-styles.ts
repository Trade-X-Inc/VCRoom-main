// Shared style objects for the pack form controls (same tokens as components/lcs/FormField.tsx).
export const packLabelStyle: import("react").CSSProperties = {
  fontFamily: "var(--font-lcs-ui)",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--lcs-ink)",
};
export const packHelperStyle = (
  error: boolean,
): import("react").CSSProperties => ({
  fontFamily: "var(--font-lcs-ui)",
  fontSize: 12,
  color: error ? "var(--lcs-attention)" : "var(--lcs-ink-muted)",
});
export const packInputStyle = (
  error: boolean,
): import("react").CSSProperties => ({
  height: 36,
  fontFamily: "var(--font-lcs-ui)",
  fontSize: 14,
  color: "var(--lcs-ink)",
  background: "var(--lcs-white)",
  border: `1px solid ${error ? "var(--lcs-attention)" : "var(--lcs-line)"}`,
  borderRadius: 0,
  padding: "0 10px",
});
