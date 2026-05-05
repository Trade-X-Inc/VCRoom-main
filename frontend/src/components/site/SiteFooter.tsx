import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

export function SiteFooter() {
  const cols = [
    {
      title: "Product",
      links: [
        ["Founder app", "/app"],
        ["Investor app", "/app/investor"],
        ["Deal Room", "/app/deal-room/dr_001"],
        ["Pricing", "/pricing"],
      ],
    },
    {
      title: "Solutions",
      links: [
        ["Fundraising CRM", "/solutions/fundraising-crm"],
        ["VC Deal Room", "/solutions/vc-deal-room"],
        ["Due Diligence", "/solutions/due-diligence"],
        ["Investor Pipeline", "/solutions/investor-pipeline"],
        ["Raise your first $1M", "/solutions/raise-1m"],
      ],
    },
    {
      title: "Company",
      links: [
        ["About", "/"],
        ["Customers", "/"],
        ["Careers", "/"],
        ["Contact", "/"],
      ],
    },
    {
      title: "Resources",
      links: [
        ["Changelog", "/"],
        ["Security", "/"],
        ["Terms", "/terms"],
        ["Privacy", "/privacy"],
      ],
    },
  ];

  return (
    <footer className="border-t border-border/60 bg-gradient-soft">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              The investor-grade platform where deals get decided.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div className="text-xs font-semibold uppercase tracking-wider text-foreground/80">{c.title}</div>
              <ul className="mt-4 space-y-2.5">
                {c.links.map(([label, to]) => (
                  <li key={label}>
                    <Link to={to as string} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-6 md:flex-row md:items-center">
          <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} Venture Room, Inc.</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
