import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCelebration } from "@/hooks/useCelebration";
import CelebrationOverlay from "@/components/CelebrationOverlay";

interface ScoutDashboardProps {
  onLogout: () => void;
}

interface ScoutingEntry {
  id: string;
  teamNumber: string;
  matchNumber: string;
  scouterName: string;
  autoArtifactsScored: string;
  autoPatternAlignment: string;
  autoLaunchLine: string;
  autoLeave: string;
  autoConsistency: string;
  teleopIntakeMethod: string;
  teleopBallCapacity: string;
  teleopShootingAccuracy: string;
  teleopGateInteraction: string;
  teleopOverflowManagement: string;
  teleopCycleSpeed: string;
  teleopArtifactClassification: string;
  endgameParking: string;
  endgameAllianceAssist: string;
  penalties: string[];
  specialFeatures: string;
  goodMatch: string;
}

interface TeamAssignment {
  scout_name: string;
  team_number: string;
  team_name: string;
  qual_matches: string[];
}

const scoreEntry = (entry: ScoutingEntry): number => {
  let score = 0;
  const autoArtifacts: Record<string, number> = { "0": 0, "1-2": 5, "3-4": 10, "5+": 15 };
  score += autoArtifacts[entry.autoArtifactsScored] || 0;
  const autoPattern: Record<string, number> = { "None": 0, "1 Pattern": 5, "2 Patterns": 10, "3+ Patterns": 15 };
  score += autoPattern[entry.autoPatternAlignment] || 0;
  if (entry.autoLaunchLine === "Yes") score += 5;
  if (entry.autoLeave === "Yes") score += 3;
  const autoConsistency: Record<string, number> = { "Very Consistent": 10, "Mostly Consistent": 6, "Inconsistent": 2, "No Auto": 0 };
  score += autoConsistency[entry.autoConsistency] || 0;
  const shootingAcc: Record<string, number> = { "Very Accurate": 10, "Somewhat Accurate": 6, "Inaccurate": 2, "No Shooting": 0 };
  score += shootingAcc[entry.teleopShootingAccuracy] || 0;
  const gateInteraction: Record<string, number> = { "Opened Reliably": 10, "Sometimes": 5, "Tried But Failed": 1, "Did Not Attempt": 0 };
  score += gateInteraction[entry.teleopGateInteraction] || 0;
  const overflow: Record<string, number> = { "Excellent": 8, "Good": 5, "Poor": 2, "Did Not Collect": 0 };
  score += overflow[entry.teleopOverflowManagement] || 0;
  const cycleSpeed: Record<string, number> = { "Very Fast": 10, "Average": 6, "Slow": 3, "Minimal Cycling": 0 };
  score += cycleSpeed[entry.teleopCycleSpeed] || 0;
  const classification: Record<string, number> = { "Always": 8, "Mostly": 5, "Rarely": 2, "No Classification": 0 };
  score += classification[entry.teleopArtifactClassification] || 0;
  const ballCap: Record<string, number> = { "1": 2, "2": 5, "3": 8 };
  score += ballCap[entry.teleopBallCapacity] || 0;
  const parking: Record<string, number> = { "Yes – Full Park": 10, "Partial": 5, "No": 0 };
  score += parking[entry.endgameParking] || 0;
  const assist: Record<string, number> = { "Yes": 8, "Attempted": 4, "No": 0 };
  score += assist[entry.endgameAllianceAssist] || 0;
  const penalties = entry.penalties || [];
  const penaltyCount = penalties.filter((p) => p !== "None observed").length;
  score -= penaltyCount * 5;
  return score;
};

