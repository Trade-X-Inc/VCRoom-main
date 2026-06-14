import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";

export const Route = createFileRoute("/app/accelerators")({
  head: () => ({ meta: [{ title: "Accelerators & Grants — Hockystick" }] }),
  component: Accelerators,
});

interface Program {
  id: string;
  name: string;
  type: "accelerator" | "incubator" | "grant" | "fund";
  category: "web2" | "web3" | "both";
  stage: string[];
  check_size?: string;
  equity?: string;
  location: string;
  focus: string[];
  description: string;
  url: string;
  notable?: string;
  deadline?: string;
  isOpen: boolean;
}

const PROGRAMS: Program[] = [
  {
    id: "afore",
    name: "Afore Capital",
    type: "fund",
    category: "web2",
    stage: ["Pre-idea", "Pre-seed"],
    check_size: "$1-2M",
    equity: "10-15%",
    location: "USA",
    focus: ["Founders-in-Residence", "Pre-idea builders"],
    description: "Largest dedicated pre-seed fund. Founders-in-Residence program for pre-idea builders.",
    url: "https://www.aforecapital.com",
    isOpen: true,
  },
  {
    id: "basecase",
    name: "Basecase Capital",
    type: "fund",
    category: "web2",
    stage: ["Pre-idea", "Pre-seed"],
    check_size: "$1-2M",
    location: "USA",
    focus: ["Solo GP", "Pre-idea"],
    description: "Solo GP Alana Goyal. $1-2M first checks, pre-idea stage.",
    url: "https://www.basecasecapital.com",
    isOpen: true,
  },
  {
    id: "2048",
    name: "2048 Ventures",
    type: "fund",
    category: "web2",
    stage: ["Pre-seed"],
    check_size: "Undisclosed",
    location: "NYC + Boston",
    focus: ["Vertical AI", "Deep tech", "Healthcare", "Biotech"],
    description: "$82M Fund III (Jan 2026). Pre-seed lead. Vertical AI, deep tech, healthcare, biotech.",
    url: "https://www.2048.vc",
    notable: "$82M Fund III",
    isOpen: true,
  },
  {
    id: "precursor",
    name: "Precursor Ventures",
    type: "fund",
    category: "web2",
    stage: ["Pre-seed"],
    check_size: "$500K-$1M",
    location: "USA",
    focus: ["Generalist", "First checks"],
    description: "Charles Hudson's $66M Fund V (April 2025). Pre-seed generalist.",
    url: "https://precursorvc.com",
    notable: "$66M Fund V",
    isOpen: true,
  },
  {
    id: "pax",
    name: "Pax Ventures",
    type: "fund",
    category: "web2",
    stage: ["Pre-seed"],
    check_size: "Undisclosed",
    location: "USA",
    focus: ["Solo GP", "Early stage"],
    description: "Ex-a16z Michelle Volz. $50M solo Fund I (March 2026).",
    url: "https://www.paxventures.com",
    notable: "$50M Fund I",
    isOpen: true,
  },
  {
    id: "seven-stars",
    name: "Seven Stars",
    type: "fund",
    category: "web2",
    stage: ["Pre-seed", "Seed"],
    check_size: "Undisclosed",
    location: "USA",
    focus: ["AI", "Consumer", "Enterprise"],
    description: "Steven Lee (ex-SV Angel). $40M debut oversubscribed in 5 weeks.",
    url: "https://www.sevenstars.vc",
    notable: "$40M oversubscribed",
    isOpen: true,
  },
  {
    id: "haystack",
    name: "Haystack",
    type: "fund",
    category: "web2",
    stage: ["Pre-seed", "Seed"],
    check_size: "$500K-$2M",
    location: "USA",
    focus: ["Early stage", "Consumer", "Enterprise"],
    description: "Semil Shah's Fund VIII: $85M core + $25M. Early in Figma, DoorDash, Instacart.",
    url: "https://haystack.vc",
    notable: "Backed Figma, DoorDash",
    isOpen: true,
  },
  {
    id: "anti-fund",
    name: "Anti Fund",
    type: "fund",
    category: "web2",
    stage: ["Pre-seed", "Seed"],
    check_size: "Undisclosed",
    location: "USA",
    focus: ["AI", "Robotics", "Frontier tech"],
    description: "$30M oversubscribed Fund I (Dec 2025). AI, robotics, frontier tech.",
    url: "https://www.anti.fund",
    notable: "$30M oversubscribed",
    isOpen: true,
  },
  {
    id: "mischief",
    name: "Mischief",
    type: "fund",
    category: "web2",
    stage: ["Seed", "Series A"],
    check_size: "$1-5M",
    location: "USA",
    focus: ["Generalist", "Operator-led"],
    description: "$80M Fund II from Plaid's Zachary Perret. $1-5M checks. Operator-led generalist.",
    url: "https://mischief.vc",
    notable: "$80M Fund II",
    isOpen: true,
  },
  {
    id: "mantis",
    name: "Mantis Venture Capital",
    type: "fund",
    category: "web2",
    stage: ["Seed", "Series A"],
    check_size: "Undisclosed",
    location: "USA",
    focus: ["B2B", "AI"],
    description: "The Chainsmokers' fund. $100M Fund III (July 2025), $225M AUM. B2B and AI.",
    url: "https://mantis.vc",
    notable: "$225M AUM",
    isOpen: true,
  },
  {
    id: "mighty",
    name: "Mighty Capital",
    type: "fund",
    category: "web2",
    stage: ["Seed", "Series A"],
    check_size: "Undisclosed",
    location: "USA",
    focus: ["Product-led B2B"],
    description: "$91M Fund III (April 2026). Product-led B2B. Six IPOs in eight years.",
    url: "https://mighty.capital",
    notable: "6 IPOs in 8 years",
    isOpen: true,
  },
  {
    id: "hummingbird",
    name: "Hummingbird Ventures",
    type: "fund",
    category: "web2",
    stage: ["Seed", "Series A"],
    check_size: "Undisclosed",
    location: "Global",
    focus: ["Contrarian", "Global early-stage"],
    description: "~$1.2B AUM. Global contrarian early-stage. Backed Lovable, Deliveroo, Kraken.",
    url: "https://hummingbird.vc",
    notable: "$1.2B AUM · Backed Kraken",
    isOpen: true,
  },
  {
    id: "striker",
    name: "Striker Venture Partners",
    type: "fund",
    category: "web2",
    stage: ["Series A", "Series B"],
    check_size: "$5-30M",
    location: "USA + Israel",
    focus: ["AI", "Cybersecurity"],
    description: "$165M Fund I (Oct 2025). Inception-stage AI + cybersecurity. Just 10 deals.",
    url: "https://www.strikervp.com",
    notable: "$165M Fund I",
    isOpen: true,
  },
  {
    id: "zero-shot",
    name: "Zero Shot Fund",
    type: "fund",
    category: "web2",
    stage: ["Seed", "Series A"],
    check_size: "Undisclosed",
    location: "USA",
    focus: ["Robotics", "Energy", "Automation", "AI Security"],
    description: "OpenAI alumni-led. $100M target, $20M first close (April 2026). Post-AGI thesis.",
    url: "https://zeroshottfund.com",
    notable: "OpenAI alumni",
    isOpen: true,
  },
  {
    id: "haun",
    name: "Haun Ventures",
    type: "fund",
    category: "web3",
    stage: ["Seed", "Series A"],
    check_size: "Undisclosed",
    location: "USA",
    focus: ["Crypto infrastructure", "AI agents"],
    description: "$1B across two new funds (May 2026). Crypto infrastructure + AI agents.",
    url: "https://haun.co",
    notable: "$1B new funds",
    isOpen: true,
  },
  {
    id: "yc",
    name: "Y Combinator",
    type: "accelerator",
    category: "web2",
    stage: ["Pre-seed", "Seed"],
    check_size: "$500K",
    equity: "7%",
    location: "San Francisco, USA",
    focus: ["All sectors", "Global"],
    description: "World's most prestigious accelerator. $500K for 7%. 2 batches per year.",
    url: "https://www.ycombinator.com/apply",
    notable: "Backed Airbnb, Stripe, Dropbox",
    deadline: "Rolling batches",
    isOpen: true,
  },
  {
    id: "techstars",
    name: "Techstars",
    type: "accelerator",
    category: "web2",
    stage: ["Pre-seed", "Seed"],
    check_size: "$120K",
    equity: "6%",
    location: "Global (100+ programs)",
    focus: ["All sectors", "Corporate partnerships"],
    description: "Global accelerator with 100+ programs. $120K for 6%. Strong corporate connections.",
    url: "https://www.techstars.com/apply",
    notable: "100+ programs worldwide",
    isOpen: true,
  },
  {
    id: "hub71",
    name: "Hub71",
    type: "accelerator",
    category: "web2",
    stage: ["Pre-seed", "Seed"],
    check_size: "Up to $100K",
    equity: "0%",
    location: "Abu Dhabi, UAE",
    focus: ["GCC founders", "All sectors"],
    description: "Abu Dhabi's global tech hub. Funding, housing, and visa support for startups.",
    url: "https://hub71.com",
    notable: "0% equity · UAE visa support",
    isOpen: true,
  },
  {
    id: "flat6labs",
    name: "Flat6Labs",
    type: "accelerator",
    category: "web2",
    stage: ["Pre-seed", "Seed"],
    check_size: "$30K-$100K",
    equity: "5-10%",
    location: "MENA (Cairo, Bahrain, Abu Dhabi)",
    focus: ["MENA founders", "Tech"],
    description: "Leading MENA accelerator. Programs in Egypt, Bahrain, UAE and beyond.",
    url: "https://www.flat6labs.com",
    notable: "MENA-focused",
    isOpen: true,
  },
  {
    id: "wamda",
    name: "Wamda Capital",
    type: "incubator",
    category: "web2",
    stage: ["Pre-seed", "Seed"],
    check_size: "$500K-$3M",
    location: "Dubai, UAE",
    focus: ["MENA", "Tech"],
    description: "MENA-focused VC and entrepreneur support platform. Strong regional network.",
    url: "https://wamda.com",
    notable: "MENA network leader",
    isOpen: true,
  },
  {
    id: "a16z-crypto",
    name: "a16z Crypto",
    type: "fund",
    category: "web3",
    stage: ["Seed", "Series A"],
    check_size: "$500K-$50M",
    location: "USA",
    focus: ["DeFi", "NFT", "Web3 infra", "DAOs"],
    description: "$7.6B crypto fund. Most active Web3 investor globally.",
    url: "https://a16zcrypto.com",
    notable: "$7.6B crypto fund",
    isOpen: true,
  },
  {
    id: "binance-labs",
    name: "Binance Labs",
    type: "accelerator",
    category: "web3",
    stage: ["Pre-seed", "Seed"],
    check_size: "Undisclosed",
    location: "Global",
    focus: ["Web3", "DeFi", "Blockchain"],
    description: "Binance's VC arm and incubator. Strong exchange listing advantage.",
    url: "https://labs.binance.com",
    notable: "Exchange listing support",
    isOpen: true,
  },
];

