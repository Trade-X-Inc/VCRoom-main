import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Star } from "lucide-react";

export const Route = createFileRoute("/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback — Hockystick" },
      { name: "description", content: "Help us improve Hockystick." },
    ],
  }),
  component: Feedback,
});

function Feedback() {
  const [form, setForm] = useState({ name: "", email: "", type: "general", rating: 0, message: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("feedback").insert({
        name: form.name || null,
        email: form.email || null,
        type: form.type,
        rating: form.rating || null,
        message: form.message,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Thank you for your feedback.");
    } catch (err) {
      toast.error((err as any).message || "Failed to send feedback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <div className="bg-[#0a0a0b] py-16 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>
          Share your feedback.
        </h1>
        <p className="mt-3 text-gray-400 max-w-lg mx-auto">
          Help us build a better product. We read every response personally.
        </p>
      </div>

      <main className="mx-auto max-w-xl px-6 py-16">
        {submitted ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "Syne, sans-serif" }}>Thank you.</h2>
            <p className="text-muted-foreground">We appreciate your feedback and will review it soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 border border-[rgba(0,0,0,0.08)] bg-white p-8">
            <div>
              <label className="block text-sm font-medium mb-1.5">Name</label>
              <Input name="name" value={form.name} onChange={set} placeholder="Your name (optional)" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <Input type="email" name="email" value={form.email} onChange={set} placeholder="your@email.com (optional)" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Feedback type</label>
              <select name="type" value={form.type} onChange={set}
                className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background text-foreground text-sm">
                <option value="general">General</option>
                <option value="bug">Bug report</option>
                <option value="feature">Feature request</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Rating</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} type="button" onClick={() => setForm((f) => ({ ...f, rating: v }))}
                    className="transition-transform hover:scale-110">
                    <Star className={`h-7 w-7 transition-colors ${v <= form.rating ? "fill-brand text-brand" : "text-gray-300"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Message</label>
              <Textarea name="message" value={form.message} onChange={set} required
                placeholder="Tell us what you think..." className="min-h-28" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg hs-gradient text-foreground font-semibold text-sm hover:bg-[#6d28d9] transition-colors disabled:opacity-50">
              {loading ? "Sending..." : "Send feedback"}
            </button>
          </form>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
