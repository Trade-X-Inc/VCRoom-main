// Shared building blocks for docs pages. All docs pages are always
// light-themed (like the landing page), so colors here are explicit tokens,
// not theme-conditional. Brought onto PUBLIC-REGISTER.md v2.0 (25 Aug 2026,
// founder-reported fix, CLAUDE.md §20.5's tracked pending item) — VISUAL
// PASS ONLY, every prop/behavior unchanged, only the token/font/class layer.

import type { ReactNode } from "react";

const UI = "var(--font-v2-ui)";
const DOC = "var(--font-v2-doc)";
const DATA = "var(--font-v2-data)";

const INK = "var(--v2-ink)";
const INK_2 = "var(--v2-ink-secondary)";
const INK_3 = "var(--v2-ink-muted)";
const RULE = "var(--v2-rule)";
const RULE_LIGHT = "var(--v2-rule-light)";
const ACCENT = "var(--v2-accent)";
const ACCENT_WASH = "var(--v2-accent-wash)";
const ATTENTION = "var(--v2-attention)";
const ATTENTION_WASH = "var(--v2-attention-wash)";
const SATISFIED = "var(--v2-satisfied)";
const ADVERSE = "var(--v2-adverse)";
const PANEL = "var(--pub-n-00)";

export interface DocMeta {
  slug: string; // path under /docs
  title: string; // page H1 and <title> prefix
  description: string; // meta description, ≤150 chars
  updated: string; // ISO date, shown as "Last updated"
  toc: { id: string; label: string }[]; // drives "On this page"
}

export interface DocPage {
  meta: DocMeta;
  Body: () => ReactNode;
}

export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24"
      style={{ fontFamily: UI, fontWeight: 700, fontSize: "22px", letterSpacing: "-0.015em", color: INK, margin: "40px 0 12px" }}
    >
      <a href={`#${id}`} style={{ color: "inherit", textDecoration: "none" }}>
        {children}
      </a>
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return (
    <h3 style={{ fontFamily: UI, fontWeight: 600, fontSize: "16px", color: INK, margin: "24px 0 8px" }}>
      {children}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontFamily: DOC, fontSize: "15.5px", lineHeight: 1.7, color: INK_2, margin: "0 0 16px" }}>
      {children}
    </p>
  );
}

export function Lead({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontFamily: DOC, fontSize: "17px", lineHeight: 1.65, color: INK_2, margin: "0 0 24px" }}>
      {children}
    </p>
  );
}

export function A({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      style={{ color: ACCENT, textDecoration: "underline", textUnderlineOffset: "2px" }}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code
      style={{
        fontFamily: DATA, fontSize: "13px", color: INK_2,
        background: "var(--pub-n-09)", border: `1px solid ${RULE_LIGHT}`,
        borderRadius: "2px", padding: "1.5px 6px",
      }}
    >
      {children}
    </code>
  );
}

export function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol style={{ listStyle: "none", margin: "0 0 16px", padding: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: "12px", fontFamily: DOC, fontSize: "15.5px", lineHeight: 1.7, color: INK_2 }}>
          <span
            style={{
              flexShrink: 0, marginTop: "3px", display: "grid", placeItems: "center",
              height: "22px", width: "22px", borderRadius: "50%",
              background: ACCENT_WASH, border: `1px solid ${ACCENT}`,
              fontFamily: DATA, fontSize: "11px", fontWeight: 600, color: ACCENT,
            }}
          >
            {i + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

export function Rules({ items }: { items: ReactNode[] }) {
  return (
    <ul style={{ listStyle: "none", margin: "0 0 16px", padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: "10px", fontFamily: DOC, fontSize: "15.5px", lineHeight: 1.7, color: INK_2 }}>
          <span aria-hidden="true" style={{ marginTop: "10px", height: "5px", width: "5px", flexShrink: 0, borderRadius: "50%", background: INK_3 }} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Callout({ kind = "note", children }: { kind?: "note" | "warning"; children: ReactNode }) {
  const isWarning = kind === "warning";
  return (
    <div
      style={{
        marginBottom: "16px", borderRadius: "2px",
        border: `1px solid ${isWarning ? ATTENTION : ACCENT}`,
        background: isWarning ? ATTENTION_WASH : ACCENT_WASH,
        padding: "14px 16px", fontFamily: UI, fontSize: "13.5px", lineHeight: 1.6,
        color: isWarning ? ATTENTION : ACCENT,
      }}
    >
      {children}
    </div>
  );
}

/** "What the AI does / doesn't do" — required on every AI feature page. */
export function AIScope({ does, doesNot }: { does: ReactNode[]; doesNot: ReactNode[] }) {
  return (
    <div className="sm:grid-cols-2" style={{ marginBottom: "16px", display: "grid", gap: "16px" }}>
      <div style={{ border: `1px solid ${RULE}`, borderRadius: "2px", padding: "16px" }}>
        <div style={{ marginBottom: "8px", fontFamily: DATA, fontSize: "10.5px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: SATISFIED }}>
          The AI does
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
          {does.map((d, i) => (
            <li key={i} style={{ fontFamily: UI, fontSize: "13.5px", lineHeight: 1.6, color: INK_2 }}>
              {d}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ border: `1px solid ${RULE}`, borderRadius: "2px", padding: "16px" }}>
        <div style={{ marginBottom: "8px", fontFamily: DATA, fontSize: "10.5px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: ADVERSE }}>
          The AI does not
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
          {doesNot.map((d, i) => (
            <li key={i} style={{ fontFamily: UI, fontSize: "13.5px", lineHeight: 1.6, color: INK_2 }}>
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function DocTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div style={{ marginBottom: "16px", overflowX: "auto", border: `1px solid ${RULE}`, borderRadius: "2px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontFamily: UI, fontSize: "13.5px" }}>
        <thead>
          <tr style={{ borderBottom: `1.5px solid ${INK}`, background: "var(--pub-n-06)" }}>
            {head.map((h) => (
              <th
                key={h}
                style={{
                  padding: "10px 16px", fontWeight: 500, color: INK_3, whiteSpace: "nowrap",
                  fontFamily: DATA, fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.08em",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i === rows.length - 1 ? "none" : `1px solid ${RULE_LIGHT}`, verticalAlign: "top", background: PANEL }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "10px 16px", color: INK_2 }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
