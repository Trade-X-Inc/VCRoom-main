const SYNE = "Syne, sans-serif";
const DM = "DM Sans, sans-serif";

const ROWS = [
  { need: "Verified founder identity", old: "Cold outreach + gut feel", hs: "Automated 4-point check" },
  { need: "Document due diligence", old: "Hire a DD firm ($5–50K)", hs: "AI analysis, instant" },
  { need: "NDA execution", old: "Lawyer + DocuSign ($500+)", hs: "Built-in, DIAC-arbitrated" },
  { need: "Deal room", old: "Datasite / Firmex ($2,000+/mo)", hs: "Included" },
  { need: "Investor pipeline", old: "Affinity ($1,000+/mo)", hs: "Included" },
  { need: "Founder readiness check", old: "Advisor ($200+/hr)", hs: "AI-powered, instant" },
];

const COMPACT_ROWS = ROWS.filter((r) =>
  ["Document due diligence", "NDA execution", "Deal room", "Investor pipeline"].includes(r.need),
);

export function CostComparisonTable({ variant, compact }: { variant: "dark" | "light"; compact?: boolean }) {
  const dark = variant === "dark";
  const rows = compact ? COMPACT_ROWS : ROWS;

  const border = dark ? "var(--border)" : "#E5E7EB";
  const headColor = dark ? "var(--muted-foreground)" : "#6B7280";
  const needColor = dark ? "#FFFFFF" : "#111827";
  const oldColor = dark ? "var(--muted-foreground)" : "#6B7280";
  const hsColor = dark ? "#10B981" : "#059669";
  const cardBg = dark ? "#111113" : "#FFFFFF";
  const totalColor = dark ? "var(--muted-foreground)" : "#4B5563";

  return (
    <div>
      <div
        className="rounded-none overflow-x-auto"
        style={{ background: cardBg, border: `1px solid ${border}` }}
      >
        <table className="w-full" style={{ minWidth: 560, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["What you need", "Old way", "Hockystick"].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3 text-xs font-bold uppercase tracking-[0.1em]"
                  style={{ color: headColor, fontFamily: SYNE, borderBottom: `1px solid ${border}` }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.need}>
                <td
                  className="px-5 py-3.5 text-sm font-semibold"
                  style={{ color: needColor, fontFamily: SYNE, borderBottom: i < rows.length - 1 ? `1px solid ${border}` : "none" }}
                >
                  {r.need}
                </td>
                <td
                  className="px-5 py-3.5 text-sm"
                  style={{ color: oldColor, fontFamily: DM, borderBottom: i < rows.length - 1 ? `1px solid ${border}` : "none" }}
                >
                  {r.old}
                </td>
                <td
                  className="px-5 py-3.5 text-sm font-medium"
                  style={{ color: hsColor, fontFamily: DM, borderBottom: i < rows.length - 1 ? `1px solid ${border}` : "none" }}
                >
                  {r.hs}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-5 text-center text-sm" style={{ color: totalColor, fontFamily: DM }}>
        Total cost with traditional tools: <span style={{ fontWeight: 600 }}>$5,000–15,000+ per raise.</span>{" "}
        Hockystick: <span style={{ fontWeight: 700, color: dark ? "#FFFFFF" : "var(--brand)", fontFamily: SYNE }}>$49/month.</span>
      </p>
    </div>
  );
}