const CATEGORIES = ["all", "web2", "web3"] as const;
const TYPES = ["all", "fund", "accelerator", "incubator"] as const;
const STAGES = ["all", "Pre-idea", "Pre-seed", "Seed", "Series A+"] as const;

function matchesStage(program: Program, selectedStage: string) {
  if (selectedStage === "all") return true;
  if (selectedStage === "Series A+") {
    return program.stage.some((stage) => ["Series A", "Series B", "Series C+"].includes(stage));
  }
  return program.stage.includes(selectedStage);
}

function titleCase(value: string) {
  if (value === "web2") return "Web2";
  if (value === "web3") return "Web3";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function ProgramCard({ program }: { program: Program }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 hover:border-brand/30 transition-all flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">{program.name}</h3>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground border border-border/60">
              {titleCase(program.type)}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
              {titleCase(program.category)}
            </span>
          </div>
        </div>
        {program.isOpen && (
          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
            Open
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
        {program.description}
      </p>

      {program.notable && (
        <div className="text-xs text-warning font-medium mb-3">⭐ {program.notable}</div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-muted-foreground">
        {program.check_size && <div>💰 {program.check_size}</div>}
        {program.equity && <div>📊 {program.equity} equity</div>}
        <div>📍 {program.location}</div>
        {program.deadline && <div>📅 {program.deadline}</div>}
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {program.focus.slice(0, 3).map((focus) => (
          <span key={focus} className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground">
            {focus}
          </span>
        ))}
      </div>

      <a
        href={program.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto inline-flex w-full items-center justify-center gap-1.5 text-center text-xs py-2 rounded-lg bg-brand text-brand-foreground hover:bg-brand/90 transition-colors"
      >
        Learn More & Apply <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

function Accelerators() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("all");
  const [type, setType] = useState<(typeof TYPES)[number]>("all");
  const [stage, setStage] = useState<(typeof STAGES)[number]>("all");
  const [search, setSearch] = useState("");

  const filteredPrograms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return PROGRAMS.filter((program) => {
      const categoryMatches = category === "all" || program.category === category || program.category === "both";
      const typeMatches = type === "all" || program.type === type;
      const stageMatches = matchesStage(program, stage);
      const searchMatches =
        !query ||
        program.name.toLowerCase().includes(query) ||
        program.description.toLowerCase().includes(query) ||
        program.location.toLowerCase().includes(query) ||
        program.focus.some((focus) => focus.toLowerCase().includes(query));

      return categoryMatches && typeMatches && stageMatches && searchMatches;
    });
  }, [category, type, stage, search]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>
          Accelerators, Incubators & Funds
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Curated programs for every stage. Apply directly from your dashboard.
        </p>
      </div>

      <div className="mb-6 px-4 py-3 rounded-xl bg-brand/10 border border-brand/20 text-sm text-brand">
        🚀 Direct application integration, AI-matched recommendations, and personalised program alerts coming after public launch.
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex rounded-lg border border-border/60 overflow-hidden shrink-0">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-r border-border/60 last:border-r-0 ${
                  category === item ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                }`}
              >
                {item === "all" ? "All" : titleCase(item)}
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 lg:pb-0">
            {TYPES.map((item) => (
              <button
                key={item}
                onClick={() => setType(item)}
                className={`px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                  type === item
                    ? "bg-brand text-brand-foreground border-brand"
                    : "bg-accent text-muted-foreground border-border/60 hover:text-foreground"
                }`}
              >
                {item === "all" ? "All" : titleCase(item)}
              </button>
            ))}
          </div>

          <select
            value={stage}
            onChange={(event) => setStage(event.target.value as (typeof STAGES)[number])}
            className="px-3 py-2 rounded-lg border border-border/60 bg-background text-sm text-muted-foreground focus:outline-none focus:border-brand/50 shrink-0"
          >
            {STAGES.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All stages" : item}
              </option>
            ))}
          </select>

          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search programs, focus areas, locations..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-border/60 bg-background text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
            />
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Showing {filteredPrograms.length} of {PROGRAMS.length} programs
        </div>
      </div>

      {filteredPrograms.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No programs match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrograms.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      )}
    </div>
  );
}
