import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/waitlist")({
  head: () => ({
    meta: [
      { title: "Waitlist — Hockystick" },
      { name: "description", content: "Join the Hockystick waitlist and be among the first to access our platform." },
    ],
  }),
  component: Waitlist,
});

function Waitlist() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "",
    company: "",
    problem: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("waitlist_entries").insert({
        full_name: formData.fullName,
        email: formData.email,
        role: formData.role || null,
        company: formData.company || null,
        problem: formData.problem || null,
      });

      if (error) throw error;

      setSubmitted(true);
      setFormData({ fullName: "", email: "", role: "", company: "", problem: "" });
      toast.success("You're on the list. We'll be in touch.");
    } catch (err) {
      toast.error((err as any).message || "Failed to join waitlist");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-24 md:py-32">
        {submitted ? (
          <div className="text-center">
            <div className="text-5xl mb-4">✓</div>
            <h1 className="text-3xl md:text-4xl font-semibold mb-4">You're on the list</h1>
            <p className="text-lg text-muted-foreground">
              We'll be in touch soon. Keep an eye on your inbox for updates.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-12">
              <h1 className="text-3xl md:text-4xl font-semibold mb-4">Join the waitlist</h1>
              <p className="text-lg text-muted-foreground">
                Be among the first to experience the operating system for venture capital.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border/60 rounded-xl p-8">
              <div>
                <label className="block text-sm font-medium mb-2">Full name</label>
                <Input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background text-foreground"
                >
                  <option value="">Select your role</option>
                  <option value="founder">Founder</option>
                  <option value="investor">Investor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Company name</label>
                <Input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Your company (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">What problem are you trying to solve?</label>
                <Textarea
                  name="problem"
                  value={formData.problem}
                  onChange={handleChange}
                  placeholder="Tell us about your challenge..."
                  className="min-h-32"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Joining..." : "Join the waitlist"}
              </Button>
            </form>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
