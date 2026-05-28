import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => {
    const post = POSTS_MAP[params.slug];
    return {
      meta: post
        ? [
            { title: `${post.title} — Hockystick Blog` },
            { name: "description", content: post.excerpt },
          ]
        : [],
    };
  },
  component: BlogArticle,
});

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  author: string;
  readTime: string;
  category: string;
  excerpt: string;
  content: string;
}

const POSTS_MAP: Record<string, BlogPost> = {
  "why-deal-rooms-replace-email": {
    slug: "why-deal-rooms-replace-email",
    title: "Why Deal Rooms Are Replacing Email for Fundraising",
    date: "May 2026",
    author: "Hockystick Team",
    readTime: "5 min read",
    category: "Fundraising",
    excerpt: "Founders waste 40% of their fundraising time on email management. Here's why the best VCs are moving to structured deal rooms.",
    content: `
The fundraising process hasn't fundamentally changed in 20 years. Founders pitch, investors ask questions, and everything gets discussed via email threads that spiral into chaos.

A founder pitches to an investor. The investor forwards the pitch deck to partners. Partners ask questions via email. The founder answers via email. Someone loses an attachment. A question gets lost in a thread. The founder re-pitches slightly differently to a different partner who never got the full context.

This is the status quo. And it's costing founders millions in lost deals and millions of hours in wasted time.

## The Problem: Email Isn't Built for Deal Management

Email was designed for messages, not for complex collaborative processes. When you're managing a fundraising round with multiple investors, multiple documents, and multiple stakeholders asking overlapping questions, email becomes a liability.

Consider what happens in a typical email-based fundraising process:

- Your pitch deck lives in Dropbox, but investors get outdated versions forwarded around
- Questions about your cap table get asked three times by different partners
- Your financial model gets downloaded, edited locally, and sent back in five different versions
- Due diligence documents are scattered across dozens of emails
- There's no single source of truth—just a growing archive of confused threads

Research shows that founders spend 40% of their fundraising time managing email logistics rather than actually fundraising. That's not pitching, building relationships, or closing deals. That's just wrangling information.

Worse, this creates risk. Unencrypted pitch decks and financial documents in email are security nightmares. VCs are increasingly concerned about information leaks when founders use email as a filing system.

## What Deal Rooms Solve

A deal room is a structured, secure workspace where all fundraising happens in one place. Instead of emails bouncing around, everything is centralized: documents, questions, communication, and progress.

Here's what changes when you move to a deal room:

**Organized Information**: Your pitch deck, financial models, cap table, and all supporting documents live in one place. Investors see the latest version. No more outdated files.

**Consolidated Questions**: When investors ask questions, they see if other investors already asked the same thing. This eliminates duplicate work and ensures consistent answers.

**Secure Access**: Deal rooms encrypt documents and track access. You know exactly who viewed what and when. This is table stakes for institutional investors in 2026.

**Better Relationship Building**: With less administrative friction, founders and investors can focus on what actually matters: understanding fit, building trust, and closing deals.

**Institutional Credibility**: Using a modern deal room signals to investors that you're organized and professional. Many top-tier VCs now expect founders to use structured platforms.

## Key Features to Look For

If you're considering a deal room platform for your fundraising, look for these essentials:

**Native Integration with Your Tools**: The platform should work with Google Calendar (for meeting scheduling), email (for notifications), and your existing file systems.

**Watermarking and Security**: Documents should be watermarked with recipient information and tracked. You need to know if your pitch deck is being shared beyond the intended investor.

**AI-Powered Insights**: Modern deal rooms use AI to help you understand investor feedback, track progress, and identify next steps. This is no longer nice-to-have; it's expected.

**Mobile Access**: Investors are busy. They need to review materials on their phone or tablet during commutes. Your deal room should work seamlessly on mobile.

**Real-Time Collaboration**: Partners should be able to annotate documents, add comments, and collaborate without creating new versions or email chains.

## Getting Started

The best time to move to a deal room is before you start pitching at scale. Setting this up early means you can invite investors into an organized space from day one, instead of migrating later when chaos has already set in.

Start by uploading your core materials: pitch deck, financial model, executive summary. Then invite your initial batch of investor targets. As you pitch, you'll immediately see the value of having everything in one place.

The goal isn't to replace email entirely—you'll still communicate with investors via email. But the back-and-forth, the document versioning, the question tracking, the information organization—that all belongs in a deal room.

Founders who embrace this now have a competitive advantage. They close deals faster. They build better relationships with investors. And they spend less time managing logistics. If you want to start with a structured workspace, [create a Hockystick account](https://hockystick.app/sign-up) and build your first deal room before your next investor meeting.

The future of fundraising isn't email. It's organized, secure, collaborative deal rooms. The best founders and investors are already there.
    `,
  },
  "ai-due-diligence-2026": {
    slug: "ai-due-diligence-2026",
    title: "How AI is Changing Due Diligence in 2026",
    date: "May 2026",
    author: "Hockystick Team",
    readTime: "7 min read",
    category: "AI & VC",
    excerpt: "AI due diligence tools now analyze pitch decks, financials, and market data in minutes. What this means for founders and investors.",
    content: `
Due diligence has always been the bottleneck in venture capital. A VC partner receives 100 pitches per week. They have time to deeply investigate maybe three of them. By the time they request financials, have them reviewed, and analyze cap table math, weeks have passed.

Meanwhile, founders are raising from multiple investors simultaneously. A founder who wants to close a Series A in three months can't afford to wait six weeks for due diligence on each term sheet.

AI is changing this dynamic entirely. And the implications are profound for both founders and investors.

## The Old Way: Manual, Slow, Inconsistent

Traditional due diligence is a human-intensive process. A partner requests financial models, cap tables, and customer data. An associate spends days reviewing these manually, comparing them to benchmarks, checking for inconsistencies.

Common issues:
- Mathematical errors in cap tables go unnoticed
- Financials aren't comparable across companies
- Investor memos take weeks to prepare
- Key insights get buried in spreadsheets
- Different partners analyze the same company inconsistently

The result is that investors often miss critical risks—or take so long to find them that the opportunity passes.

## What AI Changes

Modern AI due diligence tools do several things at once:

**Instant Financial Analysis**: Upload financial models. AI extracts key metrics, identifies red flags, and benchmarks against comparable companies. What took an associate four hours now takes 30 seconds.

**Deck Breakdown**: Your pitch deck gets analyzed for narrative consistency, claims vs. data, and risk areas. AI identifies unsupported claims and flags them for human review.

**Cap Table Verification**: Upload your cap table. AI checks for mathematical consistency, identifies unusual terms, and flags potential issues like vesting cliffs or unusual preferences.

**Market Validation**: AI cross-references your market size claims with public data. If you claim a $50B TAM but your market data comes from 2019, AI flags it.

**Competitive Analysis**: AI builds a competitive landscape map from your deck and identifies risks you didn't mention.

The net result: what used to take a week takes an afternoon. And the analysis is more thorough and consistent because it's not subject to human bias or fatigue.

## What This Means for Founders

If you're raising capital, AI due diligence is now table stakes. Here's what's changing:

**Faster Decisions**: Investors can now make yes/no decisions in days instead of weeks. Your fundraising timeline compresses.

**Higher Standards**: Because analysis is faster and more rigorous, investors expect better prep from founders. Sloppy decks and inconsistent financials get rejected immediately.

**Standardized Diligence**: Every investor uses similar tools, so they ask similar questions. You need one strong narrative, not different stories for different investors.

**Transparency is Valued**: AI exposes inconsistencies. Founders who are transparent about challenges actually do better than those who hide them (AI finds them anyway).

The founders raising capital most efficiently in 2026 are those who:
- Present financials that are mathematically clean
- Tell a consistent story across all materials
- Support claims with data
- Acknowledge market risks proactively

## What This Means for Investors

For VC firms, AI due diligence is a massive productivity unlock:

**Better Decision Making**: You can now properly evaluate 20 pitches instead of three. This diversifies your deal flow and improves outcomes.

**Risk Reduction**: AI catches errors and red flags that humans miss. Your portfolio quality improves.

**Partner Leverage**: Your associates can focus on relationship building and follow-on work instead of spreadsheet analysis. This increases productivity per dollar spent on staff.

**Consistent Evaluation**: AI ensures every deal gets evaluated against the same criteria, reducing partner subjectivity and politics.

The smartest VCs are using AI not to replace people, but to multiply their effectiveness. One partner can now cover twice the deal flow because due diligence is faster and more scalable.

## The Human Element Remains Critical

Important caveat: AI is changing due diligence, not replacing it. The art of VC—understanding founder quality, assessing market timing, evaluating team cohesion—that's still fundamentally human.

What AI does is remove the tedious parts. It surfaces inconsistencies. It checks math. It benchmarks. It flags risks.

A great investor still uses AI tools, but then adds judgment. "Yes, the cap table checks out mathematically, but here's what that unusual investor preference might mean for our control..."

The founders and investors succeeding in 2026 aren't choosing between AI and human judgment. They're using AI to make human judgment better.

## What's Next

AI due diligence is moving toward predictive analysis. Instead of just reviewing past data, tools are now modeling future scenarios. "If this company grows at this rate with this unit economics, here's what the Series B environment might look like..."

For founders raising capital today, the message is clear: assume your diligence will be AI-first. Make sure your materials are clean, consistent, and data-driven. The investors analyzing you will be using tools that catch every mathematical error and narrative inconsistency. A clean, AI-ready fundraising workspace starts with organized documents and tracked investor activity; [Hockystick can help you set that up](https://hockystick.app/sign-up).

And for investors, the opportunity is to compound efficiency with judgment. Use AI to evaluate more deals faster. Use human insight to make better bets on the ones that pass the filter.

The future of due diligence isn't less rigorous. It's faster, more consistent, and pairs human judgment with machine intelligence.
    `,
  },
  "seed-fundraising-guide": {
    slug: "seed-fundraising-guide",
    title: "The Complete Seed Fundraising Guide for 2026",
    date: "April 2026",
    author: "Hockystick Team",
    readTime: "12 min read",
    category: "Fundraising",
    excerpt: "Everything you need to know about raising your seed round — from building your investor list to closing your first term sheet.",
    content: `
Raising a seed round is the first major milestone for most founders. It validates your idea, funds your team, and opens doors to future capital. But seed fundraising is also one of the most confusing parts of building a company.

How much should you raise? Who should you pitch to? What's a reasonable valuation? When should you start? This guide covers everything a founder needs to know about seed rounds in 2026.

## Part 1: Foundations

**What is a seed round?**
A seed round is typically the first institutional investment in a company. It's usually $500K to $3M, though this varies by industry and founder background. The purpose is to fund early product development, go-to-market, and hiring.

**Who invests in seed rounds?**
- Angel investors and angel syndicates
- Micro-VCs ($25M-$150M fund size)
- Seed-stage funds
- Friends and family
- Accelerators (Y Combinator, Plug and Play, etc.)

**What do seed investors expect?**
- A clear problem you're solving
- Early evidence of product-market fit (or strong founder conviction)
- A credible founding team
- A path to a larger market

**Key metrics that matter:**
- User growth (for B2C)
- Revenue or MRR (if you have it)
- Founder experience in the space
- Team composition and commitment

## Part 2: Getting Ready

**Prepare Your Materials** (you need these before you pitch)
- Pitch deck (12-15 slides)
- Executive summary (one page)
- Financial model (monthly projections for 3 years)
- Cap table (who owns what)
- Articles of incorporation (legal formation docs)

**Build Your Investor List** (start with 100+ targets)
Seed investors fall into categories:
1. Investors in your specific space (if you're in FinTech, target FinTech investors)
2. Investors who have backed founders like you (similar geography, background, experience)
3. Micro-VCs with a thesis matching your business
4. Angels who have succeeded in similar spaces

Start with 150 target investors. You'll pitch 50-70 of them. Of those, you'll get meetings with maybe 15. Of those, 3-5 will want to invest.

**Warm Introductions Matter**
Cold email to investors has about a 5% response rate. Warm introductions from someone the investor knows? That's 70%+.

Spend time getting intros from:
- Other founders the investor has backed
- Advisors or board members
- Employees at their previous companies
- Mutual connections

## Part 3: The Fundraising Timeline

**Months 1-2: Preparation**
- Finalize your pitch
- Build investor list
- Get warm introductions going
- Set target raise amount

**Months 2-4: Initial Conversations**
- First meetings (30 min coffee chats)
- Investor feedback on narrative
- Refine your story based on learnings

**Months 4-6: Deep Dives**
- Second meetings with seriously interested investors
- Due diligence (they request more information)
- Term sheet discussions

**Months 6-7: Closing**
- Negotiate terms
- Get investor legal review
- Final signatures

The entire process typically takes 4-6 months. Some founders are faster (2-3 months), some slower (8+ months). The key variable is investor conviction and how much back-and-forth you have on terms.

## Part 4: Key Business Terms

**Valuation**
Seed valuations in 2026 range from $2M-$10M for most founders. Factors that increase valuation:
- Existing revenue
- Experienced founding team
- Impressive user growth
- Elite university pedigree
- Prior founder success

First-time founders with a great idea but no revenue typically land $3M-$5M valuations.

**Dilution**
Seed rounds typically dilute founders by 15-25%. If you raise $1M at a $5M valuation, you're selling 16.7% of the company.

**Type of Investment**
- SAFE (Simple Agreement for Future Equity) — no dilution yet, converts later
- Preferred Stock — immediate dilution
- Convertible Note — converts into future preferred stock, includes interest rate

Most seed rounds now use SAFEs because they're simpler and favor founders.

**Investor Rights**
Watch for:
- Board seat (most seed investors don't get one)
- Pro-rata rights (right to invest in future rounds)
- Liquidation preference (order of payouts if exit)
- Anti-dilution (protection if you raise at lower valuation later)

## Part 5: Common Mistakes Founders Make

1. **Starting fundraising too early** — You need traction (users, revenue, or strong evidence of product-market fit). Pitching with just an idea is hard.

2. **Pitching too many investors at once** — You'll get lots of feedback and keep changing your story. Instead, pitch 5-10, refine, then expand.

3. **Trying to optimize valuation** — $1M more valuation sounds great. But if it adds 6 months to your fundraising, that's expensive in opportunity cost.

4. **Not building relationships early** — Start talking to investors 6 months before you want to raise. Get feedback. Build rapport. Then ask for money.

5. **Ignoring founder-investor fit** — A VC who doesn't understand your space is a bad investor, even if they give you money at a good valuation.

## Part 6: What Happens After Closing

Once your seed round closes, you have a new job: deliver on what you promised.

Investors expect:
- Monthly progress updates (even if they're bad)
- Quarterly deeper dives on metrics
- You staying focused and not getting distracted

Don't raise your Series A until you've hit clear milestones (usually 12-18 months after seed):
- Revenue growing at least 10% month-over-month
- User base 3-5x larger than when you raised seed
- Team expanded with critical hires

## Getting Started

The best time to start your seed fundraising is right now. Not because you need to raise immediately, but because relationship building takes time.

Start a list of 150 potential investors in your space. Identify 10-20 who seem like natural fits. Ask for introductions. Have coffees. Share your progress.

In 6 months, when you're ready to formally fundraise, you'll already have relationships with investors. That's how you build momentum for your round. When you are ready to move from relationship building to active diligence, [set up Hockystick](https://hockystick.app/sign-up) so every investor sees the same organized materials.

Seed fundraising is a marathon, not a sprint. The founders who succeed are those who start early, build relationships, and stay disciplined through the process.

Your seed round is the foundation of your company. Take your time. Get it right.
    `,
  },
  "vc-thesis-matching": {
    slug: "vc-thesis-matching",
    title: "Thesis-Match: Why Most Founders Pitch the Wrong Investors",
    date: "April 2026",
    author: "Hockystick Team",
    readTime: "6 min read",
    category: "Strategy",
    excerpt: "73% of pitches go to investors who would never invest based on thesis. Here's how to fix your targeting.",
    content: `
A founder raises a seed round in 6 months. Another founder raises the same amount in 3 weeks. What's the difference?

It's not the idea. It's not the pitch deck. It's often the investor targeting.

Founders who get multiple term sheets quickly have figured out something critical: they're not pitching everyone. They're pitching the right investors.

## The Problem: Spray and Pray

Most founders approach fundraising like a sales funnel. They compile a list of 200 VCs, send personalized emails to 150, get meetings with maybe 20, and hope one converts.

This is called "spray and pray" fundraising. And it's inefficient.

Here's why: every VC has a thesis. An investment thesis is a clear statement of what kind of companies they invest in. Some VCs invest only in B2B SaaS. Others focus exclusively on AI companies in healthcare. Some only back repeat founders. Others specialize in early-stage companies led by women.

If your company doesn't fit the investor's thesis, they won't invest. It doesn't matter how good your pitch is. If they've decided they don't invest in consumer apps, and you're building a consumer app, they're going to pass.

Yet 73% of pitches go to investors who are thesis-mismatched with the founder's company.

That's not bad luck. It's bad targeting.

## Understanding VC Thesis

Before you pitch anyone, you need to understand what each investor actually invests in.

Most VCs publish this information. It's usually on their website or in their fund prospectus. But many founders don't read it.

A VC's thesis typically specifies:
- **Stage**: Seed, Series A, Series B, growth stage
- **Industry**: AI, FinTech, HealthTech, climate, etc.
- **Geography**: US only, Europe, Asia, global
- **Founder type**: First-time founders, repeat founders, technical founders, etc.
- **Market size**: Some VCs only invest if TAM is $10B+
- **Business model**: Some specialize in specific revenue models (B2B SaaS, marketplace, etc.)

A good investor thesis sounds like this:
"We invest in B2B SaaS companies in North America at the seed stage, founded by technical founders with experience in enterprise sales. We focus on companies in verticals where compliance is a competitive advantage."

If your company is a consumer app, founded by two non-technical co-founders, without compliance as a moat? That investor won't invest. No matter how good you are.

## How to Target Correctly

Here's the better approach:

**Step 1: Define Your Company Clearly**
Write a few sentences describing what you actually do:
- Stage: Are you raising a $500K seed, $2M seed, $8M Series A?
- Industry: What category does your company fit into?
- Geography: Where are you based? Where is your market?
- Founder type: What's your background? How many times have you founded?

**Step 2: Research Investor Theses**
For each VC on your list, find their actual thesis. Read their website. Look at their recent investments. What patterns do you see?

**Step 3: Score Fit**
Rate each investor on thesis fit:
- 10/10 = Perfect fit (they explicitly invest in companies like yours)
- 7/10 = Good fit (close to their focus area)
- 4/10 = Possible fit (they've done adjacent deals)
- 1/10 = Unlikely fit (very different thesis)

**Step 4: Pitch in Tiers**
- Tier 1 (10/10 fit investors): 5-10 investors
- Tier 2 (7/10 fit investors): 15-20 investors
- Tier 3 (4/10 fit investors): 30-40 investors

Start with Tier 1. Refine your pitch based on feedback. Then move to Tier 2.

Don't pitch Tier 3 unless you're not getting traction from Tier 1 and 2.

## Real Example

Let's say you're building an AI tool for financial advisors. You're raising a $1.5M seed. You're non-technical co-founders with enterprise sales experience. You're based in NYC but customers are global.

**Perfect-fit investors (10/10):**
- VCs with a thesis: "AI tools for financial services professionals"
- Examples: Spark Capital (they backed Betterment), Flyer Ventures (they focus on FinTech + AI)
- Count: 3-5 investors

**Good-fit investors (7/10):**
- VCs with broader FinTech thesis (not specific to AI)
- VCs with AI focus (not specific to FinTech)
- VCs that have backed founder teams like yours
- Count: 10-15 investors

**Possible-fit investors (4/10):**
- Generalist VCs that do seed rounds
- Count: 20-30 investors

A founder using this approach pitches 5-10 perfect-fit investors, gets strong feedback, refines the pitch, then expands. They close a round in 8 weeks instead of 6 months.

## Why This Matters

When you pitch a thesis-matched investor:
- They already understand your market
- They've followed the space
- They know who your competitors are
- They have a network that can help
- They're predisposed to like your category

This creates a feedback loop. Instead of explaining your entire market, you explain why you're the best team to win that market.

Thesis-matched investors also tend to make faster decisions. They've already done research on your market. They know the risk profile. They can move fast.

## Building Your Investor List the Right Way

Spend two weeks building a solid investor list instead of spending two days and pitching everyone.

1. Identify 5-10 "perfect fit" VCs (clear thesis match)
2. Get warm introductions to all of them
3. Pitch them first
4. Use their feedback to refine your story
5. Expand to tier 2 based on what you learn

This approach takes longer upfront but saves you months of wasted pitching.

The founders closing seed rounds in 3 weeks aren't better pitchers. They're just smarter about targeting. They found the investors whose thesis aligned with their company, and they pitched those investors first.

You can do the same. Start with thesis matching. You'll raise faster. For a more structured process, [start your Hockystick workspace](https://hockystick.app/sign-up) and keep each investor conversation tied to the right thesis, status, and next step.
    `,
  },
  "deal-room-security": {
    slug: "deal-room-security",
    title: "Why Your Pitch Deck Needs Bank-Grade Security",
    date: "March 2026",
    author: "Hockystick Team",
    readTime: "4 min read",
    category: "Security",
    excerpt: "Unencrypted pitch decks are a liability. Here's what founders should know about protecting their fundraising documents.",
    content: `
Your pitch deck contains sensitive information. Your financial projections. Your cap table. Your customer list. Your technology architecture.

If your pitch deck gets leaked to a competitor before you close your funding, you're in a dangerous position.

A competitor sees your growth rate. They copy your GTM strategy. They hire your target customers.

Worse, if your cap table leaks before you raise, existing shareholders panic about dilution. Employees see the valuation. Customers worry about your stability.

Pitch decks are some of the most sensitive documents a founder handles. Yet most founders email them around with zero security.

## The Problem: Email is Insecure

When you email a pitch deck, a few things happen:

1. **The file gets downloaded** — Investors download your deck to their laptop. Now it exists in multiple locations: your computer, Gmail, their laptop, their Downloads folder, their cloud backup.

2. **It gets forwarded** — An investor sends it to partners. That partner adds it to their deal evaluation system. Now 5-10 people have a copy.

3. **It lives in email forever** — Even after they pass, the email stays in their inbox. Anyone with access to their email (which is more people than you'd think) can access your deck.

4. **No tracking** — You have zero visibility. You don't know if they shared it. You don't know if a non-investor saw it.

5. **Reputational risk** — If your deck leaks publicly and you're still fundraising, it damages your momentum. Investors think: "This founder can't keep confidential information secure. How will they handle data?"

Unencrypted email is the problem.

## Bank-Grade Security: What It Actually Means

When we talk about "bank-grade security," we're talking about several specific technologies:

**End-to-End Encryption**: Your document is encrypted before it leaves your computer. Even the platform hosting it can't read it. Only you and the intended recipient can access it.

**Access Tracking**: You know exactly who viewed your document, when they viewed it, and for how long.

**Watermarking**: Every page includes the viewer's name and email. If the document leaks, you know exactly who shared it.

**Expiration**: You can set when a document expires. After that date, it's no longer viewable.

**Audit Logs**: A complete record of every action: who downloaded, who printed, who shared.

## How to Protect Your Pitch Deck

**Option 1: Use a dedicated platform**
Platforms like Hockystick, Box, and others are built specifically for secure document sharing. They handle encryption, tracking, and watermarking out of the box.

When you share your pitch deck through a secure platform:
- Investors can only view it online (can't download it)
- You see who viewed it and when
- Every page is watermarked
- You can revoke access instantly
- You get an audit log of all activity

This is now table stakes for institutional investors. If you ask an investor to access your deck through a secure platform, they expect it. It signals you're professional.

**Option 2: If you must use email**
- Password-protect the PDF
- Use a service like Tresorit or Virtru that adds encryption to email
- Include a confidentiality notice
- Only email to individuals, never to groups
- Don't include sensitive numbers in email body

This is better than nothing, but it's not as secure as a dedicated platform.

**What NOT to do:**
- Don't upload your pitch deck to Google Drive and share the link (it's not watermarked, you can't track access)
- Don't email unencrypted PDFs to multiple people at once
- Don't include your full cap table in your pitch deck
- Don't attach financial projections to emails

## Founder Best Practices

1. **Your core deck should be generic**
Your pitch deck should be compelling but not contain sensitive data. Keep proprietary metrics, customer lists, and detailed financial projections in separate documents for deep diligence only.

2. **Use a watermarked version for sharing**
When you share your pitch deck, every page should include the viewer's name and email. This isn't about being paranoid. It's about creating accountability.

3. **Share only with serious investors**
You don't need to share your deck with every investor you meet. Many investors will take a first meeting based on a mutual introduction. Only share the full deck with investors who've demonstrated serious interest.

4. **Revoke access after passing**
Once an investor passes, revoke their access to your deck. Yes, they already have a copy. But why leave it sitting there indefinitely?

5. **Use a dedicated platform for Series A and beyond**
By the time you're raising Series A, a dedicated secure platform is non-negotiable. It's expected.

## The Competitive Advantage

Founders who take document security seriously have an advantage. It demonstrates:
- Professionalism
- Strategic thinking
- Risk management
- Sophistication

Investors notice. They assume if you're careful about protecting your deck, you're also careful about protecting their capital. If your next round needs secure document sharing from day one, [create your Hockystick deal room](https://hockystick.app/sign-up).

Your pitch deck is sensitive information. Treat it that way.
    `,
  },
};

