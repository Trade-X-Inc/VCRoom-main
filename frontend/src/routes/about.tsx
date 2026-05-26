import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — Hockystick" },
      { name: "description", content: "Learn about the mission behind Hockystick and how we're transforming venture capital interactions." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-wider text-brand font-medium">Our Mission</div>
          <h1 className="mt-3 text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-tight">
            Building the operating system for the next generation of venture.
          </h1>
          <p className="mt-8 text-lg md:text-xl text-muted-foreground leading-relaxed">
            Hockystick was born out of a simple observation: fundraising is the most critical part of a startup's journey, yet it remains one of the most fragmented and unstructured processes.
          </p>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            We're building a platform that bridges the gap between founders and investors, providing a structured, secure, and AI-enhanced workspace where deals don't just get discussed—they get decided.
          </p>
          <div className="mt-12">
            <Link to="/sign-up"><Button size="lg" className="gap-2">Join the journey <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}