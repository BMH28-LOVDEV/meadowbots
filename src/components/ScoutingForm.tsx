import { useState, useEffect, useMemo, useRef } from "react";
import { Info, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCelebration } from "@/hooks/useCelebration";
import CelebrationOverlay from "@/components/CelebrationOverlay";
import { HamburgerTabs, type TabItem } from "@/components/HamburgerTabs";
import AIChatBot from "@/components/AIChatBot";
import fieldMapImage from "@/assets/field-map.png";

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
  autoBallsScored: string;
  teleopIntakeMethod: string;
  teleopBallCapacity: string;
  teleopShootingAccuracy: string;
  teleopGateInteraction: string;
  teleopOverflowManagement: string;
  teleopCycleSpeed: string;
  teleopArtifactClassification: string;
  teleopBallsScored: string;
  endgameParking: string;
  endgameAllianceAssist: string;
  endgameParkFeatures: string;
  endgameParkFeaturesOther: string;
  penalties: string[];
  cards: string[];
  penaltyPointsGiven: string;
  matchScore: string;
  allianceWon: string;
  specialFeatures: string;
  goodMatch: string;
  pitScoutMatch: string;
  pitScoutMatchElaborate: string;
}

interface ScoutingEntry {
  id: string;
  teamNumber: string;
  matchNumber: string;
  scouterName: string;
  timestamp: string;
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
  matchScore: number | null;
  allianceWon: string;
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
  autoArtifactsScored: "", autoPatternAlignment: "", autoLaunchLine: "", autoLeave: "", autoConsistency: "", autoBallsScored: "",
  teleopIntakeMethod: "", teleopBallCapacity: "", teleopShootingAccuracy: "", teleopGateInteraction: "",
  teleopOverflowManagement: "", teleopCycleSpeed: "", teleopArtifactClassification: "", teleopBallsScored: "",
  endgameParking: "", endgameAllianceAssist: "", endgameParkFeatures: "", endgameParkFeaturesOther: "",
  penalties: [], cards: [], penaltyPointsGiven: "",
  matchScore: "", allianceWon: "", specialFeatures: "", goodMatch: "", pitScoutMatch: "", pitScoutMatchElaborate: "",
};

const scoreEntry = (entry: ScoutingEntry): number => {
  let score = 0;
  const autoNum = parseInt(entry.autoArtifactsScored) || 0;
  score += Math.min(autoNum * 3, 15);
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
  const cycleSpeed: Record<string, number> = { "Very Fast": 10, "Fast": 7, "Slow": 3, "Very Slow": 0 };
  score += cycleSpeed[entry.teleopCycleSpeed] || 0;
  const classification: Record<string, number> = { "Always": 8, "Mostly": 5, "Rarely": 2, "No Classification": 0 };
  score += classification[entry.teleopArtifactClassification] || 0;
  const ballCap: Record<string, number> = { "1": 2, "2": 5, "3": 8 };
  score += ballCap[entry.teleopBallCapacity] || 0;
  const parking: Record<string, number> = { "Yes – Full Park": 10, "Partial": 5, "No": 0 };
  score += parking[entry.endgameParking] || 0;
  const penalties = entry.penalties || [];
  const penaltyCount = penalties.filter((p) => p !== "None observed").length;
  score -= penaltyCount * 5;
  return score;
};

const GRADIENT_COLORS = [
  "bg-red-500/20 border-red-500 text-red-400",
  "bg-orange-500/20 border-orange-500 text-orange-400",
  "bg-yellow-500/20 border-yellow-500 text-yellow-400",
  "bg-green-500/20 border-green-500 text-green-400",
];

const getOptionColor = (index: number, total: number) => {
  if (total === 2) return index === 0 ? GRADIENT_COLORS[0] : GRADIENT_COLORS[3];
  if (total === 3) return [GRADIENT_COLORS[0], GRADIENT_COLORS[2], GRADIENT_COLORS[3]][index];
  return GRADIENT_COLORS[index] || GRADIENT_COLORS[3];
};

