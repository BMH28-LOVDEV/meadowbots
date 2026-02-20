import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ScoutingFormProps {
  scouterName: string;
  onLogout: () => void;
}

interface FormData {
  teamNumber: string;
  teamName: string;
  matchNumber: string;
  // Autonomous
  autoArtifactsScored: string;
  autoPatternAlignment: string;
  autoLaunchLine: string;
  autoLeave: string;
  autoConsistency: string;
  // Teleop
  teleopIntakeMethod: string;
  teleopBallCapacity: string;
  teleopShootingAccuracy: string;
  teleopGateInteraction: string;
  teleopOverflowManagement: string;
  teleopCycleSpeed: string;
  teleopArtifactClassification: string;
  // Endgame
  endgameParking: string;
  endgameAllianceAssist: string;
  // Penalties
  penalties: string[];
  cards: string[];
  penaltyPointsGiven: string;
  // Match result
  matchScore: string;
  allianceWon: string;
  // Notes
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
  "None observed",
];

const CARD_OPTIONS = ["Yellow Card", "Red Card"];

const INITIAL_FORM: FormData = {
  teamNumber: "",
  teamName: "",
  matchNumber: "",
  autoArtifactsScored: "",
  autoPatternAlignment: "",
  autoLaunchLine: "",
  autoLeave: "",
  autoConsistency: "",
  teleopIntakeMethod: "",
  teleopBallCapacity: "",
  teleopShootingAccuracy: "",
  teleopGateInteraction: "",
  teleopOverflowManagement: "",
  teleopCycleSpeed: "",
  teleopArtifactClassification: "",
  endgameParking: "",
  endgameAllianceAssist: "",
  penalties: [],
  cards: [],
  penaltyPointsGiven: "",
  matchScore: "",
  allianceWon: "",
  specialFeatures: "",
  goodMatch: "",
};

interface MCQuestionProps {
  label: string;
  name: keyof FormData;
  options: string[];
  value: string;
  onChange: (name: keyof FormData, value: string) => void;
}

