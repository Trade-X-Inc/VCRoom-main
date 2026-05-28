import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Link } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/app/directory")({
  head: () => ({
    meta: [{ title: "Directory — Hockystick" }],
  }),
  beforeLoad: async ({ context }) => {
    if (!context.user?.id) {
      throw new Error("Unauthorized");
    }
  },
  component: Directory,
});

function Directory() {
  const { user } = useAuth();
  const [stageFilter, setStageFilter] = useState<string>("");
  const [sectorFilter, setSectorFilter] = useState<string>("");

  if (!user?.id) {
    return <div>Loading...</div>;
  }

  // Query: Get startups from founders I'm connected with via deal rooms
  const { data: startups } = useQuery({
    queryKey: ["directory-startups", user.id, stageFilter, sectorFilter],
    enabled: !!user.id,
    queryFn: async () => {
      let query = supabase
        .from("startups")
        .select("id, company_name, stage, sector, description, website")
        .in(
          "founder_id",
          supabase
            .from("deal_rooms")
            .select("startup_id")
            .in(
              "id",
              supabase
                .from("deal_room_members")
                .select("deal_room_id")
                .eq("user_id", user.id)
            )
        );

      if (stageFilter) {
        query = query.eq("stage", stageFilter);
      }
      if (sectorFilter) {
        query = query.eq("sector", sectorFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Query: Get investors from deal rooms I'm in
  const { data: investors } = useQuery({
    queryKey: ["directory-investors", user.id],
    enabled: !!user.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investor_profiles")
        .select(
          `
        id, user_id, fund_name, sectors, stages, check_size,
        users!inner(full_name)
      `
        )
        .in(
          "user_id",
          supabase
            .from("deal_room_members")
            .select("user_id")
            .in(
              "deal_room_id",
              supabase
                .from("deal_room_members")
                .select("deal_room_id")
                .eq("user_id", user.id)
            )
        );

      if (error) throw error;
      return data ?? [];
    },
  });

  const stages = ["Seed", "Series A", "Series B", "Series C", "Growth"];
  const sectors = ["AI/ML", "FinTech", "HealthTech", "ClimateeTech", "SaaS"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-2">Directory</h1>
        <p className="text-muted-foreground">
          Connect with founders and investors in your deal rooms.
        </p>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse"></div>
          <p className="text-sm text-purple-200">
            <span className="font-semibold">Stage 2:</span> Public Founder
            Directory launching with warm intros and achievement wall
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="startups" className="space-y-6">
        <TabsList>
          <TabsTrigger value="startups">Startups</TabsTrigger>
          <TabsTrigger value="investors">Investors</TabsTrigger>
        </TabsList>

        {/* Startups Tab */}
        <TabsContent value="startups" className="space-y-6">
          {/* Filters */}
          <div className="flex gap-3">
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All stages</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All sectors</SelectItem>
                {sectors.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grid */}
          {startups && startups.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {startups.map((startup: any) => (
                <div
                  key={startup.id}
                  className="bg-card border border-border/60 rounded-xl p-6 hover:border-border transition-colors"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                      {startup.company_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{startup.company_name}</h3>
                      {startup.stage && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {startup.stage}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {startup.sector && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {startup.sector}
                    </p>
                  )}

                  {startup.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {startup.description}
                    </p>
                  )}

                  {startup.website && (
                    <a
                      href={startup.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      View website →
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No startups yet in your network.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Investors Tab */}
        <TabsContent value="investors" className="space-y-6">
          {investors && investors.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {investors.map((investor: any) => (
                <div
                  key={investor.id}
                  className="bg-card border border-border/60 rounded-xl p-6"
                >
                  <h3 className="font-semibold mb-1">
                    {(investor.users as any)?.full_name || "Investor"}
                  </h3>
                  {investor.fund_name && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {investor.fund_name}
                    </p>
                  )}

                  <div className="space-y-2 text-sm">
                    {investor.sectors && (
                      <div>
                        <span className="text-xs text-muted-foreground">
                          Sectors:
                        </span>
                        <p className="text-foreground">
                          {Array.isArray(investor.sectors)
                            ? investor.sectors.join(", ")
                            : investor.sectors}
                        </p>
                      </div>
                    )}

                    {investor.check_size && (
                      <div>
                        <span className="text-xs text-muted-foreground">
                          Check size:
                        </span>
                        <p className="text-foreground">${investor.check_size}k</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No investors yet in your network.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Coming Soon Section */}
      <div className="mt-12 border-t border-border/60 pt-12">
        <div className="bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-purple-500/20 rounded-xl p-12 text-center">
          <h2 className="text-2xl font-semibold mb-2">
            Stage 2: Public Founder Directory
          </h2>
          <p className="text-muted-foreground mb-6">
            Warm intros · Achievement wall · Credibility scores
          </p>
          <p className="text-sm text-purple-300 font-medium">
            Launching Q3 2026
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link to="/waitlist">
            <Button variant="outline" className="gap-2">
              Join the waitlist <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
