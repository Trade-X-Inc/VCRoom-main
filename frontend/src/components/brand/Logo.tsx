import { useEffect, useState } from "react";

export function Logo({
  withWordmark = true,
  size = "default",
}: {
  withWordmark?: boolean;
  size?: "default" | "lg";
}) {
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const logoSrc = isDark ? "/logo-dark.svg" : "/logo-light.svg";
  const logoSize = size === "lg" ? "h-10 w-10" : "h-8 w-8";

  return (
    <div className="flex items-center gap-2">
      <img
        src={logoSrc}
        alt="Hockeystick"
        className={`${logoSize} rounded-lg object-contain`}
        style={{ imageRendering: "crisp-edges" }}
      />
      {withWordmark && (
        <span className={`font-bold tracking-tight text-foreground ${size === "lg" ? "text-[18px]" : "text-[15px]"}`}>
          Hockeystick
        </span>
      )}
    </div>
  );
}
