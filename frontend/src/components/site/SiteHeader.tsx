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
        <Link to="/"><Logo size="lg" /></Link>
        <div className="flex items-center gap-2">
          <LangSwitcher />
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/sign-in" search={{ redirect: "/app" }}>Sign in</Link>
          </Button>
          <Button asChild variant="brand" size="sm" className="gap-1.5">
            <Link to="/sign-up" search={{ role: "founder" } as any}>
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
