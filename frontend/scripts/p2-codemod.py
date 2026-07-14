#!/usr/bin/env python3
"""P2 token-purity codemod. Deterministic string swaps only — anything
ambiguous is left for the hand pass. Usage: p2-codemod.py <file> [...]"""
import re
import sys

# ── className context ────────────────────────────────────────────────────────
CLASS_RULES = [
    # surfaces
    (r"bg-\[#0A0A0B\]", "bg-background"),
    (r"bg-\[#111114\]", "bg-card"),
    (r"bg-\[#18181C\]", "bg-accent"),
    # purple → gradient / tokens (wash variants BEFORE plain)
    (r"bg-purple-600/(\d+)", r"bg-accent"),
    (r"bg-purple-500/(\d+)", r"bg-accent"),
    (r"bg-purple-600 hover:bg-purple-700", "hs-gradient"),
    (r"bg-purple-600", "hs-gradient"),
    (r"bg-purple-700", "hs-gradient"),
    (r"hover:bg-purple-700", "hover:opacity-90"),
    (r"hover:bg-purple-500", "hover:opacity-90"),
    (r"text-purple-300", "text-brand"),
    (r"text-purple-400", "text-brand"),
    (r"text-purple-600", "text-brand"),
    (r"hover:text-purple-\d+", "hover:opacity-80"),
    (r"border-purple-[456]00/(\d+)", "border-border"),
    (r"border-purple-[456]00", "border-brand"),
    (r"ring-purple-600", "ring-brand"),
    (r"bg-brand/(\d+)", "bg-accent"),
    (r"hover:bg-brand\b", "hover:opacity-90"),
    (r"bg-brand\b", "hs-gradient"),
    # white-alpha utilities
    (r"border-white/\d+", "border-border"),
    (r"divide-white/\d+", "divide-border"),
    (r"bg-white/\d+", "bg-accent"),
    (r"hover:bg-white/\d+", "hover:bg-accent"),
    (r"text-white/([4-9]\d)", "text-muted-foreground"),
    (r"text-white/([1-3]\d|\d)\b", "text-faint"),
]

# ── inline-style context (property-aware) ────────────────────────────────────
STYLE_RULES = [
    # dark surfaces
    (r'"#0A0A0B"', '"var(--background)"'),
    (r'"#111114"', '"var(--card)"'),
    (r'"#18181C"', '"var(--accent)"'),
    # white-alpha, property-aware
    (r'(background|backgroundColor):\s*"rgba\(255,\s*255,\s*255,\s*0\.0[2-9]\d?\)"',
     r'\1: "var(--accent)"'),
    (r'(background|backgroundColor):\s*"rgba\(255,\s*255,\s*255,\s*0\.1\d?\)"',
     r'\1: "var(--accent)"'),
    (r'border:\s*"1px (solid|dashed) rgba\(255,\s*255,\s*255,\s*0\.[012]\d?\)"',
     r'border: "1px \1 var(--border)"'),
    (r'borderColor:\s*"rgba\(255,\s*255,\s*255,\s*0\.[012]\d?\)"',
     'borderColor: "var(--border)"'),
    (r'(borderTop|borderBottom|borderLeft|borderRight):\s*"1px solid rgba\(255,\s*255,\s*255,\s*0\.[012]\d?\)"',
     r'\1: "1px solid var(--border)"'),
    (r'color:\s*"rgba\(255,\s*255,\s*255,\s*0\.[4-9]\d?\)"',
     'color: "var(--muted-foreground)"'),
    (r'color:\s*"rgba\(255,\s*255,\s*255,\s*0\.[0-3]\d?\)"',
     'color: "var(--faint)"'),
    # flat purple
    (r'(background|backgroundColor):\s*"#7C3AED"', r'\1: "var(--gradient-brand)"'),
    (r'color:\s*"#7C3AED"', 'color: "var(--brand)"'),
    (r'borderColor:\s*"#7C3AED"', 'borderColor: "var(--brand)"'),
    (r'stroke:\s*"#7C3AED"', 'stroke: "var(--brand)"'),
    (r'fill:\s*"#7C3AED"', 'fill: "var(--brand)"'),
]

COLORED_BG = re.compile(
    r"hs-gradient|bg-(purple|green|red|amber|blue|emerald|orange|rose|yellow|brand|gradient)"
)


def fix_text_white(m: "re.Match[str]") -> str:
    """text-white → text-foreground, unless the same className has a colored bg."""
    cls = m.group(0)
    if COLORED_BG.search(cls):
        return cls
    return re.sub(r"(?<![-/\w])text-white(?![-/\w])", "text-foreground", cls)


def process(path: str) -> int:
    src = open(path).read()
    out = src
    for pat, rep in CLASS_RULES:
        out = re.sub(pat, rep, out)
    for pat, rep in STYLE_RULES:
        out = re.sub(pat, rep, out)
    # text-white with colored-bg guard, per className attribute
    out = re.sub(r'className=(?:"[^"]*"|\{`[^`]*`\}|\{"[^"]*"\})', fix_text_white, out)
    if out != src:
        open(path, "w").write(out)
        return 1
    return 0


if __name__ == "__main__":
    changed = sum(process(p) for p in sys.argv[1:])
    print(f"changed {changed}/{len(sys.argv) - 1} files")


# ── pass 2: context-aware value replacement inside ternaries/templates ───────
WHITE_RE = re.compile(r'"rgba\(255,\s*255,\s*255,\s*(0?\.\d+)\)"')
PURPLE_RE = re.compile(r'"#7C3AED"')
GRAD_LITERAL_RE = re.compile(r'"linear-gradient\([^"]*#7C3AED[^"]*\)"')


def ctx_for(line: str, pos: int) -> str:
    win = line[max(0, pos - 60):pos].lower()
    if "border" in win.rsplit("background", 1)[-1]:
        return "border"
    if "background" in win:
        return "background"
    if "color" in win or "stroke" in win or "fill" in win:
        return "color"
    return "unknown"


def pass2(path: str) -> int:
    lines = open(path).read().split("\n")
    changed = 0
    for i, line in enumerate(lines):
        out = line

        def white_sub(m):
            alpha = float(m.group(1))
            c = ctx_for(out, m.start())
            if c == "border":
                return '"var(--border)"'
            if c == "background":
                return '"var(--accent)"'
            if c == "color":
                return '"var(--muted-foreground)"' if alpha >= 0.4 else '"var(--faint)"'
            # unknown: alpha decides — washes are surfaces, text is text
            return '"var(--accent)"' if alpha <= 0.15 else (
                '"var(--muted-foreground)"' if alpha >= 0.4 else '"var(--faint)"')

        def purple_sub(m):
            c = ctx_for(out, m.start())
            return '"var(--gradient-brand)"' if c == "background" else '"var(--brand)"'

        out = GRAD_LITERAL_RE.sub('"var(--gradient-brand)"', out)
        out = WHITE_RE.sub(white_sub, out)
        out = PURPLE_RE.sub(purple_sub, out)
        # template-literal borders: `1px solid ${cond ? "X" : "Y"}` values already
        # handled above since the quoted values match the same regexes.
        if out != line:
            lines[i] = out
            changed += 1
    if changed:
        open(path, "w").write("\n".join(lines))
    return changed


if len(sys.argv) > 1 and sys.argv[0].endswith("p2-codemod.py"):
    pass  # main above already ran
