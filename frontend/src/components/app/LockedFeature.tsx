interface LockedFeatureProps {
  message: string;
  upgradeRole?: string;
  style?: React.CSSProperties;
}

export function LockedFeature({ message, upgradeRole, style }: LockedFeatureProps) {
  return (
    <div style={{
      padding: "32px 24px",
      border: "1px solid var(--border)",
      borderRadius: 12,
      background: "var(--card)",
      textAlign: "center",
      ...style,
    }}>
      <div style={{
        width: 40, height: 40,
        background: "rgba(124,58,237,0.1)",
        borderRadius: 8,
        margin: "0 auto 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20,
      }}>
        🔒
      </div>
      <p style={{ color: "var(--foreground)", fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
        {message}
      </p>
      {upgradeRole && (
        <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
          Ask your admin to change your role to <strong style={{ color: "var(--muted-foreground)" }}>{upgradeRole}</strong>.
        </p>
      )}
    </div>
  );
}
