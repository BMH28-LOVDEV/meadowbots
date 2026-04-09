import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCelebration } from "@/hooks/useCelebration";
import CelebrationOverlay from "@/components/CelebrationOverlay";
import { HamburgerTabs, type TabItem } from "@/components/HamburgerTabs";
import AIChatBot from "@/components/AIChatBot";

interface ScoutingFormProps {
  scouterName: string;
  onLogout: () => void;
  userRole?: string;
}

interface FormData {
  teamNumber: string;
  teamName: string;
  matchNumber: string;
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
  cards: string[];
  penaltyPointsGiven: string;
  matchScore: string;
  allianceWon: string;
  specialFeatures: string;
  goodMatch: string;
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

const PENALTY_OPTIONS = [
  "Clearing the Gate illegally",
  "Touching opposing robot in Endgame zone",
  "Entering opposing Alliance's Human Player zone",
  "Entering opposing Alliance's Secret Tunnel",
  "Shooting outside the Shooting Zone",
  "Pinning / trapping opponent",
  "Turned off a robot",
  "Holding more than 3 artifacts",
  "None observed",
];

const CARD_OPTIONS = ["Yellow Card", "Red Card"];

const INITIAL_FORM: FormData = {
  teamNumber: "", teamName: "", matchNumber: "",
  autoArtifactsScored: "", autoPatternAlignment: "", autoLaunchLine: "", autoLeave: "", autoConsistency: "",
  teleopIntakeMethod: "", teleopBallCapacity: "", teleopShootingAccuracy: "", teleopGateInteraction: "",
  teleopOverflowManagement: "", teleopCycleSpeed: "", teleopArtifactClassification: "",
  endgameParking: "", endgameAllianceAssist: "",
  penalties: [], cards: [], penaltyPointsGiven: "",
  matchScore: "", allianceWon: "", specialFeatures: "", goodMatch: "",
};

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

const MCQuestion = ({ label, name, options, value, onChange }: {
  label: string; name: keyof FormData; options: string[]; value: string;
  onChange: (name: keyof FormData, value: string) => void;
}) => (
  <div className="space-y-3">
    <p className="text-sm font-body text-foreground font-medium">{label}</p>
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button key={option} type="button" onClick={() => onChange(name, option)}
          className={`px-4 py-2 rounded-lg text-sm font-body transition-all duration-200 border ${
            value === option
              ? "bg-primary/20 border-primary text-primary glow-primary"
              : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}
        >{option}</button>
      ))}
    </div>
  </div>
);

const SectionHeader = ({ title, icon }: { title: string; icon: string }) => (
  <div className="flex items-center gap-3 mb-6 mt-2">
    <span className="text-2xl">{icon}</span>
    <h3 className="text-lg font-display text-primary text-glow tracking-wider">{title}</h3>
    <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
  </div>
);

const getRankIcon = (rank: number) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
};

// ── Drive Data Scouting Form ──────────────────────────────────────────────────
const DD_PENALTY_OPTIONS = [
  "Clearing the Gate illegally",
  "Touching opposing robot in Endgame zone",
  "Entering opposing Alliance's Human Player zone",
  "Entering opposing Alliance's Secret Tunnel",
  "Shooting outside the Shooting Zone",
  "Pinning / trapping opponent",
  "Turned off a robot",
  "Holding more than 3 artifacts",
  "None observed",
];

const DriveDataForm = ({ scouterName, teamSummaries, loadingData }: {
  scouterName: string;
  teamSummaries: { teamNumber: string; avgScore: number; entries: ScoutingEntry[] }[];
  loadingData: boolean;
}) => {
  const [ddForm, setDdForm] = useState({
    teamNumber: "",
    matchNumber: "",
    autoArtifacts: "",
    teleopArtifacts: "",
    cycles: "",
    cycleTime: "",
    hasPenalties: "" as "" | "yes" | "no",
    penaltyPts: "",
    majorPts: "",
    penalties: [] as string[],
    park: "",
    matchScore: "",
    allianceWon: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleDd = (field: string, value: string) => setDdForm((prev) => ({ ...prev, [field]: value }));

  const handleDdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("scouting_entries").insert({
      scouter_name: scouterName,
      team_number: ddForm.teamNumber,
      match_number: ddForm.matchNumber || null,
      auto_artifacts_scored: ddForm.autoArtifacts || null,
      teleop_artifact_classification: ddForm.teleopArtifacts || null,
      teleop_cycle_speed: ddForm.cycles || null,
      teleop_ball_capacity: ddForm.cycleTime ? `${ddForm.cycleTime}s` : null,
      penalties: ddForm.penalties.length > 0 ? ddForm.penalties : null,
      penalty_points_given: ddForm.penaltyPts ? parseInt(ddForm.penaltyPts) : null,
      endgame_parking: ddForm.park || null,
      match_score: ddForm.matchScore ? parseInt(ddForm.matchScore) : null,
      alliance_won: ddForm.allianceWon || null,
    });
    setSubmitting(false);
    if (error) { toast.error("Failed to save. Please try again."); return; }
    toast.success("Drive Data submitted!");
    setDdForm({ teamNumber: "", matchNumber: "", autoArtifacts: "", teleopArtifacts: "", cycles: "", cycleTime: "", hasPenalties: "", penaltyPts: "", majorPts: "", penalties: [], park: "", matchScore: "", allianceWon: "" });
  };

  const inputCls = "w-full px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all";
  const shortInputCls = "w-32 px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-xl p-6 border border-blue-500/40" style={{ boxShadow: "0 0 20px hsl(220 100% 60% / 0.15)" }}>
        <div className="flex items-center gap-4">
          <span className="text-4xl">🔵</span>
          <div>
            <h2 className="font-display text-xl tracking-wider text-blue-400">DRIVE DATA SCOUTING</h2>
            <p className="text-xs text-muted-foreground font-body mt-1">Restricted — Drive Team Access Only</p>
          </div>
        </div>
      </div>

      {/* Full Rankings */}
      <div className="glass rounded-xl p-6 border border-border/50">
        <h3 className="font-display text-sm tracking-wider text-foreground mb-4">📊 FULL TEAM RANKINGS</h3>
        {loadingData ? (
          <p className="text-muted-foreground text-sm font-body">Loading...</p>
        ) : teamSummaries.length === 0 ? (
          <p className="text-muted-foreground text-sm font-body text-center py-4">No scouting data yet.</p>
        ) : (
          <div className="space-y-3">
            {teamSummaries.map((team, i) => (
              <div key={team.teamNumber} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border border-border/30">
                <span className="font-display text-sm w-8 text-center text-blue-400">{getRankIcon(i + 1)}</span>
                <div className="flex-1">
                  <p className="font-display text-sm text-foreground">Team {team.teamNumber}</p>
                  <p className="text-xs text-muted-foreground font-body">{team.entries.length} match{team.entries.length !== 1 ? "es" : ""} scouted</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-sm text-blue-400">{Math.round(team.avgScore)}</p>
                  <p className="text-xs text-muted-foreground font-body">avg score</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drive Data Form */}
      <form onSubmit={handleDdSubmit} className="space-y-6">

        {/* Team Info */}
        <div className="glass rounded-xl p-6 border border-blue-500/20 space-y-4">
          <SectionHeader title="TEAM INFO" icon="🤖" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground font-body mb-1">Our Team Number *</label>
              <input type="text" value={ddForm.teamNumber} onChange={(e) => handleDd("teamNumber", e.target.value)} placeholder="e.g. 14841" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground font-body mb-1">Match Number</label>
              <input type="text" value={ddForm.matchNumber} onChange={(e) => handleDd("matchNumber", e.target.value)} placeholder="e.g. Q5" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Autonomous */}
        <div className="glass rounded-xl p-6 border border-blue-500/20 space-y-4">
          <SectionHeader title="AUTONOMOUS" icon="⚡" />
          <div className="space-y-2">
            <label className="block text-sm font-body text-foreground font-medium"># of Artifacts WE Scored in Auto</label>
            <input type="text" value={ddForm.autoArtifacts} onChange={(e) => handleDd("autoArtifacts", e.target.value)} placeholder="e.g. 3" className={shortInputCls} />
          </div>
        </div>

        {/* Teleop */}
        <div className="glass rounded-xl p-6 border border-blue-500/20 space-y-4">
          <SectionHeader title="TELE-OP" icon="🎮" />
          <div className="space-y-2">
            <label className="block text-sm font-body text-foreground font-medium"># of Artifacts WE Scored in Teleop</label>
            <input type="text" value={ddForm.teleopArtifacts} onChange={(e) => handleDd("teleopArtifacts", e.target.value)} placeholder="e.g. 12" className={shortInputCls} />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-body text-foreground font-medium">Our Cycles — # of times it took us to intake and shoot 3</label>
            <input type="text" value={ddForm.cycles} onChange={(e) => handleDd("cycles", e.target.value)} placeholder="e.g. 4" className={shortInputCls} />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-body text-foreground font-medium">Our Cycle Time</label>
            <div className="flex items-center gap-3">
              <input type="number" min="0" value={ddForm.cycleTime} onChange={(e) => handleDd("cycleTime", e.target.value)} placeholder="e.g. 8" className={shortInputCls} />
              <span className="text-sm text-muted-foreground font-body">seconds</span>
            </div>
          </div>
        </div>

        {/* Penalties */}
        <div className="glass rounded-xl p-6 border border-blue-500/20 space-y-5">
          <SectionHeader title="PENALTIES" icon="🚨" />
          <div className="space-y-3">
            <p className="text-sm font-body text-foreground font-medium">Did WE receive any penalties?</p>
            <div className="flex gap-3">
              {[{ val: "yes", label: "Yes – We Had Penalties" }, { val: "no", label: "No Penalties" }].map(({ val, label }) => (
                <button key={val} type="button" onClick={() => setDdForm((prev) => ({ ...prev, hasPenalties: val as "yes" | "no", penaltyPts: val === "no" ? "" : prev.penaltyPts, penalties: val === "no" ? ["None observed"] : prev.penalties.filter(p => p !== "None observed") }))}
                  className={`px-4 py-2 rounded-lg text-sm font-body transition-all duration-200 border ${
                    ddForm.hasPenalties === val
                      ? val === "yes" ? "bg-destructive/20 border-destructive text-destructive" : "bg-green-500/20 border-green-500 text-green-400"
                      : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}>{val === "yes" ? "🚨 " : "✅ "}{label}</button>
              ))}
            </div>
          </div>

          {ddForm.hasPenalties === "yes" && (
            <>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <p className="text-sm font-body text-foreground font-medium">Which penalties did WE receive? (Select all that apply)</p>
              <div className="flex flex-wrap gap-2">
                {DD_PENALTY_OPTIONS.filter(p => p !== "None observed").map((penalty) => (
                  <button key={penalty} type="button"
                    onClick={() => setDdForm((prev) => {
                      const has = prev.penalties.includes(penalty);
                      return { ...prev, penalties: has ? prev.penalties.filter(p => p !== penalty) : [...prev.penalties, penalty] };
                    })}
                    className={`px-4 py-2 rounded-lg text-sm font-body transition-all duration-200 border ${
                      ddForm.penalties.includes(penalty)
                        ? "bg-destructive/20 border-destructive text-destructive"
                        : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}>{penalty}</button>
                ))}
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <div className="space-y-2">
                <label className="block text-sm font-body text-foreground font-medium">How many penalty points did WE receive?</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" value={ddForm.penaltyPts} onChange={(e) => handleDd("penaltyPts", e.target.value)} placeholder="0"
                    className="w-24 px-4 py-2.5 rounded-lg bg-muted border border-destructive/50 focus:border-destructive focus:ring-1 focus:ring-destructive text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all" />
                  <span className="text-sm text-muted-foreground font-body">pts received</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Endgame / Park */}
        <div className="glass rounded-xl p-6 border border-blue-500/20 space-y-4">
          <SectionHeader title="ENDGAME" icon="🏁" />
          <div className="space-y-3">
            <p className="text-sm font-body text-foreground font-medium">Did WE park in the Base Zone?</p>
            <div className="flex flex-wrap gap-2">
              {["None", "Partial", "Full"].map((option) => (
                <button key={option} type="button" onClick={() => handleDd("park", option)}
                  className={`px-4 py-2 rounded-lg text-sm font-body transition-all duration-200 border ${
                    ddForm.park === option
                      ? option === "Full" ? "bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_12px_2px_rgba(34,197,94,0.3)]"
                        : option === "Partial" ? "bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_12px_2px_rgba(234,179,8,0.3)]"
                        : "bg-destructive/20 border-destructive text-destructive"
                      : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}>
                  {option === "Full" ? "✅ " : option === "Partial" ? "🟡 " : "❌ "}{option}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Match Result */}
        <div className="glass rounded-xl p-6 border border-blue-500/20 space-y-5">
          <SectionHeader title="MATCH RESULT" icon="🏆" />
          <div className="space-y-2">
            <label className="block text-sm font-body text-foreground font-medium">What was the final score of OUR Alliance?</label>
            <input type="number" min="0" value={ddForm.matchScore} onChange={(e) => handleDd("matchScore", e.target.value)} placeholder="e.g. 85"
              className="w-full sm:w-48 px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all" />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-body text-foreground font-medium">Did OUR alliance win the match?</p>
            <div className="flex flex-wrap gap-3">
              {["No – Lost", "Tie", "Yes – Won"].map((option) => (
                <button key={option} type="button" onClick={() => handleDd("allianceWon", option)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-body font-semibold transition-all duration-200 border ${
                    ddForm.allianceWon === option
                      ? option === "Yes – Won" ? "bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_12px_2px_rgba(34,197,94,0.3)]"
                        : option === "No – Lost" ? "bg-destructive/20 border-destructive text-destructive"
                        : "bg-primary/20 border-primary text-primary"
                      : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}>
                  {option === "Yes – Won" ? "🏆 " : option === "No – Lost" ? "❌ " : "🤝 "}{option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button type="submit" disabled={submitting}
          className="w-full py-4 rounded-xl bg-blue-600 text-white font-display font-bold text-lg tracking-widest hover:bg-blue-500 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed">
          {submitting ? "SAVING..." : "SUBMIT DRIVE DATA"}
        </button>

        <p className="text-center text-muted-foreground/30 text-xs font-body pb-8">
          Drive Team Data • FTC DECODE™ 2025–2026
        </p>
      </form>
    </div>
  );
};

const ScoutingForm = ({ scouterName, onLogout, userRole }: ScoutingFormProps) => {
  const { celebrating } = useCelebration();
  const [activeTab, setActiveTab] = useState<"dashboard" | "scouting" | "livestream" | "drivedata" | "scoutai">("dashboard");
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [assignments, setAssignments] = useState<{ team_number: string; team_name: string; qual_matches: string[] }[]>([]);
  const [selectedTeamIdx, setSelectedTeamIdx] = useState(0);
  const [entries, setEntries] = useState<ScoutingEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const assignment = assignments[selectedTeamIdx] || null;

  const isBlueDriver = userRole === "bluedriver";
  const isSilverDriver = false;

  // Presence tracking
  useEffect(() => {
    const channel = supabase.channel("active_scouts", {
      config: { presence: { key: scouterName } },
    });
    channel
      .on("presence", { event: "sync" }, () => {})
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ name: scouterName, online_at: new Date().toISOString() });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [scouterName]);

  const fetchData = async () => {
    setLoadingData(true);
    const [{ data: rawEntries }, { data: assignmentData }] = await Promise.all([
      supabase.from("scouting_entries").select("*").order("timestamp", { ascending: true }),
      supabase.from("team_assignments").select("team_number, team_name, qual_matches").eq("scout_name", scouterName),
    ]);

    if (rawEntries) {
      setEntries(rawEntries.map((row) => ({
        id: row.id, teamNumber: row.team_number, matchNumber: row.match_number || "",
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

    if (assignmentData && assignmentData.length > 0) {
      setAssignments(assignmentData.map(a => ({ team_number: a.team_number, team_name: a.team_name, qual_matches: a.qual_matches || [] })));
      setForm((prev) => ({ ...prev, teamNumber: assignmentData[0].team_number, teamName: assignmentData[0].team_name }));
    }

    setLoadingData(false);
  };

  useEffect(() => {
    fetchData();
  }, [scouterName]);

  const completedMatches = useMemo(() => {
    const a = assignments[selectedTeamIdx];
    if (!a) return [];
    return entries
      .filter(e => e.scouterName === scouterName && e.teamNumber === a.team_number && e.matchNumber)
      .map(e => e.matchNumber.toUpperCase());
  }, [entries, assignments, selectedTeamIdx, scouterName]);

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
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [entries]);

  const handleChange = (name: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missingFields: string[] = [];
    if (!form.teamNumber) missingFields.push("Team Number");
    if (!form.matchNumber) missingFields.push("Match Number");
    if (!form.autoArtifactsScored) missingFields.push("Artifacts Scored (Auto)");
    if (!form.autoPatternAlignment) missingFields.push("Pattern Alignment (Auto)");
    if (!form.autoLaunchLine) missingFields.push("Launch Line (Auto)");
    if (!form.autoLeave) missingFields.push("Leave (Auto)");
    if (!form.autoConsistency) missingFields.push("Auto Consistency");
    if (!form.teleopIntakeMethod) missingFields.push("Intake Method (Teleop)");
    if (!form.teleopBallCapacity) missingFields.push("Ball Capacity (Teleop)");
    if (!form.teleopShootingAccuracy) missingFields.push("Shooting Accuracy (Teleop)");
    if (!form.teleopGateInteraction) missingFields.push("Gate Interaction (Teleop)");
    if (!form.teleopOverflowManagement) missingFields.push("Overflow Management (Teleop)");
    if (!form.teleopCycleSpeed) missingFields.push("Cycle Speed (Teleop)");
    if (!form.teleopArtifactClassification) missingFields.push("Artifact Classification (Teleop)");
    if (!form.endgameParking) missingFields.push("Parking (Endgame)");
    if (!form.endgameAllianceAssist) missingFields.push("Alliance Assist (Endgame)");
    if (form.penalties.length === 0) missingFields.push("Penalties");
    if (!form.allianceWon) missingFields.push("Did the Alliance Win?");
    if (!form.goodMatch) missingFields.push("Good Match Assessment");

    if (missingFields.length > 0) {
      toast.error("Please answer all of the questions.", {
        duration: 5000, position: "top-center",
        style: { background: "hsl(0 72% 28%)", border: "1px solid hsl(0 72% 50%)", color: "white" },
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("scouting_entries") as any).insert({
      scouter_name: scouterName,
      team_number: form.teamNumber,
      match_number: form.matchNumber || null,
      auto_artifacts_scored: form.autoArtifactsScored || null,
      auto_pattern_alignment: form.autoPatternAlignment || null,
      auto_launch_line: form.autoLaunchLine || null,
      auto_leave: form.autoLeave || null,
      auto_consistency: form.autoConsistency || null,
      teleop_intake_method: form.teleopIntakeMethod || null,
      teleop_ball_capacity: form.teleopBallCapacity || null,
      teleop_shooting_accuracy: form.teleopShootingAccuracy || null,
      teleop_gate_interaction: form.teleopGateInteraction || null,
      teleop_overflow_management: form.teleopOverflowManagement || null,
      teleop_cycle_speed: form.teleopCycleSpeed || null,
      teleop_artifact_classification: form.teleopArtifactClassification || null,
      endgame_parking: form.endgameParking || null,
      endgame_alliance_assist: form.endgameAllianceAssist || null,
      penalties: [...form.penalties, ...form.cards.map((c) => `[CARD] ${c}`)],
      penalty_points_given: form.penaltyPointsGiven ? parseInt(form.penaltyPointsGiven) : null,
      match_score: form.matchScore ? parseInt(form.matchScore) : null,
      alliance_won: form.allianceWon || null,
      special_features: form.specialFeatures || null,
      good_match: form.goodMatch || null,
    });
    setSubmitting(false);

    if (error) {
      toast.error("Failed to save. Please try again.");
      console.error(error);
      return;
    }

    toast.success(`Submitted! Score: ~${form.matchScore || "N/A"}`);
    setForm((prev) => ({ ...INITIAL_FORM, teamNumber: assignment?.team_number || "", teamName: assignment?.team_name || "" }));
    window.scrollTo({ top: 0, behavior: "smooth" });
    setActiveTab("dashboard");
    fetchData();
  };

  return (
    <div className="min-h-screen bg-background relative">
      <CelebrationOverlay visible={celebrating} />
      <div className="fixed top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/3 to-transparent pointer-events-none" />

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl text-primary text-glow tracking-wider">SCOUT PORTAL</h1>
            <p className="text-xs text-muted-foreground font-body">
              Logged In As: <span className="text-foreground">{scouterName}</span>
            </p>
            <p className="text-xs font-body" style={{ color:
              userRole === "bluedriver" ? "hsl(220 100% 70%)" :
              userRole === "silverdriver" ? "hsl(215 20% 75%)" :
              userRole === "driveteam" ? "hsl(220 80% 65%)" :
              "hsl(var(--muted-foreground))"
            }}>
              {userRole === "bluedriver" ? "Blue Drive Data Collector" :
               userRole === "silverdriver" ? "Silver Drive Data Collector" :
               userRole === "driveteam" ? "Drive Team" :
               "Scouter"}
            </p>
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

        <HamburgerTabs
          tabs={[
            { id: "dashboard", label: "DASHBOARD", icon: "🏠" },
            { id: "scouting", label: "SCOUTING FORM", icon: "📋", activeClass: "bg-accent/20 text-accent border border-accent/40" },
            { id: "livestream", label: "LIVE STREAM", icon: "🔴", activeClass: "bg-red-500/20 text-red-400 border border-red-500/40" },
            { id: "drivedata", label: "DRIVE DATA", icon: "🔵", activeClass: "bg-blue-500/20 text-blue-400 border border-blue-500/40" },
          ]}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as typeof activeTab)}
        />
      </header>

      {/* ══ DASHBOARD TAB ══ */}
      {activeTab === "dashboard" && (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          <div className="glass rounded-xl p-6 border border-accent/30 glow-primary">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <span className="text-4xl">🛰️</span>
                <div>
                  <h2 className="font-display text-xl text-primary tracking-wider text-glow">MEADOWBOTS SCOUTING HQ</h2>
                  <p className="text-sm text-muted-foreground font-body mt-1">Scout View — DECODE 2025–2026</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("scouting")}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold tracking-widest text-sm hover:glow-primary-strong transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
              >
                🚀 START SCOUTING
              </button>
            </div>
          </div>

          {loadingData ? (
            <div className="text-center py-10 text-muted-foreground font-body text-sm">Loading...</div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass rounded-xl p-4 text-center border border-border/50">
                  <p className="font-display text-3xl text-primary text-glow">{entries.length}</p>
                  <p className="text-xs text-muted-foreground font-body mt-1">Total Entries</p>
                </div>
                <div className="glass rounded-xl p-4 text-center border border-border/50">
                  <p className="font-display text-3xl text-primary text-glow">{teamSummaries.length}</p>
                  <p className="text-xs text-muted-foreground font-body mt-1">Teams Scouted</p>
                </div>
              </div>

              {/* Assignments */}
              {assignments.length > 0 && (
                <div className="glass rounded-xl p-5 border border-primary/30 space-y-3">
                  <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">Your Assigned Teams (3)</p>
                  {assignments.map((a, idx) => {
                    const teamCompleted = a.qual_matches.every(m =>
                      entries.some(e => e.scouterName === scouterName && e.teamNumber === a.team_number && e.matchNumber.toUpperCase() === m.toUpperCase())
                    );
                    return (
                      <button
                        key={a.team_number}
                        type="button"
                        onClick={() => {
                          setSelectedTeamIdx(idx);
                          setForm(prev => ({ ...prev, teamNumber: a.team_number, teamName: a.team_name, matchNumber: "" }));
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedTeamIdx === idx ? "border-primary/60 bg-primary/10" : "border-border/30 bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="font-display text-sm text-primary tracking-wider">
                            Team #{a.team_number}
                          </p>
                          {teamCompleted && <span className="text-xs text-green-400 font-display">✓ DONE</span>}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {a.qual_matches.map((m) => {
                            const done = entries.some(e => e.scouterName === scouterName && e.teamNumber === a.team_number && e.matchNumber.toUpperCase() === m.toUpperCase());
                            return (
                              <span key={m} className={`px-2.5 py-0.5 rounded-md text-xs font-display ${done ? "bg-green-500/20 text-green-400 border border-green-500/40" : "bg-muted text-muted-foreground border border-border"}`}>
                                {done ? "✓ " : ""}{m}
                              </span>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Top Rankings */}
              {teamSummaries.length > 0 && (
                <div className="glass rounded-xl p-5 border border-border/50">
                  <h3 className="font-display text-sm tracking-wider text-foreground mb-4">🏆 TOP RANKINGS</h3>
                  <div className="space-y-3">
                    {teamSummaries.slice(0, 5).map((team, i) => (
                      <div key={team.teamNumber} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border border-border/30">
                        <span className="font-display text-sm w-8 text-center text-primary">{getRankIcon(i + 1)}</span>
                        <div className="flex-1">
                          <p className="font-display text-sm text-foreground">Team {team.teamNumber}</p>
                          <p className="text-xs text-muted-foreground font-body">{team.entries.length} match{team.entries.length !== 1 ? "es" : ""}</p>
                        </div>
                        <p className="font-display text-sm text-primary">{Math.round(team.avgScore)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ SCOUTING FORM TAB ══ */}
      {activeTab === "scouting" && (
        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 py-8 space-y-8">

          {assignments.length > 0 && (
            <div className="glass rounded-xl p-4 border border-primary/40 glow-primary space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">Select Team to Scout</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {assignments.map((a, idx) => {
                  const allDone = a.qual_matches.every(m =>
                    entries.some(e => e.scouterName === scouterName && e.teamNumber === a.team_number && e.matchNumber.toUpperCase() === m.toUpperCase())
                  );
                  return (
                    <button
                      key={a.team_number}
                      type="button"
                      onClick={() => {
                        setSelectedTeamIdx(idx);
                        setForm(prev => ({ ...prev, teamNumber: a.team_number, teamName: a.team_name, matchNumber: "" }));
                      }}
                      className={`px-4 py-2.5 rounded-lg text-sm font-display tracking-wider transition-all border ${
                        selectedTeamIdx === idx
                          ? "bg-primary/20 border-primary text-primary glow-primary"
                          : allDone
                            ? "bg-green-500/10 border-green-500/40 text-green-400"
                            : "bg-muted border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {allDone ? "✓ " : ""}#{a.team_number}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Team Info */}
          <div className="glass rounded-xl p-6 glow-primary space-y-4">
            <SectionHeader title="TEAM INFO" icon="🤖" />
            <div>
              <label className="block text-sm text-muted-foreground font-body mb-1">Official Team Name</label>
              <input type="text" value={form.teamName} onChange={(e) => handleChange("teamName", e.target.value)}
                placeholder="e.g. The Cheesy Poofs"
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground font-body mb-1">Team Number *</label>
                <input type="text" value={form.teamNumber} onChange={(e) => handleChange("teamNumber", e.target.value)}
                  placeholder="e.g. 14841"
                  className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground font-body mb-1">Match Number</label>
                {assignment && assignment.qual_matches.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {assignment.qual_matches.map((match) => {
                      const isDone = completedMatches.includes(match.toUpperCase());
                      const isSelected = form.matchNumber === match;
                      return (
                        <button key={match} type="button" disabled={isDone}
                          onClick={() => !isDone && handleChange("matchNumber", isSelected ? "" : match)}
                          className={`px-4 py-2 rounded-lg text-sm font-body font-semibold transition-all duration-200 border ${
                            isDone ? "bg-green-500/20 border-green-500/60 text-green-400 cursor-not-allowed opacity-80"
                              : isSelected ? "bg-primary/20 border-primary text-primary glow-primary"
                              : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}>
                          {isDone ? "✓ " : ""}{match}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input type="text" value={form.matchNumber} onChange={(e) => handleChange("matchNumber", e.target.value)}
                    placeholder="e.g. Q5"
                    className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all" />
                )}
              </div>
            </div>
          </div>

          {/* Autonomous */}
          <div className="glass rounded-xl p-6 border-glow space-y-5">
            <SectionHeader title="AUTONOMOUS" icon="⚡" />
            <MCQuestion label="How many artifacts did they score in Autonomous?" name="autoArtifactsScored" options={["0", "1-2", "3-4", "5+"]} value={form.autoArtifactsScored} onChange={handleChange} />
            <MCQuestion label="Did they achieve pattern alignment in Autonomous?" name="autoPatternAlignment" options={["None", "1 Pattern", "2 Patterns", "3+ Patterns"]} value={form.autoPatternAlignment} onChange={handleChange} />
            <MCQuestion label="Did their robot cross the Launch Line?" name="autoLaunchLine" options={["No", "Yes"]} value={form.autoLaunchLine} onChange={handleChange} />
            <MCQuestion label="Did they leave at the end of Autonomous?" name="autoLeave" options={["No", "Yes"]} value={form.autoLeave} onChange={handleChange} />
            <MCQuestion label="How consistent was their Autonomous routine?" name="autoConsistency" options={["No Auto", "Inconsistent", "Mostly Consistent", "Very Consistent"]} value={form.autoConsistency} onChange={handleChange} />
          </div>

          {/* Teleop */}
          <div className="glass rounded-xl p-6 border-glow space-y-5">
            <SectionHeader title="TELE-OP" icon="🎮" />
            <MCQuestion label="What intake method did they use?" name="teleopIntakeMethod" options={["No Intake", "Pushing", "Floor Intake", "Both"]} value={form.teleopIntakeMethod} onChange={handleChange} />
            <MCQuestion label="How many balls can their robot hold at once?" name="teleopBallCapacity" options={["1", "2", "3"]} value={form.teleopBallCapacity} onChange={handleChange} />
            <MCQuestion label="How accurate was their shooting?" name="teleopShootingAccuracy" options={["No Shooting", "Inaccurate", "Somewhat Accurate", "Very Accurate"]} value={form.teleopShootingAccuracy} onChange={handleChange} />
            <MCQuestion label="Did they interact with the Gate?" name="teleopGateInteraction" options={["Did Not Attempt", "Tried But Failed", "Sometimes", "Opened Reliably"]} value={form.teleopGateInteraction} onChange={handleChange} />
            <MCQuestion label="How well did they manage Overflow artifacts?" name="teleopOverflowManagement" options={["Did Not Collect", "Poor", "Good", "Excellent"]} value={form.teleopOverflowManagement} onChange={handleChange} />
            <MCQuestion label="How fast were their scoring cycles?" name="teleopCycleSpeed" options={["Minimal Cycling", "Slow", "Average", "Very Fast"]} value={form.teleopCycleSpeed} onChange={handleChange} />
            <MCQuestion label="Did they classify artifacts correctly?" name="teleopArtifactClassification" options={["No Classification", "Rarely", "Mostly", "Always"]} value={form.teleopArtifactClassification} onChange={handleChange} />
          </div>

          {/* Endgame */}
          <div className="glass rounded-xl p-6 border-glow space-y-5">
            <SectionHeader title="ENDGAME" icon="🏁" />
            <MCQuestion label="Did they park in the Base Zone?" name="endgameParking" options={["No", "Partial", "Yes – Full Park"]} value={form.endgameParking} onChange={handleChange} />
            <MCQuestion label="Did they assist their alliance partner in Endgame?" name="endgameAllianceAssist" options={["No", "Attempted", "Yes"]} value={form.endgameAllianceAssist} onChange={handleChange} />
          </div>

          {/* Penalties */}
          <div className="glass rounded-xl p-6 border-glow space-y-5">
            <SectionHeader title="PENALTIES" icon="🚨" />
            <p className="text-sm font-body text-foreground font-medium">Which penalties did this team receive? (Select all that apply)</p>
            <div className="flex flex-wrap gap-2">
              {PENALTY_OPTIONS.map((penalty) => (
                <button key={penalty} type="button"
                  onClick={() => {
                    setForm((prev) => {
                      const has = prev.penalties.includes(penalty);
                      if (penalty === "None observed") return { ...prev, penalties: has ? [] : ["None observed"] };
                      const withoutNone = prev.penalties.filter((p) => p !== "None observed");
                      return { ...prev, penalties: has ? withoutNone.filter((p) => p !== penalty) : [...withoutNone, penalty] };
                    });
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-body transition-all duration-200 border ${
                    (form.penalties || []).includes(penalty)
                      ? penalty === "None observed" ? "bg-glow-success/20 border-glow-success text-glow-success" : "bg-destructive/20 border-destructive text-destructive"
                      : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}>{penalty}</button>
              ))}
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="space-y-3">
              <p className="text-sm font-body text-foreground font-medium">Major Cards Issued</p>
              <div className="flex flex-wrap gap-3">
                {CARD_OPTIONS.map((card) => {
                  const isSelected = (form.cards || []).includes(card);
                  const isYellow = card === "Yellow Card";
                  return (
                    <button key={card} type="button"
                      onClick={() => { setForm((prev) => { const has = prev.cards.includes(card); return { ...prev, cards: has ? prev.cards.filter((c) => c !== card) : [...prev.cards, card] }; }); }}
                      className={`px-5 py-2.5 rounded-lg text-sm font-body font-semibold transition-all duration-200 border ${
                        isSelected ? isYellow ? "bg-yellow-400/20 border-yellow-400 text-yellow-400 shadow-[0_0_12px_2px_rgba(250,204,21,0.4)]" : "bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_12px_2px_rgba(239,68,68,0.45)]"
                        : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}>
                      {isYellow ? "🟨" : "🟥"} {card}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="space-y-2">
              <label className="block text-sm font-body text-foreground font-medium">How many penalty points did this team give to the opposing alliance?</label>
              <input type="number" min="0" value={form.penaltyPointsGiven} onChange={(e) => handleChange("penaltyPointsGiven", e.target.value)}
                placeholder="e.g. 10"
                className="w-full sm:w-48 px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all" />
            </div>
          </div>

          {/* Match Result */}
          <div className="glass rounded-xl p-6 border-glow space-y-5">
            <SectionHeader title="MATCH RESULT" icon="🏆" />
            <div className="space-y-2">
              <label className="block text-sm font-body text-foreground font-medium">What was the final score of the Alliance that the Team you were Scouting was on?</label>
              <input type="number" min="0" value={form.matchScore} onChange={(e) => handleChange("matchScore", e.target.value)}
                placeholder="e.g. 85"
                className="w-full sm:w-48 px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all" />
            </div>
            <div className="space-y-3">
              <p className="text-sm font-body text-foreground font-medium">Did the alliance / team you are scouting win the match?</p>
              <div className="flex flex-wrap gap-3">
                {["No – Lost", "Tie", "Yes – Won"].map((option) => (
                  <button key={option} type="button" onClick={() => handleChange("allianceWon", option)}
                    className={`px-5 py-2.5 rounded-lg text-sm font-body font-semibold transition-all duration-200 border ${
                      form.allianceWon === option
                        ? option === "Yes – Won" ? "bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_12px_2px_rgba(34,197,94,0.3)]"
                          : option === "No – Lost" ? "bg-destructive/20 border-destructive text-destructive"
                          : "bg-primary/20 border-primary text-primary"
                        : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}>
                    {option === "Yes – Won" ? "🏆 " : option === "No – Lost" ? "❌ " : "🤝 "}{option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="glass rounded-xl p-6 glow-primary space-y-6">
            <SectionHeader title="NOTES" icon="📝" />
            <div className="space-y-2">
              <label className="block text-sm font-body text-foreground font-medium">What special features or strategies did you notice about this team?</label>
              <textarea value={form.specialFeatures} onChange={(e) => handleChange("specialFeatures", e.target.value)} rows={3}
                placeholder="e.g. They had a unique dual-flywheel launcher, very fast cycles..."
                className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all resize-none" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-body text-foreground font-bold text-lg">Do you think this team will be a good match for us?</label>
              <textarea value={form.goodMatch} onChange={(e) => handleChange("goodMatch", e.target.value)} rows={3}
                placeholder="Yes / No and why..."
                className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all resize-none" />
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={submitting}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg tracking-widest hover:glow-primary-strong transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed">
            {submitting ? "SAVING..." : "SUBMIT SCOUTING DATA"}
          </button>

          <p className="text-center text-muted-foreground/30 text-xs font-body pb-8">
            Data synced to TMS Scouting • FTC DECODE™ 2025–2026
          </p>
        </form>
      )}

      {/* ══ LIVE STREAM TAB ══ */}
      {activeTab === "livestream" && (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
          <div className="glass rounded-xl p-4 border border-red-500/30">
            <div className="flex items-center gap-3 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h2 className="font-display text-sm tracking-wider text-red-400">LIVE — FirstNevada</h2>
            </div>
            <p className="text-xs text-muted-foreground font-body">Official FIRST Nevada Twitch stream</p>
          </div>
          <div className="glass rounded-xl overflow-hidden border border-border/50" style={{ aspectRatio: "16/9" }}>
            <iframe
              src="https://player.twitch.tv/?channel=FIRSTNevada&parent=meadowbots.lovable.app&parent=id-preview--507347b5-b304-47c7-a618-7ba9a3c5c371.lovable.app&parent=507347b5-b304-47c7-a618-7ba9a3c5c371.lovableproject.com&parent=localhost"
              allowFullScreen className="w-full h-full" title="FirstNevada Live Stream"
            />
          </div>
        </div>
      )}

      {/* ══ DRIVE DATA TAB ══ */}
      {activeTab === "drivedata" && (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {(isBlueDriver || isSilverDriver) ? (
            <DriveDataForm scouterName={scouterName} teamSummaries={teamSummaries} loadingData={loadingData} />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 space-y-5 text-center">
              <span className="text-6xl">🔒</span>
              <div>
                <h2 className="font-display text-xl tracking-wider text-foreground">RESTRICTED ACCESS</h2>
                <p className="text-muted-foreground font-body text-sm mt-2 max-w-xs mx-auto">
                  Only allowed for Authorized Drive Team Data.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScoutingForm;