function BlogArticle() {
  const { slug } = Route.useParams();
  const post = POSTS_MAP[slug];

  if (!post) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-6 py-24">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-2">Article not found</h1>
            <p className="text-muted-foreground mb-6">
              The article you're looking for doesn't exist.
            </p>
            <Link to="/blog">
              <Button variant="outline">Back to blog</Button>
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const relatedPosts = Object.values(POSTS_MAP)
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => {
      if (a.category === post.category && b.category !== post.category) return -1;
      if (a.category !== post.category && b.category === post.category) return 1;
      return 0;
    })
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        {/* Article Header */}
        <article>
          <div className="mb-8">
            <Badge variant="secondary" className="mb-4">
              {post.category}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-tight mb-4">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{post.date}</span>
              <span>•</span>
              <span>{post.author}</span>
              <span>•</span>
              <span>{post.readTime}</span>
            </div>
          </div>

          {/* Article Content */}
          <div className="max-w-none mb-12">
            <ReactMarkdown
              components={{
                h2: ({ children }) => (
                  <h2 className="text-2xl font-semibold mt-10 mb-4 text-foreground">
                    {children}
                  </h2>
                ),
                p: ({ children }) => (
                  <p className="text-lg text-muted-foreground leading-relaxed mb-5">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-6 space-y-2 pl-6 text-muted-foreground">
                    {children}
                  </ul>
                ),
                li: ({ children }) => (
                  <li className="list-disc text-base leading-relaxed">
                    {children}
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    className="font-medium text-brand underline underline-offset-4 hover:text-brand/80"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {post.content.trim()}
            </ReactMarkdown>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-500/20 rounded-xl p-8 mb-12">
            <h2 className="text-2xl font-semibold mb-2">Ready to try Hockystick?</h2>
            <p className="text-muted-foreground mb-6">
              Start managing your fundraising with secure deal rooms and AI-powered insights.
            </p>
            <Link to="/sign-up" search={{ role: "founder" } as any}>
              <Button className="gap-2">
                Get started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Related Articles */}
          {relatedPosts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-6">Related articles</h3>
              <div className="space-y-3">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.slug}
                    to={`/blog/${relatedPost.slug}`}
                    className="block p-4 border border-border/60 rounded-lg hover:border-border transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-semibold group-hover:text-brand transition-colors">
                          {relatedPost.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {relatedPost.date}
                        </p>
                      </div>
                      <span className="text-brand group-hover:translate-x-0.5 transition-transform flex-shrink-0">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