const MCQuestion = ({ label, name, options, value, onChange }: {
  label: string; name: keyof FormData; options: string[]; value: string;
  onChange: (name: keyof FormData, value: string) => void;
}) => (
  <div className="space-y-3">
    <p className="text-sm font-body text-foreground font-medium">{label}</p>
    <div className="flex flex-wrap gap-2">
      {options.map((option, i) => (
        <button key={option} type="button" onClick={() => onChange(name, option)}
          className={`px-4 py-2 rounded-lg text-sm font-body transition-all duration-200 border ${
            value === option
              ? getOptionColor(i, options.length)
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

// ── Pit Scouting Form ─────────────────────────────────────────────────────────
const PitScoutForm = ({ scouterName }: { scouterName: string }) => {
  const [pitForm, setPitForm] = useState({
    teamNumber: "",
    teamName: "",
    strengths: "",
    weaknesses: "",
    autoArtifacts: "",
    autoScoringZone: "",
    autoStartPosition: "",
    autoClear: "",
    autoDescription: "",
    teleopFocus: "",
    teleopScoringZone: "",
    endgameStrategy: "",
    endgameParking: "",
    endgameParkFeatures: "",
    endgameParkFeaturesOther: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (field: string, value: string) => setPitForm(p => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pitForm.teamNumber) { toast.error("Please enter a team number."); return; }
    setSubmitting(true);
    const { error } = await supabase.from("pit_scouting_entries" as any).insert({
      scouter_name: scouterName,
      team_number: pitForm.teamNumber,
      team_name: pitForm.teamName || null,
      strengths: pitForm.strengths || null,
      weaknesses: pitForm.weaknesses || null,
      auto_artifacts_scored: pitForm.autoArtifacts || null,
      scoring_zone: pitForm.autoScoringZone || null,
      teleop_focus: pitForm.teleopFocus || null,
      teleop_scoring_zone: pitForm.teleopScoringZone || null,
      endgame_strategy: pitForm.endgameStrategy || null,
      endgame_parking: pitForm.endgameParking || null,
      endgame_park_features: pitForm.endgameParkFeatures || null,
      endgame_park_features_other: pitForm.endgameParkFeaturesOther || null,
      auto_start_position: pitForm.autoStartPosition || null,
      auto_clear: pitForm.autoClear || null,
      auto_description: pitForm.autoDescription || null,
    } as any);
    setSubmitting(false);
    if (error) { toast.error("Failed to save. Please try again."); return; }
    toast.success("Pit Scout submitted!");
    setPitForm({ teamNumber: "", teamName: "", strengths: "", weaknesses: "", autoArtifacts: "", autoScoringZone: "", autoStartPosition: "", autoClear: "", autoDescription: "", teleopFocus: "", teleopScoringZone: "", endgameStrategy: "", endgameParking: "", endgameParkFeatures: "", endgameParkFeaturesOther: "" });
  };

  const inputCls = "w-full px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-accent focus:ring-1 focus:ring-accent text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all";
  const shortInputCls = "w-32 px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-accent focus:ring-1 focus:ring-accent text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all";

  const ZoneButtons = ({ value, field }: { value: string; field: string }) => (
    <div className="space-y-3">
      <p className="text-sm font-body text-foreground font-medium">Where do you usually score from? (From Audience Perspective)</p>
      <div className="flex flex-wrap gap-2">
        {["Front Zone", "Back Zone"].map((option, i) => (
          <button key={option} type="button" onClick={() => set(field, option)}
            className={`px-4 py-2 rounded-lg text-sm font-body transition-all duration-200 border ${
              value === option ? getOptionColor(i, 2) : "bg-muted border-border text-muted-foreground hover:border-accent/40 hover:text-foreground"
            }`}
          >{option}</button>
        ))}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Team Info */}
      <div className="glass rounded-xl p-6 border border-accent/20 space-y-4">
        <SectionHeader title="TEAM INFO" icon="🤖" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted-foreground font-body mb-1">Team Number *</label>
            <input type="text" value={pitForm.teamNumber} onChange={(e) => set("teamNumber", e.target.value)} placeholder="e.g. 14841" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground font-body mb-1">Team Name</label>
            <input type="text" value={pitForm.teamName} onChange={(e) => set("teamName", e.target.value)} placeholder="e.g. MeadowBots" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="glass rounded-xl p-6 border border-accent/20 space-y-4">
        <SectionHeader title="STRENGTHS & WEAKNESSES" icon="💪" />
        <div>
          <label className="block text-sm font-body font-medium text-foreground mb-2">Strengths</label>
          <textarea value={pitForm.strengths} onChange={(e) => set("strengths", e.target.value)}
            placeholder="What does your team do well?" rows={3} className={inputCls + " resize-none"} />
        </div>
        <div>
          <label className="block text-sm font-body font-medium text-foreground mb-2">Weaknesses</label>
          <textarea value={pitForm.weaknesses} onChange={(e) => set("weaknesses", e.target.value)}
            placeholder="What does your team struggle with?" rows={3} className={inputCls + " resize-none"} />
        </div>
      </div>

      {/* Autonomous */}
      <div className="glass rounded-xl p-6 border border-accent/20 space-y-4">
        <SectionHeader title="AUTONOMOUS" icon="⚡" />
        <div>
          <label className="block text-sm font-body font-medium text-foreground mb-2">How many Artifacts does your team score during Auto? (Solo)</label>
          <input type="text" value={pitForm.autoArtifacts} onChange={(e) => set("autoArtifacts", e.target.value)} placeholder="e.g. 3" className={shortInputCls} />
        </div>
        <ZoneButtons value={pitForm.autoScoringZone} field="autoScoringZone" />

        {/* Interactive Field Map with real image */}
        <div className="space-y-3">
          <p className="text-sm font-body text-foreground font-medium">Please mark where your Robot Starts</p>
          <div className="relative w-full aspect-square max-w-[380px] mx-auto rounded-xl border border-border overflow-hidden">
            {/* Real field image as background */}
            <img src={fieldMapImage} alt="FTC Field Map" className="absolute inset-0 w-full h-full object-cover" />
            
            {/* Spike Mark Labels — 1 closest to goal, 3 closest to audience */}
            {/* Blue side (left) */}
            <div className="absolute text-[9px] font-display text-blue-400 font-bold bg-black/70 px-1 py-0.5 rounded z-20" style={{ left: '6%', top: '52%' }}>③</div>
            <div className="absolute text-[9px] font-display text-blue-400 font-bold bg-black/70 px-1 py-0.5 rounded z-20" style={{ left: '6%', top: '68%' }}>②</div>
            <div className="absolute text-[9px] font-display text-blue-400 font-bold bg-black/70 px-1 py-0.5 rounded z-20" style={{ left: '6%', top: '83%' }}>①</div>
            {/* Red side (right) */}
            <div className="absolute text-[9px] font-display text-red-400 font-bold bg-black/70 px-1 py-0.5 rounded z-20" style={{ right: '6%', top: '52%' }}>③</div>
            <div className="absolute text-[9px] font-display text-red-400 font-bold bg-black/70 px-1 py-0.5 rounded z-20" style={{ right: '6%', top: '68%' }}>②</div>
            <div className="absolute text-[9px] font-display text-red-400 font-bold bg-black/70 px-1 py-0.5 rounded z-20" style={{ right: '6%', top: '83%' }}>①</div>

            {/* Selectable 6x6 grid - precisely aligned to actual field tiles */}
            {/* Grid boundaries from image analysis: x and y lines at 4.4%, 16.6%, 33.2%, 49.9%, 66.6%, 83.2%, 95.5% */}
            {(() => {
              const colEdges = [0, 16.6, 33.2, 49.9, 66.6, 83.2, 100];
              const rowEdges = [0, 16.6, 33.2, 49.9, 66.6, 83.2, 100];
              return Array.from({ length: 36 }, (_, i) => {
                const row = Math.floor(i / 6);
                const col = i % 6;
                const label = `R${row + 1}C${col + 1}`;
                const isSelected = pitForm.autoStartPosition === label;
                const left = colEdges[col];
                const top = rowEdges[row];
                const width = colEdges[col + 1] - colEdges[col];
                const height = rowEdges[row + 1] - rowEdges[row];
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => set("autoStartPosition", isSelected ? "" : label)}
                    className={`absolute transition-all duration-200 ${
                      isSelected
                        ? "bg-primary/40 border-2 border-primary shadow-[0_0_15px_hsl(var(--primary)/0.5)] z-10"
                        : "bg-transparent border border-transparent hover:bg-white/10 hover:border-white/20"
                    }`}
                    style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                  />
                );
              });
            })()}
          </div>
          {pitForm.autoStartPosition && (
            <p className="text-xs text-center text-primary font-body">Starting Position: <span className="font-bold">{pitForm.autoStartPosition}</span></p>
          )}
          <p className="text-[10px] text-center text-muted-foreground font-body">Tap a tile on the field to mark the starting position</p>
        </div>

        {/* Do you clear during Auto? */}
        <div className="space-y-3">
          <p className="text-sm font-body text-foreground font-medium">Do you clear during Auto?</p>
          <div className="flex flex-wrap gap-2">
            {["No", "Yes"].map((option, i) => (
              <button key={option} type="button" onClick={() => set("autoClear", option)}
                className={`px-4 py-2 rounded-lg text-sm font-body transition-all duration-200 border ${
                  pitForm.autoClear === option ? getOptionColor(i, 2) : "bg-muted border-border text-muted-foreground hover:border-accent/40 hover:text-foreground"
                }`}
              >{option}</button>
            ))}
          </div>
        </div>

        {/* Auto Description */}
        <div>
          <label className="block text-sm font-body font-medium text-foreground mb-2">What does your Auto do?</label>
          <textarea value={pitForm.autoDescription} onChange={(e) => set("autoDescription", e.target.value)}
            placeholder="e.g. First go for Spike 1, then go for Spike 2, then clear..." rows={3} className={inputCls + " resize-none"} />
        </div>
      </div>

      {/* Teleop */}
      <div className="glass rounded-xl p-6 border border-accent/20 space-y-4">
        <SectionHeader title="TELE-OP" icon="🎮" />
        <div>
          <label className="block text-sm font-body font-medium text-foreground mb-2">How do you perform during Teleop? What do you focus on?</label>
          <textarea value={pitForm.teleopFocus} onChange={(e) => set("teleopFocus", e.target.value)}
            placeholder="e.g. defense, cycling, motif..." rows={3} className={inputCls + " resize-none"} />
        </div>
        <ZoneButtons value={pitForm.teleopScoringZone} field="teleopScoringZone" />
      </div>

      {/* Endgame */}
      <div className="glass rounded-xl p-6 border border-accent/20 space-y-5">
        <SectionHeader title="ENDGAME" icon="🏁" />
        <div className="space-y-3">
          <p className="text-sm font-body text-foreground font-medium">Does your team do Motif, or focus on lots of Cycling in Endgame?</p>
          <div className="flex flex-wrap gap-2">
            {["Motif", "Cycling"].map((option, i) => (
              <button key={option} type="button" onClick={() => set("endgameStrategy", option)}
                className={`px-4 py-2 rounded-lg text-sm font-body transition-all duration-200 border ${
                  pitForm.endgameStrategy === option ? getOptionColor(i, 2) : "bg-muted border-border text-muted-foreground hover:border-accent/40 hover:text-foreground"
                }`}
              >{option}</button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-body text-foreground font-medium">Do you park in the Base Zone?</p>
          <div className="flex flex-wrap gap-2">
            {["No", "Partial", "Yes – Full Park"].map((option, i) => (
              <button key={option} type="button" onClick={() => set("endgameParking", option)}
                className={`px-4 py-2 rounded-lg text-sm font-body transition-all duration-200 border ${
                  pitForm.endgameParking === option ? getOptionColor(i, 3) : "bg-muted border-border text-muted-foreground hover:border-accent/40 hover:text-foreground"
                }`}
              >{option}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-body font-medium text-foreground mb-2">How do you park? Any Special Park Features?</label>
          <div className="flex flex-wrap gap-2">
            {["Climb", "Ramp", "Wheel Kickers", "Other"].map((opt) => (
              <button key={opt} type="button" onClick={() => set("endgameParkFeatures", pitForm.endgameParkFeatures === opt ? "" : opt)}
                className={`px-4 py-2.5 rounded-lg text-sm font-body font-semibold transition-all duration-200 border ${
                  pitForm.endgameParkFeatures === opt
                    ? "bg-accent/20 border-accent text-accent"
                    : "bg-muted border-border text-muted-foreground hover:border-accent/40 hover:text-foreground"
                }`}
              >{opt}</button>
            ))}
          </div>
          {pitForm.endgameParkFeatures === "Other" && (
            <input type="text" value={pitForm.endgameParkFeaturesOther} onChange={(e) => set("endgameParkFeaturesOther", e.target.value)}
              placeholder="Describe their park feature..." className={inputCls + " mt-3"} />
          )}
        </div>
      </div>

      {/* Submit */}
      <button type="submit" disabled={submitting || !pitForm.teamNumber}
        className="w-full py-4 rounded-xl bg-accent/20 border-2 border-accent/50 text-accent font-display font-bold text-lg tracking-widest hover:bg-accent/30 hover:border-accent transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {submitting ? "SUBMITTING..." : "🏗️ SUBMIT PIT SCOUT"}
      </button>
    </form>
  );
};


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

// ── Notify Drive Team Button ──────────────────────────────────────────────────
const NotifyDriveTeamButton = ({ scouterName }: { scouterName: string }) => {
  const [open, setOpen] = useState(false);
  const [customMsg, setCustomMsg] = useState("");
  const [sending, setSending] = useState(false);

  const sendNotification = async (message: string) => {
    setSending(true);
    // For now, store notifications in a toast + could be expanded to a DB table later
    toast.success(`Notification sent to Drive Team: "${message}"`, { duration: 5000 });
    setOpen(false);
    setCustomMsg("");
    setSending(false);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full py-3.5 rounded-xl border-2 border-blue-400/50 bg-blue-500/10 text-blue-400 font-display font-bold tracking-widest text-sm hover:bg-blue-500/20 hover:border-blue-400 transition-all duration-300 flex items-center justify-center gap-2"
      >
        📢 NOTIFY DRIVE TEAM
        <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && (
        <div className="glass rounded-xl p-5 border border-blue-400/30 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
          <p className="text-sm font-display tracking-wider text-blue-400">WHAT DO YOU NEED TO TELL DRIVE TEAM?</p>
          <div className="space-y-2">
            {[
              { label: "⚖️ Judges Just Came By Pit", msg: "Judges Just Came By Pit" },
              { label: "🔧 Need You In Pit", msg: "Need You In Pit" },
            ].map(({ label, msg }) => (
              <button
                key={msg}
                disabled={sending}
                onClick={() => sendNotification(`${msg} — from ${scouterName}`)}
                className="w-full py-3 rounded-lg bg-muted border border-border text-foreground font-body text-sm hover:border-blue-400/60 hover:bg-blue-500/10 transition-all text-left px-4 disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground font-body">Other:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all text-sm"
              />
              <button
                disabled={!customMsg.trim() || sending}
                onClick={() => sendNotification(`${customMsg.trim()} — from ${scouterName}`)}
                className="px-4 py-2.5 rounded-lg bg-blue-500/20 border border-blue-400/50 text-blue-400 font-display text-xs tracking-wider hover:bg-blue-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                SEND
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ScoutingForm = ({ scouterName, onLogout, userRole }: ScoutingFormProps) => {
  const { celebrating } = useCelebration();
  const [activeTab, setActiveTab] = useState<"dashboard" | "scouting" | "livestream" | "drivedata" | "scoutai" | "notify" | "rankings">("dashboard");
  const [scoutingMode, setScoutingMode] = useState<null | "pit" | "match">(null);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [assignments, setAssignments] = useState<{ team_number: string; team_name: string; qual_matches: string[] }[]>([]);
  const [selectedTeamIdx, setSelectedTeamIdx] = useState(0);
  const [entries, setEntries] = useState<ScoutingEntry[]>([]);
  const [allTeamNames, setAllTeamNames] = useState<Record<string, string>>({});
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [showCompositeInfo, setShowCompositeInfo] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const assignment = assignments[selectedTeamIdx] || null;

  const isBlueDriver = userRole === "bluedriver";

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
    const [{ data: rawEntries }, { data: assignmentData }, { data: allAssignments }] = await Promise.all([
      supabase.from("scouting_entries").select("*").order("timestamp", { ascending: true }),
      supabase.from("team_assignments").select("team_number, team_name, qual_matches").eq("scout_name", scouterName),
      supabase.from("team_assignments").select("team_number, team_name"),
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
        matchScore: row.match_score ?? null,
        allianceWon: row.alliance_won || "",
        timestamp: row.timestamp || "",
      })));
    }

    if (assignmentData && assignmentData.length > 0) {
      setAssignments(assignmentData.map(a => ({ team_number: a.team_number, team_name: a.team_name, qual_matches: a.qual_matches || [] })));
      setForm((prev) => ({ ...prev, teamNumber: assignmentData[0].team_number, teamName: assignmentData[0].team_name }));
    }

    if (allAssignments) {
      const nameMap: Record<string, string> = {};
      allAssignments.forEach(a => { if (a.team_name) nameMap[a.team_number] = a.team_name; });
      setAllTeamNames(nameMap);
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
        goodMatchResponses: teamEntries
          .filter((e) => e.goodMatch?.trim())
          .map((e) => ({ scouter: "Scouter", response: e.goodMatch })),
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
    
    if (!form.teleopCycleSpeed) missingFields.push("Cycle Speed (Teleop)");
    
    if (!form.endgameParking) missingFields.push("Parking (Endgame)");
    
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
      special_features: [
        form.specialFeatures ? `[Auto Notes] ${form.specialFeatures}` : "",
        form.autoBallsScored ? `[Auto Balls] ${form.autoBallsScored}` : "",
        form.teleopBallsScored ? `[Teleop Balls] ${form.teleopBallsScored}` : "",
        form.endgameParkFeatures ? `[Park Feature] ${form.endgameParkFeatures === "Other" ? form.endgameParkFeaturesOther || "Other" : form.endgameParkFeatures}` : "",
        form.pitScoutMatch ? `[Pit Scout Match] ${form.pitScoutMatch}${form.pitScoutMatchElaborate ? `: ${form.pitScoutMatchElaborate}` : ""}` : "",
      ].filter(Boolean).join(" | ") || null,
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
              userRole === "driveteam" ? "hsl(220 80% 65%)" :
              "hsl(var(--muted-foreground))"
            }}>
              {userRole === "bluedriver" ? "Blue Drive Data Collector" :
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
            { id: "rankings", label: "RANKINGS", icon: "🏆", activeClass: "bg-amber-500/20 text-amber-400 border border-amber-500/40" },
            { id: "scouting", label: "SCOUTING FORM", icon: "📋", activeClass: "bg-accent/20 text-accent border border-accent/40" },
            { id: "notify", label: "NOTIFY DRIVE TEAM", icon: "📢", activeClass: "bg-blue-500/20 text-blue-400 border border-blue-500/40" },
            { id: "livestream", label: "LIVE STREAM", icon: "🔴", activeClass: "bg-red-500/20 text-red-400 border border-red-500/40" },
            { id: "drivedata", label: "DRIVE DATA", icon: "🔵", activeClass: "bg-blue-500/20 text-blue-400 border border-blue-500/40" },
            { id: "scoutai", label: "SCOUT AI", icon: "🤖", activeClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" },
          ]}
          activeTab={activeTab}
          onTabChange={(id) => {
            setActiveTab(id as typeof activeTab);
            if (id !== "scouting") setScoutingMode(null);
          }}
          actions={[
            { id: "refresh", label: "REFRESH", icon: "↻", onClick: fetchData },
            { id: "logout", label: "LOGOUT", icon: "🚪", className: "text-destructive hover:text-destructive", onClick: onLogout },
          ]}
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
                          <p className="font-display text-sm text-foreground">{allTeamNames[team.teamNumber] ? `${allTeamNames[team.teamNumber]} ` : ""}#{team.teamNumber}</p>
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

          {/* Blue Drive Team */}
          <div className="glass rounded-xl overflow-hidden border border-blue-400/40">
            <div className="px-5 py-3.5 border-b border-blue-400/30" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(37,99,235,0.06))" }}>
              <h3 className="font-display text-sm tracking-wider" style={{ color: "#60a5fa", textShadow: "0 0 8px rgba(96,165,250,0.5)" }}>BLUE DRIVE TEAM</h3>
            </div>
            <div className="divide-y divide-blue-400/20">
              {[
                { name: "Max Tran", role: "Driver 1 / Human Player" },
                { name: "Cole Schubert", role: "Driver 1 / Human Player" },
                { name: "Benjamin Hale", role: "Driver 2 (Aux)" },
                { name: "Michael Xie", role: "Drive Coach" },
                { name: "Travis Quinn", role: "Build Assistance / Human Player Sub" },
              ].map(({ name, role }, idx) => (
                <div key={`${name}-${idx}`} className="px-5 py-2.5 flex items-center justify-between">
                  <span className="font-body text-sm" style={{ color: "#60a5fa" }}>{name}</span>
                  <span className="text-xs font-display tracking-wider text-blue-400">{role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Coaches */}
          <div className="glass rounded-xl overflow-hidden border border-amber-400/30">
            <div className="px-5 py-3.5 border-b border-amber-400/20 flex items-center gap-3" style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.08), rgba(245,158,11,0.04))" }}>
              <span className="text-lg">🎓</span>
              <h3 className="font-display text-sm tracking-wider text-amber-400" style={{ textShadow: "0 0 8px rgba(251,191,36,0.4)" }}>COACHES</h3>
            </div>
            <div className="divide-y divide-amber-400/10">
              {[
                { name: "Mrs. Trujillo", program: "FRC" },
                { name: "Aiden Rubbo", program: "FRC" },
                { name: "Mr. Trujillo", program: "FTC" },
                { name: "Devin Allen", program: "FTC" },
              ].map(({ name, program }) => (
                <div key={name} className="px-5 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-amber-400/60 text-xs">★</span>
                    <span className="font-body text-sm text-amber-100">{name}</span>
                  </div>
                  <span className="text-xs font-display tracking-wider text-amber-400/70">{program}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notify Drive Team */}
          <NotifyDriveTeamButton scouterName={scouterName} />
        </div>
      )}

      {/* ══ RANKINGS TAB ══ */}
      {activeTab === "rankings" && (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
          <h2 className="font-display text-lg text-primary tracking-wider text-glow">🏆 TEAM RANKINGS</h2>
          {loadingData ? (
            <div className="glass rounded-xl p-12 text-center">
              <p className="text-4xl mb-4 animate-pulse">📡</p>
              <p className="text-muted-foreground font-body">Loading scouting data...</p>
            </div>
          ) : teamSummaries.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <p className="text-4xl mb-4">📭</p>
              <p className="text-muted-foreground font-body">No scouting data yet. Teams will appear here once scouts submit data.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground font-body">
                  {teamSummaries.length} team{teamSummaries.length !== 1 ? "s" : ""} scouted • Ranked by <span className="underline">composite score</span>
                </p>
                <button
                  onClick={() => setShowCompositeInfo(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="What is composite score?"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              {showCompositeInfo && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowCompositeInfo(false)}>
                  <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-heading font-bold text-foreground">Composite Score</h3>
                      <button onClick={() => setShowCompositeInfo(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="text-sm text-muted-foreground font-body space-y-2">
                      <p>The <strong className="text-foreground">composite score</strong> is a custom performance rating calculated from scouting data using a weighted formula:</p>
                      <p><strong className="text-foreground">Auto (up to ~48 pts):</strong> Artifacts scored (up to 15), pattern alignment (15), launch line (5), leave (3), consistency (10).</p>
                      <p><strong className="text-foreground">Teleop (up to ~46 pts):</strong> Shooting accuracy (10), gate interaction (10), cycle speed (10), artifact classification (8), ball capacity (8).</p>
                      <p><strong className="text-foreground">Endgame:</strong> Parking (up to 10 pts).</p>
                      <p><strong className="text-foreground">Penalties:</strong> Deducts 5 pts per penalty.</p>
                      <p>Teams are ranked by their <strong className="text-foreground">average composite score</strong> across all matches.</p>
                    </div>
                  </div>
                </div>
              )}

              {teamSummaries.map((team, index) => {
                const rank = index + 1;
                const isExpanded = expandedTeam === team.teamNumber;
                const teamName = allTeamNames[team.teamNumber];

                return (
                  <div
                    key={team.teamNumber}
                    className={`glass rounded-xl overflow-hidden transition-all duration-300 ${rank <= 3 ? "glow-primary" : ""}`}
                  >
                    <button
                      onClick={() => setExpandedTeam(isExpanded ? null : team.teamNumber)}
                      className="w-full px-6 py-5 flex items-center gap-4 text-left hover:bg-muted/30 transition-colors"
                    >
                      <div className={`text-2xl font-display font-bold min-w-12 w-12 shrink-0 text-center ${rank === 1 ? "text-yellow-400" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {getRankIcon(rank)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-3 flex-wrap">
                          <span className="font-display text-lg text-foreground tracking-wider">
                            {teamName ? `${teamName} ` : ""}#{team.teamNumber}
                          </span>
                          <span className="text-xs text-muted-foreground font-body">
                            {team.entries.length} match{team.entries.length !== 1 ? "es" : ""} scouted
                          </span>
                        </div>
                        {team.goodMatchResponses.length > 0 && (
                          <p className="text-sm text-primary font-body mt-1 truncate">
                            💬 "{team.goodMatchResponses[0].response}"
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-display text-xl text-primary text-glow">{Math.round(team.avgScore)}</p>
                        <p className="text-xs text-muted-foreground font-body">pts avg</p>
                      </div>
                      <span className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                    </button>

                    {isExpanded && (
                      <div className="px-6 pb-6 space-y-6 border-t border-border/50">
                        {team.goodMatchResponses.length > 0 && (
                          <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/30">
                            <h4 className="font-display text-sm text-primary tracking-wider mb-3">
                              🌟 "DO YOU THINK THIS TEAM WILL BE A GOOD MATCH FOR US?"
                            </h4>
                            <div className="space-y-2">
                              {team.goodMatchResponses.map((r, i) => (
                                <div key={i} className="flex gap-2">
                                  <span className="text-xs text-muted-foreground font-body shrink-0">Scouter:</span>
                                  <p className="text-sm text-foreground font-body">{r.response}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {team.entries.map((entry, i) => (
                          <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
                            <div>
                              <span className="font-display text-sm text-foreground tracking-wider">
                                Match {entry.matchNumber || "N/A"} • Score: {scoreEntry(entry)}
                                {entry.matchScore != null ? (
                                  <span className="ml-2 text-primary/80">· Solo: ~{entry.matchScore}</span>
                                ) : null}
                                {entry.allianceWon ? (
                                  <span className={`ml-2 text-xs ${entry.allianceWon === "Yes – Won" ? "text-green-400" : entry.allianceWon === "No – Lost" ? "text-destructive" : "text-muted-foreground"}`}>
                                    {entry.allianceWon === "Yes – Won" ? "🏆 Won" : entry.allianceWon === "No – Lost" ? "❌ Lost" : "🤝 Tie"}
                                  </span>
                                ) : null}
                              </span>
                              <p className="text-xs text-muted-foreground font-body mt-0.5">
                                🧑‍💻 Scouted by <span className="text-foreground">Scouter</span> • {new Date(entry.timestamp).toLocaleDateString()}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-body">
                              <div className="bg-background/50 rounded px-2 py-1.5"><span className="text-muted-foreground">Auto Artifacts: </span><span className="text-foreground">{entry.autoArtifactsScored || "—"}</span></div>
                              <div className="bg-background/50 rounded px-2 py-1.5"><span className="text-muted-foreground">Auto Pattern: </span><span className="text-foreground">{entry.autoPatternAlignment || "—"}</span></div>
                              <div className="bg-background/50 rounded px-2 py-1.5"><span className="text-muted-foreground">Launch Line: </span><span className="text-foreground">{entry.autoLaunchLine || "—"}</span></div>
                              <div className="bg-background/50 rounded px-2 py-1.5"><span className="text-muted-foreground">Auto Leave: </span><span className="text-foreground">{entry.autoLeave || "—"}</span></div>
                              <div className="bg-background/50 rounded px-2 py-1.5"><span className="text-muted-foreground">Auto Consistency: </span><span className="text-foreground">{entry.autoConsistency || "—"}</span></div>
                              <div className="bg-background/50 rounded px-2 py-1.5"><span className="text-muted-foreground">Intake: </span><span className="text-foreground">{entry.teleopIntakeMethod || "—"}</span></div>
                              <div className="bg-background/50 rounded px-2 py-1.5"><span className="text-muted-foreground">Ball Capacity: </span><span className="text-foreground">{entry.teleopBallCapacity || "—"}</span></div>
                              <div className="bg-background/50 rounded px-2 py-1.5"><span className="text-muted-foreground">Shooting: </span><span className="text-foreground">{entry.teleopShootingAccuracy || "—"}</span></div>
                              <div className="bg-background/50 rounded px-2 py-1.5"><span className="text-muted-foreground">Gate: </span><span className="text-foreground">{entry.teleopGateInteraction || "—"}</span></div>
                              <div className="bg-background/50 rounded px-2 py-1.5"><span className="text-muted-foreground">Overflow: </span><span className="text-foreground">{entry.teleopOverflowManagement || "—"}</span></div>
                              <div className="bg-background/50 rounded px-2 py-1.5"><span className="text-muted-foreground">Cycle Speed: </span><span className="text-foreground">{entry.teleopCycleSpeed || "—"}</span></div>
                              <div className="bg-background/50 rounded px-2 py-1.5"><span className="text-muted-foreground">Classification: </span><span className="text-foreground">{entry.teleopArtifactClassification || "—"}</span></div>
                              <div className="bg-background/50 rounded px-2 py-1.5"><span className="text-muted-foreground">Parking: </span><span className="text-foreground">{entry.endgameParking || "—"}</span></div>
                              <div className="bg-background/50 rounded px-2 py-1.5"><span className="text-muted-foreground">Alliance Assist: </span><span className="text-foreground">{entry.endgameAllianceAssist || "—"}</span></div>
                            </div>

                            {(entry.penalties || []).length > 0 && (
                              <div>
                                <span className="text-xs text-muted-foreground font-body">Penalties: </span>
                                {(entry.penalties || []).map((p, j) => (
                                  <span key={j} className={`inline-block text-xs px-2 py-0.5 rounded mr-1 mt-1 ${
                                    p === "None observed" ? "bg-green-500/20 text-green-400" : "bg-destructive/20 text-destructive"
                                  }`}>{p}</span>
                                ))}
                              </div>
                            )}

                            {entry.specialFeatures && (
                              <div>
                                <span className="text-xs text-muted-foreground font-body">Notes: </span>
                                <span className="text-xs text-foreground font-body">{entry.specialFeatures}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
      {activeTab === "scouting" && scoutingMode === null && (
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center justify-center" style={{ minHeight: "60vh" }}>
          <div className="glass rounded-2xl p-8 border border-primary/30 glow-primary text-center space-y-6 max-w-md w-full">
            <span className="text-5xl block">📋</span>
            <h2 className="font-display text-2xl text-primary text-glow tracking-wider">SCOUTING TYPE</h2>
            <p className="text-sm text-muted-foreground font-body">What type of scouting are you doing?</p>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setScoutingMode("pit")}
                className="w-full py-5 rounded-xl bg-accent/20 border-2 border-accent/50 text-accent font-display font-bold text-lg tracking-widest hover:bg-accent/30 hover:border-accent transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                🏗️ PIT SCOUT
              </button>
              <button
                onClick={() => setScoutingMode("match")}
                className="w-full py-5 rounded-xl bg-primary/20 border-2 border-primary/50 text-primary font-display font-bold text-lg tracking-widest hover:bg-primary/30 hover:border-primary transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                🎯 MATCH SCOUT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PIT SCOUTING FORM ══ */}
      {activeTab === "scouting" && scoutingMode === "pit" && (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => setScoutingMode(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-display tracking-wider border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all duration-200"
            >
              ← BACK
            </button>
            <h2 className="font-display text-lg text-accent tracking-wider">🏗️ PIT SCOUTING</h2>
          </div>

          <PitScoutForm scouterName={scouterName} />
        </div>
      )}

      {/* ══ MATCH SCOUTING FORM ══ */}
      {activeTab === "scouting" && scoutingMode === "match" && (
        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={() => setScoutingMode(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-display tracking-wider border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all duration-200"
            >
              ← BACK
            </button>
            <h2 className="font-display text-lg text-primary tracking-wider">🎯 MATCH SCOUTING</h2>
          </div>

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
            <div>
              <label className="block text-sm font-body font-medium text-foreground mb-2">How many artifacts did they score in Autonomous? *</label>
              <input
                type="number"
                min="0"
                value={form.autoArtifactsScored}
                onChange={(e) => handleChange("autoArtifactsScored", e.target.value)}
                placeholder="e.g. 3"
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all"
              />
            </div>
            <MCQuestion label="Did they achieve pattern alignment in Autonomous?" name="autoPatternAlignment" options={["None", "1 Pattern", "2 Patterns", "3+ Patterns"]} value={form.autoPatternAlignment} onChange={handleChange} />
            <MCQuestion label="Did their robot cross the Launch Line?" name="autoLaunchLine" options={["No", "Yes"]} value={form.autoLaunchLine} onChange={handleChange} />
            <MCQuestion label="Did they leave at the end of Autonomous?" name="autoLeave" options={["No", "Yes"]} value={form.autoLeave} onChange={handleChange} />
            <MCQuestion label="How consistent was their Autonomous routine?" name="autoConsistency" options={["No Auto", "Inconsistent", "Mostly Consistent", "Very Consistent"]} value={form.autoConsistency} onChange={handleChange} />
            <div>
              <label className="block text-sm font-body font-medium text-foreground mb-2">How many balls did the Team score individually? (Auto)</label>
              <input
                type="number"
                min="0"
                value={form.autoBallsScored}
                onChange={(e) => handleChange("autoBallsScored", e.target.value)}
                placeholder="e.g. 4"
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-body font-medium text-foreground mb-2">Additional Notes (Auto)</label>
              <textarea
                value={form.specialFeatures}
                onChange={(e) => handleChange("specialFeatures", e.target.value)}
                placeholder="e.g. Is this Team Consistent? Any other details?"
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Teleop */}
          <div className="glass rounded-xl p-6 border-glow space-y-5">
            <SectionHeader title="TELE-OP" icon="🎮" />
            <MCQuestion label="What intake method did they use?" name="teleopIntakeMethod" options={["No Intake", "Pushing", "Floor Intake", "Both"]} value={form.teleopIntakeMethod} onChange={handleChange} />
            <MCQuestion label="How many balls can their robot hold at once?" name="teleopBallCapacity" options={["1", "2", "3"]} value={form.teleopBallCapacity} onChange={handleChange} />
            <MCQuestion label="How accurate was their shooting?" name="teleopShootingAccuracy" options={["No Shooting", "Inaccurate", "Somewhat Accurate", "Very Accurate"]} value={form.teleopShootingAccuracy} onChange={handleChange} />
            <MCQuestion label="Did they interact with the Gate?" name="teleopGateInteraction" options={["Did Not Attempt", "Tried But Failed", "Sometimes", "Opened Reliably"]} value={form.teleopGateInteraction} onChange={handleChange} />
            
            <div className="space-y-3">
              <p className="text-sm font-body text-foreground font-medium">How fast were their scoring cycles?</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Very Slow (10-12s)", value: "Very Slow", color: "bg-red-500/20 border-red-500 text-red-400" },
                  { label: "Slow (8-10s)", value: "Slow", color: "bg-orange-500/20 border-orange-500 text-orange-400" },
                  { label: "Fast (5-7s)", value: "Fast", color: "bg-yellow-500/20 border-yellow-500 text-yellow-400" },
                  { label: "Very Fast (3-5s)", value: "Very Fast", color: "bg-green-500/20 border-green-500 text-green-400" },
                ].map((option) => (
                  <button key={option.value} type="button" onClick={() => handleChange("teleopCycleSpeed", option.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-body transition-all duration-200 border ${
                      form.teleopCycleSpeed === option.value
                        ? option.color
                        : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >{option.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-body font-medium text-foreground mb-2">How many balls did the Team score individually? (Teleop)</label>
              <input
                type="number"
                min="0"
                value={form.teleopBallsScored}
                onChange={(e) => handleChange("teleopBallsScored", e.target.value)}
                placeholder="e.g. 8"
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all"
              />
            </div>
          </div>

          {/* Endgame */}
          <div className="glass rounded-xl p-6 border-glow space-y-5">
            <SectionHeader title="ENDGAME" icon="🏁" />
            <MCQuestion label="Did they park in the Base Zone?" name="endgameParking" options={["No", "Partial", "Yes – Full Park"]} value={form.endgameParking} onChange={handleChange} />
            <div>
              <label className="block text-sm font-body font-medium text-foreground mb-2">Does This Team Have Any Special Park Features?</label>
              <div className="flex flex-wrap gap-2">
                {["Climb", "Ramp", "Wheel Kickers", "Other"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleChange("endgameParkFeatures", form.endgameParkFeatures === opt ? "" : opt)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-body font-semibold transition-all duration-200 border ${
                      form.endgameParkFeatures === opt
                        ? "bg-primary/20 border-primary text-primary glow-primary"
                        : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {form.endgameParkFeatures === "Other" && (
                <input
                  type="text"
                  value={form.endgameParkFeaturesOther}
                  onChange={(e) => handleChange("endgameParkFeaturesOther", e.target.value)}
                  placeholder="Describe their park feature..."
                  className="w-full mt-3 px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all"
                />
              )}
            </div>
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
            <div className="space-y-3">
              <p className="text-sm font-body text-foreground font-medium">Does this team perform as they said they would in your Pit Scout?</p>
              <div className="flex flex-wrap gap-3">
                {["Yes", "No"].map((option) => (
                  <button key={option} type="button" onClick={() => handleChange("pitScoutMatch", option)}
                    className={`px-5 py-2.5 rounded-lg text-sm font-body font-semibold transition-all duration-200 border ${
                      form.pitScoutMatch === option
                        ? option === "Yes" ? "bg-green-500/20 border-green-500 text-green-400" : "bg-destructive/20 border-destructive text-destructive"
                        : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}>
                    {option === "Yes" ? "✅ " : "❌ "}{option}
                  </button>
                ))}
              </div>
              <textarea
                value={form.pitScoutMatchElaborate}
                onChange={(e) => handleChange("pitScoutMatchElaborate", e.target.value)}
                placeholder="e.g. Elaborate"
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all resize-none"
              />
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
          {isBlueDriver ? (
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

      {/* ── NOTIFY DRIVE TEAM TAB ── */}
      {activeTab === "notify" && (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
          <div className="glass rounded-xl p-6 border border-blue-500/30">
            <h2 className="font-display text-lg tracking-wider text-blue-400 mb-1">NOTIFY DRIVE TEAM</h2>
            <p className="text-xs text-muted-foreground font-body">Send a quick message to all drive team members</p>
          </div>
          <NotifyDriveTeamButton scouterName={scouterName} />
        </div>
      )}

      {/* ── SCOUT AI TAB ── */}
      {activeTab === "scoutai" && (
        <div className="max-w-7xl mx-auto px-4 py-8" style={{ height: "calc(100vh - 200px)" }}>
          <AIChatBot
            onBack={() => setActiveTab("dashboard")}
            userName={scouterName}
            backLabel="← Dashboard"
          />
        </div>
      )}
    </div>
  );
};

export default ScoutingForm;
