import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/waitlist")({
  head: () => ({
    meta: [
      { title: "Waitlist — Hockystick" },
      { name: "description", content: "Join the Hockystick waitlist." },
    ],
  }),
  component: Waitlist,
});

function Waitlist() {
  const [form, setForm] = useState({ fullName: "", email: "", role: "", company: "", problem: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("waitlist_entries").insert({
        full_name: form.fullName,
        email: form.email,
        role: form.role || null,
        company: form.company || null,
        problem: form.problem || null,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("You're on the list.");
    } catch (err) {
      toast.error((err as any).message || "Failed to join waitlist");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Dark hero */}
      <div className="bg-[#0a0a0b] py-20 px-6 text-center">
        <div className="inline-block px-3 py-1 rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10 mb-5">
          <span className="text-sm text-[#7C3AED] font-medium">Free during beta</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>
          Join the Hockystick waitlist.
        </h1>
        <p className="mt-4 text-lg text-gray-400 max-w-xl mx-auto">
          Be among the first to access the deal room where trust gets built.
        </p>
      </div>

      <main className="mx-auto max-w-xl px-6 py-16">
        {submitted ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "Syne, sans-serif" }}>You're on the list.</h2>
            <p className="text-muted-foreground">We'll be in touch. Keep an eye on your inbox.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-100 bg-white shadow-lg p-8">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full name</label>
              <Input name="fullName" value={form.fullName} onChange={set} required placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <Input type="email" name="email" value={form.email} onChange={set} required placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Role</label>
              <select name="role" value={form.role} onChange={set}
                className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background text-foreground text-sm">
                <option value="">Select your role</option>
                <option value="founder">Founder</option>
                <option value="investor">Investor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Company</label>
              <Input name="company" value={form.company} onChange={set} placeholder="Your company (optional)" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">What problem are you trying to solve?</label>
              <Textarea name="problem" value={form.problem} onChange={set}
                placeholder="Tell us about your challenge..." className="min-h-28" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg bg-[#7C3AED] text-white font-semibold text-sm hover:bg-[#6d28d9] transition-colors disabled:opacity-50">
              {loading ? "Joining..." : "Join the waitlist"}
            </button>
          </form>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
