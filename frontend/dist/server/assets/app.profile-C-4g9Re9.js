import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2, Upload, Globe, Users, Building2, Check, Plus, X, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { u as useAuth, s as supabase } from "./router-DOcN9fVX.js";
import { c as cn } from "./utils-H80jjgLf.js";
import "@tanstack/react-router";
import "@supabase/supabase-js";
import "clsx";
import "tailwind-merge";
const STAGES = ["Pre-idea", "Pre-seed", "Seed", "Series A", "Series B", "Growth", "Profitable"];
const MEMBER_TAGS = ["Founder", "Co-Founder", "Advisor", "Employee", "Board Member"];
const emptyForm = {
  company_name: "",
  sector: "",
  stage: "",
  country: "",
  funding_target: "",
  valuation: "",
  traction: "",
  revenue: "",
  team_size: "",
  description: "",
  website: "",
  problem: "",
  solution: "",
  business_model: "",
  use_of_funds: "",
  tagline: "",
  founded_year: "",
  previous_funding: "",
  current_investors: "",
  market_size: "",
  competitive_advantage: "",
  why_now: "",
  founder_name: "",
  founder_email: "",
  founder_linkedin: "",
  cofounder_name: "",
  cofounder_linkedin: "",
  key_metric: "",
  growth_rate: "",
  customer_count: ""
};
function fromStartup(s) {
  return {
    company_name: s.company_name ?? "",
    sector: s.sector ?? "",
    stage: s.stage ?? "",
    country: s.country ?? "",
    funding_target: s.funding_target ?? "",
    valuation: s.valuation ?? "",
    traction: s.traction ?? "",
    revenue: s.revenue ?? "",
    team_size: s.team_size?.toString() ?? "",
    description: s.description ?? "",
    website: s.website ?? "",
    problem: s.problem ?? "",
    solution: s.solution ?? "",
    business_model: s.business_model ?? "",
    use_of_funds: s.use_of_funds ?? "",
    tagline: s.tagline ?? "",
    founded_year: s.founded_year?.toString() ?? "",
    previous_funding: s.previous_funding ?? "",
    current_investors: s.current_investors ?? "",
    market_size: s.market_size ?? "",
    competitive_advantage: s.competitive_advantage ?? "",
    why_now: s.why_now ?? "",
    founder_name: s.founder_name ?? "",
    founder_email: s.founder_email ?? "",
    founder_linkedin: s.founder_linkedin ?? "",
    cofounder_name: s.cofounder_name ?? "",
    cofounder_linkedin: s.cofounder_linkedin ?? "",
    key_metric: s.key_metric ?? "",
    growth_rate: s.growth_rate ?? "",
    customer_count: s.customer_count ?? ""
  };
}
function Profile() {
  const {
    user
  } = useAuth();
  const queryClient = useQueryClient();
  const {
    data: startup,
    isLoading
  } = useQuery({
    queryKey: ["my-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("startups").select("*").eq("founder_id", user.id).limit(1).maybeSingle();
      return data;
    }
  });
  const [form, setForm] = useState(emptyForm);
  const [logoUrl, setLogoUrl] = useState(null);
  const [deckName, setDeckName] = useState(null);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [deckUploading, setDeckUploading] = useState(false);
  useEffect(() => {
    if (startup) {
      setForm(fromStartup(startup));
      setLogoUrl(startup.logo_url ?? null);
      if (startup.pitch_deck_url) {
        const parts = startup.pitch_deck_url.split("/");
        setDeckName(decodeURIComponent(parts[parts.length - 1] ?? "pitch-deck.pdf").replace(/^\d+-/, ""));
      }
    }
  }, [startup]);
  const field = (k) => (e) => setForm((f) => ({
    ...f,
    [k]: e.target.value
  }));
  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const payload = {
        company_name: form.company_name,
        sector: form.sector || null,
        stage: form.stage || null,
        country: form.country || null,
        funding_target: form.funding_target || null,
        valuation: form.valuation || null,
        traction: form.traction || null,
        revenue: form.revenue || null,
        team_size: form.team_size ? parseInt(form.team_size, 10) : null,
        description: form.description || null,
        website: form.website || null,
        problem: form.problem || null,
        solution: form.solution || null,
        business_model: form.business_model || null,
        use_of_funds: form.use_of_funds || null,
        tagline: form.tagline || null,
        founded_year: form.founded_year ? parseInt(form.founded_year, 10) : null,
        previous_funding: form.previous_funding || null,
        current_investors: form.current_investors || null,
        market_size: form.market_size || null,
        competitive_advantage: form.competitive_advantage || null,
        why_now: form.why_now || null,
        founder_name: form.founder_name || null,
        founder_email: form.founder_email || null,
        founder_linkedin: form.founder_linkedin || null,
        cofounder_name: form.cofounder_name || null,
        cofounder_linkedin: form.cofounder_linkedin || null,
        key_metric: form.key_metric || null,
        growth_rate: form.growth_rate || null,
        customer_count: form.customer_count || null
      };
      const {
        error
      } = await supabase.from("startups").upsert({
        ...payload,
        founder_id: user.id
      }, {
        onConflict: "founder_id"
      });
      if (error) throw error;
      toast.success("Profile saved");
      queryClient.invalidateQueries({
        queryKey: ["my-startup", user.id]
      });
      queryClient.invalidateQueries({
        queryKey: ["my-startup-overview"]
      });
    } catch (e) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };
  const handleLogoUpload = async (file) => {
    if (!user?.id) return;
    setLogoUploading(true);
    try {
      const path = `startups/${user.id}/logo`;
      const {
        error
      } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true
      });
      if (error) throw error;
      const {
        data
      } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      setLogoUrl(url);
      if (startup?.id) {
        await supabase.from("startups").update({
          logo_url: url
        }).eq("id", startup.id);
        queryClient.invalidateQueries({
          queryKey: ["my-startup", user.id]
        });
      }
      toast.success("Logo updated");
    } catch (e) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setLogoUploading(false);
    }
  };
  const handleDeckUpload = async (file) => {
    if (!user?.id) return;
    setDeckUploading(true);
    try {
      const path = `pitch-decks/${user.id}/${Date.now()}-${file.name}`;
      const {
        error
      } = await supabase.storage.from("documents").upload(path, file, {
        upsert: false
      });
      if (error) throw error;
      if (startup?.id) {
        await supabase.from("startups").update({
          pitch_deck_url: path
        }).eq("id", startup.id);
        queryClient.invalidateQueries({
          queryKey: ["my-startup", user.id]
        });
      }
      setDeckName(file.name);
      toast.success("Pitch deck uploaded");
    } catch (e) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setDeckUploading(false);
    }
  };
  const SaveBtn = ({
    full = false
  }) => /* @__PURE__ */ jsxs("button", { onClick: handleSave, disabled: saving, className: cn("inline-flex items-center gap-2 rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow disabled:opacity-60", full && "w-full justify-center"), children: [
    saving ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }),
    "Save changes"
  ] });
  const initials = form.company_name ? form.company_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  if (isLoading) {
    return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto space-y-4", children: [
      /* @__PURE__ */ jsx("div", { className: "h-8 w-64 rounded-lg bg-muted animate-pulse" }),
      /* @__PURE__ */ jsx("div", { className: "h-4 w-96 rounded bg-muted/60 animate-pulse" }),
      /* @__PURE__ */ jsx("div", { className: "h-64 rounded-2xl bg-muted/40 animate-pulse" })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: startup ? "Company Profile" : "Create your profile" }),
        /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: startup ? "Edit your startup details, team, and pitch." : "Set up your startup profile so investors know who you are." })
      ] }),
      /* @__PURE__ */ jsx(SaveBtn, {})
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
      /* @__PURE__ */ jsx("div", { className: "h-32 bg-gradient-mesh relative", children: /* @__PURE__ */ jsx("div", { className: "absolute inset-0 noise opacity-40" }) }),
      /* @__PURE__ */ jsx("div", { className: "px-6 pb-6 -mt-10", children: /* @__PURE__ */ jsxs("div", { className: "flex items-end gap-4", children: [
        /* @__PURE__ */ jsxs("label", { className: "relative cursor-pointer group shrink-0", children: [
          /* @__PURE__ */ jsx("div", { className: "grid h-20 w-20 place-items-center rounded-2xl bg-gradient-brand text-brand-foreground text-2xl font-semibold border-4 border-background shadow-elev overflow-hidden", children: logoUploading ? /* @__PURE__ */ jsx(Loader2, { className: "h-6 w-6 animate-spin text-brand-foreground" }) : logoUrl ? /* @__PURE__ */ jsx("img", { src: logoUrl, alt: "logo", className: "h-full w-full object-cover" }) : /* @__PURE__ */ jsx("span", { children: initials }) }),
          /* @__PURE__ */ jsx("div", { className: "absolute inset-0 rounded-2xl bg-black/40 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity", children: /* @__PURE__ */ jsx(Upload, { className: "h-5 w-5 text-white" }) }),
          /* @__PURE__ */ jsx("input", { type: "file", accept: "image/*", className: "sr-only", onChange: (e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0]) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "pb-1", children: [
          /* @__PURE__ */ jsx("div", { className: "text-xl font-semibold", children: form.company_name || "Your Company" }),
          /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: form.tagline || form.description || "Add a tagline below" })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-5 grid lg:grid-cols-3 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "lg:col-span-2 space-y-4", children: [
        /* @__PURE__ */ jsxs(FormSection, { title: "Company basics", children: [
          /* @__PURE__ */ jsx(Field, { label: "Company name *", value: form.company_name, onChange: field("company_name"), placeholder: "Atlas Robotics" }),
          /* @__PURE__ */ jsx(Field, { label: "Tagline", value: form.tagline, onChange: field("tagline"), placeholder: "One line that explains your company" }),
          /* @__PURE__ */ jsxs("div", { className: "grid sm:grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsx(Field, { label: "Website", value: form.website, onChange: field("website"), placeholder: "https://example.com" }),
            /* @__PURE__ */ jsx(Field, { label: "Founded year", value: form.founded_year, onChange: field("founded_year"), placeholder: "2022", type: "number" }),
            /* @__PURE__ */ jsx(Field, { label: "Country / HQ", value: form.country, onChange: field("country"), placeholder: "San Francisco, USA" }),
            /* @__PURE__ */ jsx(Field, { label: "Team size", value: form.team_size, onChange: field("team_size"), placeholder: "12", type: "number" }),
            /* @__PURE__ */ jsx(Field, { label: "Sector", value: form.sector, onChange: field("sector"), placeholder: "B2B SaaS, Fintech, AI..." }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Stage" }),
              /* @__PURE__ */ jsxs("select", { value: form.stage, onChange: field("stage"), className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50", children: [
                /* @__PURE__ */ jsx("option", { value: "", children: "Select stage" }),
                STAGES.map((s) => /* @__PURE__ */ jsx("option", { children: s }, s))
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(FormSection, { title: "Fundraising", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid sm:grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsx(Field, { label: "Funding target", value: form.funding_target, onChange: field("funding_target"), placeholder: "$5M" }),
            /* @__PURE__ */ jsx(Field, { label: "Pre-money valuation", value: form.valuation, onChange: field("valuation"), placeholder: "$20M" }),
            /* @__PURE__ */ jsx(Field, { label: "Previous funding raised", value: form.previous_funding, onChange: field("previous_funding"), placeholder: "$500K pre-seed" }),
            /* @__PURE__ */ jsx(Field, { label: "Current investors", value: form.current_investors, onChange: field("current_investors"), placeholder: "Y Combinator, Sequoia" })
          ] }),
          /* @__PURE__ */ jsx(TextArea, { label: "Use of funds", value: form.use_of_funds, onChange: field("use_of_funds"), placeholder: "40% engineering, 30% sales, 30% ops", rows: 2 })
        ] }),
        /* @__PURE__ */ jsxs(FormSection, { title: "Traction & metrics", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid sm:grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsx(Field, { label: "Revenue / ARR", value: form.revenue, onChange: field("revenue"), placeholder: "$1.2M ARR" }),
            /* @__PURE__ */ jsx(Field, { label: "Growth rate", value: form.growth_rate, onChange: field("growth_rate"), placeholder: "+15% MoM" }),
            /* @__PURE__ */ jsx(Field, { label: "Customer count", value: form.customer_count, onChange: field("customer_count"), placeholder: "500 paying customers" }),
            /* @__PURE__ */ jsx(Field, { label: "Key metric", value: form.key_metric, onChange: field("key_metric"), placeholder: "Your most important metric" })
          ] }),
          /* @__PURE__ */ jsx(TextArea, { label: "Traction highlights", value: form.traction, onChange: field("traction"), placeholder: "Key traction highlights...", rows: 3 })
        ] }),
        /* @__PURE__ */ jsxs(FormSection, { title: "Pitch content", children: [
          /* @__PURE__ */ jsx(TextArea, { label: "Problem", value: form.problem, onChange: field("problem"), placeholder: "What problem are you solving?", rows: 4 }),
          /* @__PURE__ */ jsx(TextArea, { label: "Solution", value: form.solution, onChange: field("solution"), placeholder: "How does your product solve it?", rows: 4 }),
          /* @__PURE__ */ jsx(TextArea, { label: "Business model", value: form.business_model, onChange: field("business_model"), placeholder: "How do you make money?", rows: 3 }),
          /* @__PURE__ */ jsx(Field, { label: "Market size", value: form.market_size, onChange: field("market_size"), placeholder: "$50B TAM, $5B SAM…" }),
          /* @__PURE__ */ jsx(TextArea, { label: "Competitive advantage", value: form.competitive_advantage, onChange: field("competitive_advantage"), placeholder: "What makes you hard to replicate?", rows: 3 }),
          /* @__PURE__ */ jsx(TextArea, { label: "Why now?", value: form.why_now, onChange: field("why_now"), placeholder: "What tailwind or market shift makes this the right time?", rows: 2 })
        ] }),
        /* @__PURE__ */ jsx(FormSection, { title: "Contact", children: /* @__PURE__ */ jsxs("div", { className: "grid sm:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsx(Field, { label: "Founder name", value: form.founder_name, onChange: field("founder_name"), placeholder: "Jane Smith" }),
          /* @__PURE__ */ jsx(Field, { label: "Founder email", value: form.founder_email, onChange: field("founder_email"), placeholder: "jane@startup.com", type: "email" }),
          /* @__PURE__ */ jsx(Field, { label: "Founder LinkedIn", value: form.founder_linkedin, onChange: field("founder_linkedin"), placeholder: "linkedin.com/in/janesmith" }),
          /* @__PURE__ */ jsx(Field, { label: "Co-founder name", value: form.cofounder_name, onChange: field("cofounder_name"), placeholder: "Alex Lee" }),
          /* @__PURE__ */ jsx(Field, { label: "Co-founder LinkedIn", value: form.cofounder_linkedin, onChange: field("cofounder_linkedin"), placeholder: "linkedin.com/in/alexlee" })
        ] }) }),
        /* @__PURE__ */ jsx("div", { className: "pb-2", children: /* @__PURE__ */ jsx(SaveBtn, { full: true }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-5 shadow-card", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold mb-3", children: "Pitch deck" }),
          deckName ? /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border/60 bg-accent/30 p-3", children: [
            /* @__PURE__ */ jsx("div", { className: "text-sm font-medium truncate", children: deckName }),
            /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-0.5 mb-2", children: "Uploaded" }),
            /* @__PURE__ */ jsxs("label", { className: "text-xs text-brand hover:underline cursor-pointer", children: [
              "Replace",
              /* @__PURE__ */ jsx("input", { type: "file", accept: ".pdf,.pptx,.key", className: "sr-only", onChange: (e) => e.target.files?.[0] && handleDeckUpload(e.target.files[0]) })
            ] })
          ] }) : /* @__PURE__ */ jsxs("label", { className: "rounded-xl border-2 border-dashed border-border/80 bg-card p-5 text-center cursor-pointer hover:border-brand/50 hover:bg-accent/20 transition-colors block", children: [
            deckUploading ? /* @__PURE__ */ jsx(Loader2, { className: "h-5 w-5 text-muted-foreground mx-auto animate-spin" }) : /* @__PURE__ */ jsx(Upload, { className: "h-5 w-5 text-muted-foreground mx-auto" }),
            /* @__PURE__ */ jsx("div", { className: "text-sm font-medium mt-2", children: deckUploading ? "Uploading…" : "Upload pitch deck" }),
            /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-0.5", children: "PDF, PPTX or Keynote" }),
            /* @__PURE__ */ jsx("input", { type: "file", accept: ".pdf,.pptx,.key", className: "sr-only", onChange: (e) => e.target.files?.[0] && handleDeckUpload(e.target.files[0]) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-5 shadow-card", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold mb-3", children: "Overview" }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2.5", children: [
            [[Globe, "Stage", form.stage], [Users, "Team", form.team_size], [Building2, "Sector", form.sector]].map(([Icon, label, val]) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5 text-sm", children: [
              /* @__PURE__ */ jsx(Icon, { className: "h-4 w-4 text-muted-foreground shrink-0" }),
              /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-xs", children: label }),
              /* @__PURE__ */ jsx("span", { className: "ml-auto font-medium text-sm", children: val || "—" })
            ] }, label)),
            form.growth_rate && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5 text-sm", children: [
              /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-xs", children: "Growth" }),
              /* @__PURE__ */ jsx("span", { className: "ml-auto font-medium text-sm text-success", children: form.growth_rate })
            ] }),
            form.customer_count && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5 text-sm", children: [
              /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-xs", children: "Customers" }),
              /* @__PURE__ */ jsx("span", { className: "ml-auto font-medium text-sm", children: form.customer_count })
            ] })
          ] })
        ] })
      ] })
    ] }),
    startup?.id && /* @__PURE__ */ jsx(TeamMembersSection, { startupId: startup.id }),
    !startup?.id && !isLoading && /* @__PURE__ */ jsx("div", { className: "mt-6 rounded-xl border border-dashed border-border/60 bg-card p-6 text-center text-sm text-muted-foreground", children: "Save your profile first to add team members." })
  ] });
}
function FormSection({
  title,
  children
}) {
  return /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-5 shadow-card", children: [
    /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold mb-4", children: title }),
    /* @__PURE__ */ jsx("div", { className: "space-y-3", children })
  ] });
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}) {
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: label }),
    /* @__PURE__ */ jsx("input", { type, value, onChange, placeholder, className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
  ] });
}
function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3
}) {
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: label }),
    /* @__PURE__ */ jsx("textarea", { value, onChange, placeholder, rows, className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none" })
  ] });
}
function TeamMembersSection({
  startupId
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const blankMember = {
    full_name: "",
    role: "",
    email: "",
    linkedin_url: "",
    bio: "",
    tag: "Employee",
    photo_url: ""
  };
  const [mf, setMf] = useState(blankMember);
  const {
    data: members = [],
    isLoading
  } = useQuery({
    queryKey: ["team-members", startupId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("team_members").select("*").eq("startup_id", startupId).order("display_order", {
        ascending: true
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  const openEdit = (m) => {
    setMf({
      full_name: m.full_name,
      role: m.role,
      email: m.email ?? "",
      linkedin_url: m.linkedin_url ?? "",
      bio: m.bio ?? "",
      tag: m.tag ?? "Employee",
      photo_url: m.photo_url ?? ""
    });
    setEditingId(m.id);
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setMf(blankMember);
  };
  const setField = (k) => (e) => setMf((f) => ({
    ...f,
    [k]: e.target.value
  }));
  const handlePhotoUpload = async (file) => {
    setPhotoUploading(true);
    try {
      const slot = editingId ?? `new-${Date.now()}`;
      const path = `team/${startupId}/${slot}`;
      const {
        error
      } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true
      });
      if (error) throw error;
      const {
        data
      } = supabase.storage.from("avatars").getPublicUrl(path);
      setMf((f) => ({
        ...f,
        photo_url: data.publicUrl
      }));
    } catch {
      toast.error("Photo upload failed");
    } finally {
      setPhotoUploading(false);
    }
  };
  const handleSubmit = async () => {
    if (!mf.full_name.trim() || !mf.role.trim()) {
      toast.error("Name and role are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        full_name: mf.full_name,
        role: mf.role,
        email: mf.email || null,
        linkedin_url: mf.linkedin_url || null,
        bio: mf.bio || null,
        tag: mf.tag || null,
        photo_url: mf.photo_url || null
      };
      if (editingId) {
        const {
          error
        } = await supabase.from("team_members").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Team member updated");
      } else {
        const {
          error
        } = await supabase.from("team_members").insert({
          ...payload,
          startup_id: startupId,
          display_order: members.length
        });
        if (error) throw error;
        toast.success("Team member added");
      }
      queryClient.invalidateQueries({
        queryKey: ["team-members", startupId]
      });
      closeForm();
    } catch (e) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };
  const handleDelete = async (id) => {
    if (!confirm("Remove this team member?")) return;
    setDeletingId(id);
    try {
      const {
        error
      } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
      toast.success("Team member removed");
      queryClient.invalidateQueries({
        queryKey: ["team-members", startupId]
      });
    } catch (e) {
      toast.error(e.message ?? "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };
  const tagColor = {
    Founder: "bg-violet/10 text-violet",
    "Co-Founder": "bg-violet/10 text-violet",
    Advisor: "bg-warning/10 text-warning",
    Employee: "bg-brand/10 text-brand",
    "Board Member": "bg-success/10 text-success"
  };
  return /* @__PURE__ */ jsxs("div", { className: "mt-8", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold tracking-tight", children: "Team members" }),
      /* @__PURE__ */ jsxs("button", { onClick: () => {
        closeForm();
        setShowForm((v) => !v);
      }, className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent", children: [
        /* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" }),
        " Add member"
      ] })
    ] }),
    showForm && /* @__PURE__ */ jsxs("div", { className: "mb-5 rounded-xl border border-brand/30 bg-card p-5 shadow-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: editingId ? "Edit team member" : "New team member" }),
        /* @__PURE__ */ jsx("button", { onClick: closeForm, className: "text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxs("label", { className: "relative cursor-pointer", children: [
            /* @__PURE__ */ jsx("div", { className: "grid h-14 w-14 place-items-center rounded-full bg-accent border border-border/60 overflow-hidden text-sm font-semibold text-muted-foreground shrink-0", children: photoUploading ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : mf.photo_url ? /* @__PURE__ */ jsx("img", { src: mf.photo_url, alt: "", className: "h-full w-full object-cover" }) : mf.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?" }),
            /* @__PURE__ */ jsx("input", { type: "file", accept: "image/*", className: "sr-only", onChange: (e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0]) })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: "Click avatar to upload photo" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid sm:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Full name *" }),
            /* @__PURE__ */ jsx("input", { value: mf.full_name, onChange: setField("full_name"), placeholder: "Jane Smith", className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Role / title *" }),
            /* @__PURE__ */ jsx("input", { value: mf.role, onChange: setField("role"), placeholder: "CTO", className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Tag" }),
            /* @__PURE__ */ jsx("select", { value: mf.tag, onChange: setField("tag"), className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50", children: MEMBER_TAGS.map((t) => /* @__PURE__ */ jsx("option", { children: t }, t)) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Email" }),
            /* @__PURE__ */ jsx("input", { value: mf.email, onChange: setField("email"), type: "email", placeholder: "jane@company.com", className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "sm:col-span-2", children: [
            /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "LinkedIn URL" }),
            /* @__PURE__ */ jsx("input", { value: mf.linkedin_url, onChange: setField("linkedin_url"), placeholder: "https://linkedin.com/in/janesmith", className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "sm:col-span-2", children: [
            /* @__PURE__ */ jsxs("label", { className: "text-xs text-muted-foreground flex items-center justify-between", children: [
              "Bio ",
              /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground/60", children: [
                mf.bio.length,
                "/200"
              ] })
            ] }),
            /* @__PURE__ */ jsx("textarea", { value: mf.bio, onChange: (e) => {
              if (e.target.value.length <= 200) setField("bio")(e);
            }, placeholder: "Brief background and expertise", rows: 2, className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2 pt-1", children: [
          /* @__PURE__ */ jsx("button", { onClick: closeForm, className: "rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: "Cancel" }),
          /* @__PURE__ */ jsxs("button", { onClick: handleSubmit, disabled: submitting, className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow disabled:opacity-60", children: [
            submitting ? /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5" }),
            editingId ? "Save changes" : "Add member"
          ] })
        ] })
      ] })
    ] }),
    isLoading ? /* @__PURE__ */ jsx("div", { className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-3", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsx("div", { className: "rounded-xl border border-border/60 bg-card p-4 h-24 animate-pulse" }, i)) }) : members.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-dashed border-border/60 bg-card p-8 text-center", children: [
      /* @__PURE__ */ jsx(Users, { className: "h-8 w-8 text-muted-foreground/40 mx-auto mb-2" }),
      /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: "No team members yet" }),
      /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-1", children: "Add your co-founders, advisors and key hires." })
    ] }) : /* @__PURE__ */ jsx("div", { className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-3", children: members.map((m) => {
      const inits = m.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
      return /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-4 shadow-card", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "grid h-10 w-10 place-items-center rounded-full bg-accent border border-border/60 overflow-hidden text-xs font-semibold shrink-0", children: m.photo_url ? /* @__PURE__ */ jsx("img", { src: m.photo_url, alt: m.full_name, className: "h-full w-full object-cover" }) : inits }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold truncate", children: m.full_name }),
            /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground truncate", children: m.role }),
            m.tag && /* @__PURE__ */ jsx("span", { className: cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block", tagColor[m.tag] ?? "bg-muted text-muted-foreground"), children: m.tag })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-1 shrink-0", children: [
            /* @__PURE__ */ jsx("button", { onClick: () => openEdit(m), className: "grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", children: /* @__PURE__ */ jsx(Pencil, { className: "h-3.5 w-3.5" }) }),
            /* @__PURE__ */ jsx("button", { onClick: () => handleDelete(m.id), disabled: deletingId === m.id, className: "grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40", children: deletingId === m.id ? /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }) })
          ] })
        ] }),
        m.bio && /* @__PURE__ */ jsx("div", { className: "mt-2 text-xs text-muted-foreground line-clamp-2", children: m.bio })
      ] }, m.id);
    }) })
  ] });
}
export {
  Profile as component
};
