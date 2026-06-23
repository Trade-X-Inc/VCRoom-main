import { type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

interface ChatResultCardProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  fullPageUrl?: string;
  fullPageLabel?: string;
  footerLabel?: string;
  onFooterAction?: () => void;
}

export function ChatResultCard({
  icon,
  title,
  children,
  fullPageUrl,
  fullPageLabel,
  footerLabel,
  onFooterAction,
}: ChatResultCardProps) {
  const hasFooter = !!(fullPageUrl || onFooterAction);
  const label = footerLabel ?? fullPageLabel ?? "Open full page";

  return (
    <div
      style={{
        background: "#111114",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "16px 20px",
        marginTop: 4,
        minWidth: 240,
        maxWidth: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: "rgba(124,58,237,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#A855F7",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{title}</span>
      </div>

      <div>{children}</div>

      {hasFooter && (
        <>
          {onFooterAction ? (
            <button
              onClick={onFooterAction}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                marginTop: 14,
                fontSize: 12,
                color: "#A855F7",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 500,
                padding: 0,
              }}
            >
              {label} <ArrowUpRight size={12} />
            </button>
          ) : (
            <a
              href={fullPageUrl}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                marginTop: 14,
                fontSize: 12,
                color: "#A855F7",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              {label} <ArrowUpRight size={12} />
            </a>
          )}
        </>
      )}
    </div>
  );
}
