import { Logo } from "@/components/brand/Logo";
import { Check, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-[1fr_520px]">
      <div className="hidden lg:block relative overflow-hidden bg-primary text-primary-foreground p-12">
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
        <div className="absolute inset-0 noise opacity-40" />
        <div className="relative h-full flex flex-col">
          <Logo />
          <div className="my-auto max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent px-3 py-1 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" /> SOC 2 · Bank-grade encryption
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.03em] leading-tight">The fundraising operating system for serious teams.</h1>
            <p className="mt-4 text-primary-foreground/70">From first outreach to closed term sheet — manage every investor, document, and decision in one premium environment.</p>
            <div className="mt-10 space-y-3 text-sm">
              {["AI-powered investor CRM", "Watermarked deal rooms", "Audit log on every action", "Used by 1,200+ founders & funds"].map((t) => (
                <div key={t} className="flex items-center gap-2 text-primary-foreground/85"><Check className="h-4 w-4 text-success" /> {t}</div>
              ))}
            </div>
          </div>
          <div className="text-xs text-primary-foreground/50">© Hockystick</div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8"><Logo /></div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function GoogleButton({ onClick }: { onClick?: () => void }) {
  return (
    <button onClick={onClick} type="button" className="w-full inline-flex items-center justify-center gap-2.5 rounded-md border border-border/60 bg-background py-2.5 text-sm font-medium hover:bg-accent transition-colors">
      <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.97 6.97 0 0 1 5.46 12c0-.73.13-1.44.36-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.1 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
      Continue with Google
    </button>
  );
}

export function Divider({ label = "or" }: { label?: string }) {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/60" /></div>
      <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground">{label}</span></div>
    </div>
  );
}

export function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-xs font-medium text-foreground/80">{label}</label>
      <input
        {...props}
        className="mt-1.5 w-full rounded-md border border-border/60 bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-shadow"
      />
    </div>
  );
}