const ScoutDashboard = ({ onLogout }: ScoutDashboardProps) => {
  const { celebrating } = useCelebration();
  const [entries, setEntries] = useState<ScoutingEntry[]>([]);
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "livestream">("dashboard");

  const fetchData = async () => {
    setLoading(true);
    const [{ data: rawEntries }, { data: assignmentsData }] = await Promise.all([
      supabase.from("scouting_entries").select("*").order("timestamp", { ascending: true }),
      supabase.from("team_assignments").select("scout_name, team_number, team_name, qual_matches"),
    ]);
    if (rawEntries) {
      setEntries(rawEntries.map((row) => ({
        id: row.id,
        teamNumber: row.team_number,
        matchNumber: row.match_number || "",
        scouterName: row.scouter_name,
        autoArtifactsScored: row.auto_artifacts_scored || "",
        autoPatternAlignment: row.auto_pattern_alignment || "",
        autoLaunchLine: row.auto_launch_line || "",
        autoLeave: row.auto_leave || "",
        autoConsistency: row.auto_consistency || "",
        teleopIntakeMethod: row.teleop_intake_method || "",
        teleopBallCapacity: row.teleop_ball_capacity || "",
        teleopShootingAccuracy: row.teleop_shooting_accuracy || "",
        teleopGateInteraction: row.teleop_gate_interaction || "",
        teleopOverflowManagement: row.teleop_overflow_management || "",
        teleopCycleSpeed: row.teleop_cycle_speed || "",
        teleopArtifactClassification: row.teleop_artifact_classification || "",
        endgameParking: row.endgame_parking || "",
        endgameAllianceAssist: row.endgame_alliance_assist || "",
        penalties: row.penalties || [],
        specialFeatures: row.special_features || "",
        goodMatch: row.good_match || "",
      })));
    }
    if (assignmentsData) setAssignments(assignmentsData as TeamAssignment[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const teamSummaries = useMemo(() => {
    const byTeam: Record<string, ScoutingEntry[]> = {};
    entries.forEach((entry) => {
      if (!byTeam[entry.teamNumber]) byTeam[entry.teamNumber] = [];
      byTeam[entry.teamNumber].push(entry);
    });
    return Object.entries(byTeam)
      .map(([teamNumber, teamEntries]) => ({
        teamNumber,
        avgScore: teamEntries.reduce((sum, e) => sum + scoreEntry(e), 0) / teamEntries.length,
        entries: teamEntries,
        goodMatchResponses: teamEntries.filter((e) => e.goodMatch?.trim()).map((e) => ({ scouter: e.scouterName, response: e.goodMatch })),
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [entries]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div className="min-h-screen bg-background relative">
      <CelebrationOverlay visible={celebrating} />
      <div className="fixed top-0 left-0 w-full h-64 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl text-accent text-glow tracking-wider">
              SCOUT DASHBOARD
            </h1>
            <p className="text-xs text-muted-foreground font-body">MeadowBots Scouting — DECODE 2025–2026</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="px-3 py-1.5 rounded-lg text-xs font-display tracking-wider border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all duration-200"
            >
              ↻ REFRESH
            </button>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-lg text-xs font-display tracking-wider border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-all duration-200"
            >
              LOGOUT
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1 pb-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-1.5 rounded-lg text-xs font-display tracking-wider transition-all duration-200 ${
              activeTab === "dashboard"
                ? "bg-primary/20 text-primary border border-primary/40"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            🏠 DASHBOARD
          </button>
          <button
            onClick={() => setActiveTab("livestream")}
            className={`px-4 py-1.5 rounded-lg text-xs font-display tracking-wider transition-all duration-200 ${
              activeTab === "livestream"
                ? "bg-red-500/20 text-red-400 border border-red-500/40"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            🔴 LIVE STREAM
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* ── DASHBOARD TAB ── */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Welcome banner */}
            <div className="glass rounded-xl p-6 border border-accent/30 glow-primary">
              <div className="flex items-center gap-4">
                <span className="text-4xl">🛰️</span>
                <div>
                  <h2 className="font-display text-xl text-primary tracking-wider text-glow">MEADOWBOTS SCOUTING HQ</h2>
                  <p className="text-sm text-muted-foreground font-body mt-1">Scout View — DECODE 2025–2026</p>
                </div>
              </div>
            </div>

            {/* Stats row */}
            {loading ? (
              <div className="text-center py-10 text-muted-foreground font-body text-sm">Loading...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                  <div className="glass rounded-xl p-4 text-center border border-border/50">
                    <p className="font-display text-3xl text-primary text-glow">{entries.length}</p>
                    <p className="text-xs text-muted-foreground font-body mt-1">Total Entries</p>
                  </div>
                  <div className="glass rounded-xl p-4 text-center border border-border/50">
                    <p className="font-display text-3xl text-primary text-glow">{teamSummaries.length}</p>
                    <p className="text-xs text-muted-foreground font-body mt-1">Teams Scouted</p>
                  </div>
                </div>

                {/* Top 3 teams */}
                {teamSummaries.length > 0 && (
                  <div className="glass rounded-xl overflow-hidden border border-border/50">
                    <div className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
                      <span className="text-xl">🏆</span>
                      <h2 className="font-display text-base text-foreground tracking-wider">TOP 3 TEAMS</h2>
                    </div>
                    <div className="divide-y divide-border/30">
                      {teamSummaries.slice(0, 3).map((team, index) => (
                        <div key={team.teamNumber} className="px-5 py-3.5 flex items-center gap-4">
                          <span className="text-xl w-8 text-center">{getRankIcon(index + 1)}</span>
                          <div className="flex-1">
                            <p className="font-display text-sm text-foreground tracking-wide">Team {team.teamNumber}</p>
                            <p className="text-xs text-muted-foreground font-body">{team.entries.length} match{team.entries.length !== 1 ? "es" : ""} scouted</p>
                          </div>
                          <p className="font-display text-lg text-primary text-glow">{Math.round(team.avgScore)} pts</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Drive Teams */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Silver Drive Team */}
                  <div className="glass rounded-xl overflow-hidden border border-zinc-400/40">
                    <div className="px-5 py-3.5 border-b border-zinc-400/30" style={{ background: "linear-gradient(135deg, rgba(180,180,180,0.12), rgba(120,120,120,0.06))" }}>
                      <h3 className="font-display text-sm tracking-wider" style={{ color: "#C0C0C0", textShadow: "0 0 8px rgba(192,192,192,0.5)" }}>SILVER DRIVE TEAM</h3>
                    </div>
                    <div className="divide-y divide-zinc-400/20">
                      {[
                        { name: "William Hu", role: "Driver 1" },
                        { name: "Rock Kuperman", role: "Drive Coach" },
                        { name: "Devin Allen", role: "Drive Coach" },
                        { name: "Isabelle Liang", role: "Human Player" },
                      ].map(({ name, role }) => (
                        <div key={role} className="px-5 py-2.5 flex items-center justify-between">
                          <span className="font-body text-sm" style={{ color: "#A0A0A0" }}>{name}</span>
                          <span className="text-xs font-display tracking-wider" style={{ color: "#888" }}>{role}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Blue Drive Team */}
                  <div className="glass rounded-xl overflow-hidden border border-blue-400/40">
                    <div className="px-5 py-3.5 border-b border-blue-400/30" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(37,99,235,0.06))" }}>
                      <h3 className="font-display text-sm tracking-wider" style={{ color: "#60a5fa", textShadow: "0 0 8px rgba(96,165,250,0.5)" }}>BLUE DRIVE TEAM</h3>
                    </div>
                    <div className="divide-y divide-blue-400/20">
                      {[
                        { name: "Max Tran", role: "Driver 1" },
                        { name: "Cole Schubert", role: "Driver 1 / Human Player" },
                        { name: "Benjamin Hale", role: "Driver 2" },
                        { name: "Travis Quinn", role: "Human Player" },
                        { name: "Aiden Rubbo", role: "Drive Coach" },
                        { name: "Mason Howard", role: "Build / Drive Coach" },
                      ].map(({ name, role }) => (
                        <div key={role} className="px-5 py-2.5 flex items-center justify-between">
                          <span className="font-body text-sm" style={{ color: "#60a5fa" }}>{name}</span>
                          <span className="text-xs font-display tracking-wider text-blue-400">{role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Coaches */}
                <div className="glass rounded-xl overflow-hidden border border-amber-400/30">
                  <div className="px-5 py-3.5 border-b border-amber-400/20 flex items-center gap-3" style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.08), rgba(245,158,11,0.04))" }}>
                    <span className="text-lg">🎓</span>
                    <h3 className="font-display text-sm tracking-wider text-amber-400" style={{ textShadow: "0 0 8px rgba(251,191,36,0.4)" }}>COACHES</h3>
                  </div>
                  <div className="flex flex-wrap gap-0 divide-y divide-amber-400/10">
                    {["Mrs. Trujillo", "Mr. Trujillo", "Aiden Rubbo", "Devin Allen"].map((name) => (
                      <div key={name} className="px-5 py-2.5 w-full sm:w-1/2 flex items-center gap-3">
                        <span className="text-amber-400/60 text-xs">★</span>
                        <span className="font-body text-sm text-amber-100">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── LIVE STREAM TAB ── */}
        {activeTab === "livestream" && (
          <div className="space-y-4">
            <div className="glass rounded-xl p-4 border border-red-500/30">
              <div className="flex items-center gap-3 mb-1">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h2 className="font-display text-sm tracking-wider text-red-400">LIVE — FirstNevada</h2>
              </div>
              <p className="text-xs text-muted-foreground font-body">Official FIRST Nevada Twitch stream</p>
            </div>
            <div className="glass rounded-xl overflow-hidden border border-border/50" style={{ aspectRatio: "16/9" }}>
              <iframe
                src="https://player.twitch.tv/?channel=FirstNevada&parent=meadowbots.lovable.app&parent=id-preview--507347b5-b304-47c7-a618-7ba9a3c5c371.lovable.app"
                allowFullScreen
                className="w-full h-full"
                title="FirstNevada Live Stream"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoutDashboard;
