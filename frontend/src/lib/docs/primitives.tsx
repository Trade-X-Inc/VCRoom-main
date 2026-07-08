// Shared building blocks for docs pages. All docs pages are always light-themed
// (like the landing page), so colors here are explicit grays, not theme tokens.

import type { ReactNode } from "react";

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
      className="group scroll-mt-24 text-xl font-semibold text-gray-900 mt-10 mb-3"
      style={{ fontFamily: "Syne, sans-serif" }}
    >
      <a href={`#${id}`} className="no-underline text-gray-900 hover:text-purple-700">
        {children}
      </a>
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-gray-900 mt-6 mb-2" style={{ fontFamily: "Syne, sans-serif" }}>
      {children}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-7 text-gray-700 mb-4">{children}</p>;
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="text-base leading-7 text-gray-600 mb-6">{children}</p>;
}

export function A({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      className="text-purple-700 underline decoration-purple-300 underline-offset-2 hover:decoration-purple-700"
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-gray-100 border border-gray-200 px-1.5 py-0.5 text-[13px] text-gray-800 font-mono">
      {children}
    </code>
  );
}

export function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="mb-4 space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-7 text-gray-700">
          <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-purple-50 border border-purple-200 text-xs font-semibold text-purple-700">
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
    <ul className="mb-4 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-[15px] leading-7 text-gray-700">
          <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Callout({ kind = "note", children }: { kind?: "note" | "warning"; children: ReactNode }) {
  const styles =
    kind === "warning"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : "border-purple-200 bg-purple-50 text-purple-950";
  return (
    <div className={`mb-4 rounded-lg border px-4 py-3 text-sm leading-6 ${styles}`}>{children}</div>
  );
}

/** "What the AI does / doesn't do" — required on every AI feature page. */
export function AIScope({ does, doesNot }: { does: ReactNode[]; doesNot: ReactNode[] }) {
  return (
    <div className="mb-4 grid gap-4 sm:grid-cols-2">
      <div className="rounded-lg border border-gray-200 p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">The AI does</div>
        <ul className="space-y-1.5">
          {does.map((d, i) => (
            <li key={i} className="text-sm leading-6 text-gray-700">
              {d}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-gray-200 p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-700">The AI does not</div>
        <ul className="space-y-1.5">
          {doesNot.map((d, i) => (
            <li key={i} className="text-sm leading-6 text-gray-700">
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
    <div className="mb-4 overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {head.map((h) => (
              <th key={h} className="px-4 py-2.5 font-semibold text-gray-900 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0 align-top">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-gray-700">
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