const MCQuestion = ({ label, name, options, value, onChange }: MCQuestionProps) => (
  <div className="space-y-3">
    <p className="text-sm font-body text-foreground font-medium">{label}</p>
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(name, option)}
          className={`px-4 py-2 rounded-lg text-sm font-body transition-all duration-200 border ${
            value === option
              ? "bg-primary/20 border-primary text-primary glow-primary"
              : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}
        >
          {option}
        </button>
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

const ScoutingForm = ({ scouterName, onLogout }: ScoutingFormProps) => {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [assignment, setAssignment] = useState<{ team_number: string; team_name: string; qual_matches: string[] } | null>(null);
  const [completedMatches, setCompletedMatches] = useState<string[]>([]);

  const fetchAssignmentAndProgress = async () => {
    const [{ data: assignmentData }, { data: entriesData }] = await Promise.all([
      supabase
        .from("team_assignments")
        .select("team_number, team_name, qual_matches")
        .eq("scout_name", scouterName)
        .maybeSingle(),
      supabase
        .from("scouting_entries")
        .select("match_number, team_number")
        .eq("scouter_name", scouterName),
    ]);

    if (assignmentData) {
      setAssignment({ team_number: assignmentData.team_number, team_name: assignmentData.team_name, qual_matches: assignmentData.qual_matches || [] });
      setForm((prev) => ({ ...prev, teamNumber: assignmentData.team_number, teamName: assignmentData.team_name }));

      if (entriesData) {
        const done = entriesData
          .filter((e) => e.team_number === assignmentData.team_number && e.match_number)
          .map((e) => e.match_number!.toUpperCase());
        setCompletedMatches(done);
      }
    }
  };

  useEffect(() => {
    fetchAssignmentAndProgress();
  }, [scouterName]);

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
        duration: 5000,
        position: "top-center",
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

    // Add the submitted match to completed list immediately
    if (form.matchNumber) {
      setCompletedMatches((prev) => [...prev, form.matchNumber.toUpperCase()]);
    }

    toast.success(`Solo: ~${form.matchScore || "N/A"}`);
    setForm((prev) => ({
      ...INITIAL_FORM,
      teamNumber: assignment?.team_number || "",
      teamName: assignment?.team_name || "",
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/3 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl text-primary text-glow tracking-wider">
              MEADOWBOTS <span className="text-primary">#14841</span>
            </h1>
            <p className="text-xs text-muted-foreground font-body">DECODE Scouting Form</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground font-body hidden sm:block">
              Scout: <span className="text-foreground">{scouterName}</span>
            </span>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-lg text-xs font-display tracking-wider border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-all duration-200"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Assignment Banner */}
        {assignment && (
          <div className="glass rounded-xl p-4 border border-primary/40 glow-primary">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-0.5">Your Assigned Team</p>
                <p className="font-display text-lg text-primary tracking-wider">
                  {assignment.team_name ? (
                    <>
                      {assignment.team_name}{" "}
                      <span className="text-foreground/60 text-base">#{assignment.team_number}</span>
                    </>
                  ) : (
                    <>Team #{assignment.team_number}</>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Team Info */}
        <div className="glass rounded-xl p-6 glow-primary space-y-4">
          <SectionHeader title="TEAM INFO" icon="🤖" />

          <div>
            <label className="block text-sm text-muted-foreground font-body mb-1">Official Team Name</label>
            <input
              type="text"
              value={form.teamName}
              onChange={(e) => handleChange("teamName", e.target.value)}
              placeholder="e.g. The Cheesy Poofs"
              className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground font-body mb-1">Team Number *</label>
              <input
                type="text"
                value={form.teamNumber}
                onChange={(e) => handleChange("teamNumber", e.target.value)}
                placeholder="e.g. 14841"
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground font-body mb-1">Match Number</label>
              {assignment && assignment.qual_matches.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {assignment.qual_matches.map((match) => {
                    const isDone = completedMatches.includes(match.toUpperCase());
                    const isSelected = form.matchNumber === match;
                    return (
                      <button
                        key={match}
                        type="button"
                        disabled={isDone}
                        onClick={() => !isDone && handleChange("matchNumber", isSelected ? "" : match)}
                        className={`px-4 py-2 rounded-lg text-sm font-body font-semibold transition-all duration-200 border ${
                          isDone
                            ? "bg-green-500/20 border-green-500/60 text-green-400 cursor-not-allowed opacity-80"
                            : isSelected
                            ? "bg-primary/20 border-primary text-primary glow-primary"
                            : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {isDone ? "✓ " : ""}{match}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  type="text"
                  value={form.matchNumber}
                  onChange={(e) => handleChange("matchNumber", e.target.value)}
                  placeholder="e.g. Q5"
                  className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all"
                />
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
          <MCQuestion label="Did they leave (move from the depot line) at the end of Autonomous?" name="autoLeave" options={["No", "Yes"]} value={form.autoLeave} onChange={handleChange} />
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
          <MCQuestion label="Did they classify artifacts (purple vs green) correctly?" name="teleopArtifactClassification" options={["No Classification", "Rarely", "Mostly", "Always"]} value={form.teleopArtifactClassification} onChange={handleChange} />
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
              <button
                key={penalty}
                type="button"
                onClick={() => {
                  setForm((prev) => {
                    const has = prev.penalties.includes(penalty);
                    if (penalty === "None observed") {
                      return { ...prev, penalties: has ? [] : ["None observed"] };
                    }
                    const withoutNone = prev.penalties.filter((p) => p !== "None observed");
                    return {
                      ...prev,
                      penalties: has ? withoutNone.filter((p) => p !== penalty) : [...withoutNone, penalty],
                    };
                  });
                }}
                className={`px-4 py-2 rounded-lg text-sm font-body transition-all duration-200 border ${
                  (form.penalties || []).includes(penalty)
                    ? penalty === "None observed"
                      ? "bg-glow-success/20 border-glow-success text-glow-success"
                      : "bg-destructive/20 border-destructive text-destructive"
                    : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {penalty}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Major Cards */}
          <div className="space-y-3">
            <p className="text-sm font-body text-foreground font-medium">Major Cards Issued</p>
            <div className="flex flex-wrap gap-3">
              {CARD_OPTIONS.map((card) => {
                const isSelected = (form.cards || []).includes(card);
                const isYellow = card === "Yellow Card";
                return (
                  <button
                    key={card}
                    type="button"
                    onClick={() => {
                      setForm((prev) => {
                        const has = prev.cards.includes(card);
                        return { ...prev, cards: has ? prev.cards.filter((c) => c !== card) : [...prev.cards, card] };
                      });
                    }}
                    className={`px-5 py-2.5 rounded-lg text-sm font-body font-semibold transition-all duration-200 border ${
                      isSelected
                        ? isYellow
                          ? "bg-yellow-400/20 border-yellow-400 text-yellow-400 shadow-[0_0_12px_2px_rgba(250,204,21,0.4)]"
                          : "bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_12px_2px_rgba(239,68,68,0.45)]"
                        : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {isYellow ? "🟨" : "🟥"} {card}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Penalty Points Given */}
          <div className="space-y-2">
            <label className="block text-sm font-body text-foreground font-medium">
              How many penalty points did this team give to the opposing alliance?
            </label>
            <input
              type="number"
              min="0"
              value={form.penaltyPointsGiven}
              onChange={(e) => handleChange("penaltyPointsGiven", e.target.value)}
              placeholder="e.g. 10"
              className="w-full sm:w-48 px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all"
            />
          </div>
        </div>

        {/* Match Result */}
        <div className="glass rounded-xl p-6 border-glow space-y-5">
          <SectionHeader title="MATCH RESULT" icon="🏆" />

          {/* Match Score */}
          <div className="space-y-2">
            <label className="block text-sm font-body text-foreground font-medium">
              What was the final score of the alliance you were scouting?
            </label>
            <input
              type="number"
              min="0"
              value={form.matchScore}
              onChange={(e) => handleChange("matchScore", e.target.value)}
              placeholder="e.g. 85"
              className="w-full sm:w-48 px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all"
            />
          </div>

          {/* Alliance Won */}
          <div className="space-y-3">
            <p className="text-sm font-body text-foreground font-medium">
              Did the alliance / team you are scouting win the match?
            </p>
            <div className="flex flex-wrap gap-3">
              {["Yes – Won", "No – Lost", "Tie"].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleChange("allianceWon", option)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-body font-semibold transition-all duration-200 border ${
                    form.allianceWon === option
                      ? option === "Yes – Won"
                        ? "bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_12px_2px_rgba(34,197,94,0.3)]"
                        : option === "No – Lost"
                        ? "bg-destructive/20 border-destructive text-destructive"
                        : "bg-primary/20 border-primary text-primary"
                      : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {option === "Yes – Won" ? "🏆 " : option === "No – Lost" ? "❌ " : "🤝 "}{option}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Short Answers / Notes */}
        <div className="glass rounded-xl p-6 glow-primary space-y-6">
          <SectionHeader title="NOTES" icon="📝" />
          <div className="space-y-2">
            <label className="block text-sm font-body text-foreground font-medium">
              What special features or strategies did you notice about this team?
            </label>
            <textarea
              value={form.specialFeatures}
              onChange={(e) => handleChange("specialFeatures", e.target.value)}
              rows={3}
              placeholder="e.g. They had a unique dual-flywheel launcher, very fast cycles..."
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-body text-foreground font-bold text-lg">
              Do you think this team will be a good match for us?
            </label>
            <textarea
              value={form.goodMatch}
              onChange={(e) => handleChange("goodMatch", e.target.value)}
              rows={3}
              placeholder="Yes / No and why..."
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg tracking-widest hover:glow-primary-strong transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "SAVING..." : "SUBMIT SCOUTING DATA"}
        </button>

        <p className="text-center text-muted-foreground/30 text-xs font-body pb-8">
          Data synced to Lovable Cloud • FTC DECODE™ 2025–2026
        </p>
      </form>
    </div>
  );
};

export default ScoutingForm;
