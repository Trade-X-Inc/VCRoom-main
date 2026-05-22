import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { LangSwitcher } from "@/components/app/LangSwitcher";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="absolute inset-0 -z-10 backdrop-blur-xl bg-background/70 border-b border-border/60" />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/"><Logo /></Link>
        <div className="flex items-center gap-2">
          <LangSwitcher />
          <ThemeToggle />
          <Link to="/sign-in" search={{ redirect: "/app" }} className="hidden sm:inline-flex">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/sign-up" search={{ role: "founder" } as any}>
            <Button variant="brand" size="sm" className="gap-1.5">
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
