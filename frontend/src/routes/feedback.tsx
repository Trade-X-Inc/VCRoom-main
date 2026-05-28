import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
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
      { name: "description", content: "Send us your feedback to help improve Hockystick." },
    ],
  }),
  component: Feedback,
});

function Feedback() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    type: "general",
    rating: 0,
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRatingClick = (value: number) => {
    setFormData({ ...formData, rating: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("feedback").insert({
        name: formData.name || null,
        email: formData.email || null,
        type: formData.type,
        rating: formData.rating || null,
        message: formData.message,
      });

      if (error) throw error;

      setSubmitted(true);
      setFormData({ name: "", email: "", type: "general", rating: 0, message: "" });
      toast.success("Thank you for your feedback!");
    } catch (err) {
      toast.error((err as any).message || "Failed to send feedback");
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
            <h1 className="text-3xl md:text-4xl font-semibold mb-4">Thank you!</h1>
            <p className="text-lg text-muted-foreground">
              We appreciate your feedback. It helps us build a better product.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-12">
              <h1 className="text-3xl md:text-4xl font-semibold mb-4">Send us your feedback</h1>
              <p className="text-lg text-muted-foreground">
                Help us improve Hockystick by sharing your thoughts.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border/60 rounded-xl p-8">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your name (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Feedback type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background text-foreground"
                >
                  <option value="general">General</option>
                  <option value="bug">Bug report</option>
                  <option value="feature">Feature request</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleRatingClick(value)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          value <= formData.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <Textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder="Tell us what you think..."
                  className="min-h-32"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Sending..." : "Send feedback"}
              </Button>
            </form>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
