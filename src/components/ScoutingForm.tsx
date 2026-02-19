import { useState } from "react";
import { toast } from "sonner";

interface ScoutingFormProps {
  scouterName: string;
  onLogout: () => void;
}

interface FormData {
  teamNumber: string;
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
  // Short answers
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
  "Robot exceeded 18\" size limit",
  "Unsafe robot behavior",
  "Delay of game",
  "None observed",
];

const INITIAL_FORM: FormData = {
  teamNumber: "",
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

  const handleChange = (name: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.teamNumber) {
      toast.error("Please enter the team number!");
      return;
    }
    // Store locally
    const existing = JSON.parse(localStorage.getItem("scoutingData") || "[]");
    existing.push({ ...form, scouterName, timestamp: new Date().toISOString() });
    localStorage.setItem("scoutingData", JSON.stringify(existing));
    toast.success(`Scouting data for Team ${form.teamNumber} saved!`);
    setForm(INITIAL_FORM);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Ambient effects */}
      <div className="fixed top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/3 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl text-primary text-glow tracking-wider">
              MEADOWBOTS <span className="text-foreground/60">#14841</span>
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
        {/* Team Info */}
        <div className="glass rounded-xl p-6 glow-primary space-y-4">
          <SectionHeader title="TEAM INFO" icon="🤖" />
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
              <input
                type="text"
                value={form.matchNumber}
                onChange={(e) => handleChange("matchNumber", e.target.value)}
                placeholder="e.g. Q5"
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Autonomous */}
        <div className="glass rounded-xl p-6 border-glow space-y-5">
          <SectionHeader title="AUTONOMOUS" icon="⚡" />
          <MCQuestion
            label="How many artifacts did they score in Autonomous?"
            name="autoArtifactsScored"
            options={["0", "1-2", "3-4", "5+"]}
            value={form.autoArtifactsScored}
            onChange={handleChange}
          />
          <MCQuestion
            label="Did they achieve pattern alignment in Autonomous?"
            name="autoPatternAlignment"
            options={["None", "1 Pattern", "2 Patterns", "3+ Patterns"]}
            value={form.autoPatternAlignment}
            onChange={handleChange}
          />
          <MCQuestion
            label="Did their robot cross the Launch Line?"
            name="autoLaunchLine"
            options={["Yes", "No"]}
            value={form.autoLaunchLine}
            onChange={handleChange}
          />
          <MCQuestion
            label="Did they leave (move from the depot line) at the end of Autonomous?"
            name="autoLeave"
            options={["Yes", "No"]}
            value={form.autoLeave}
            onChange={handleChange}
          />
          <MCQuestion
            label="How consistent was their Autonomous routine?"
            name="autoConsistency"
            options={["Very Consistent", "Mostly Consistent", "Inconsistent", "No Auto"]}
            value={form.autoConsistency}
            onChange={handleChange}
          />
        </div>

        {/* Teleop */}
        <div className="glass rounded-xl p-6 border-glow space-y-5">
          <SectionHeader title="TELE-OP" icon="🎮" />
          <MCQuestion
            label="What intake method did they use?"
            name="teleopIntakeMethod"
            options={["Floor Intake", "Pushing", "Both", "No Intake"]}
            value={form.teleopIntakeMethod}
            onChange={handleChange}
          />
          <MCQuestion
            label="How many balls can their robot hold at once?"
            name="teleopBallCapacity"
            options={["1", "2", "3"]}
            value={form.teleopBallCapacity}
            onChange={handleChange}
          />
          <MCQuestion
            label="How accurate was their shooting?"
            name="teleopShootingAccuracy"
            options={["Very Accurate", "Somewhat Accurate", "Inaccurate", "No Shooting"]}
            value={form.teleopShootingAccuracy}
            onChange={handleChange}
          />
          <MCQuestion
            label="Did they interact with the Gate?"
            name="teleopGateInteraction"
            options={["Opened Reliably", "Sometimes", "Tried But Failed", "Did Not Attempt"]}
            value={form.teleopGateInteraction}
            onChange={handleChange}
          />
          <MCQuestion
            label="How well did they manage Overflow artifacts?"
            name="teleopOverflowManagement"
            options={["Excellent", "Good", "Poor", "Did Not Collect"]}
            value={form.teleopOverflowManagement}
            onChange={handleChange}
          />
          <MCQuestion
            label="How fast were their scoring cycles?"
            name="teleopCycleSpeed"
            options={["Very Fast", "Average", "Slow", "Minimal Cycling"]}
            value={form.teleopCycleSpeed}
            onChange={handleChange}
          />
          <MCQuestion
            label="Did they classify artifacts (purple vs green) correctly?"
            name="teleopArtifactClassification"
            options={["Always", "Mostly", "Rarely", "No Classification"]}
            value={form.teleopArtifactClassification}
            onChange={handleChange}
          />
        </div>

        {/* Endgame */}
        <div className="glass rounded-xl p-6 border-glow space-y-5">
          <SectionHeader title="ENDGAME" icon="🏁" />
          <MCQuestion
            label="Did they park in the Base Zone?"
            name="endgameParking"
            options={["Yes – Full Park", "Partial", "No"]}
            value={form.endgameParking}
            onChange={handleChange}
          />
          <MCQuestion
            label="Did they assist their alliance partner in Endgame?"
            name="endgameAllianceAssist"
            options={["Yes", "Attempted", "No"]}
            value={form.endgameAllianceAssist}
            onChange={handleChange}
          />
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
                    // If selecting "None observed", clear others. If selecting another, remove "None observed"
                    if (penalty === "None observed") {
                      return { ...prev, penalties: has ? [] : ["None observed"] };
                    }
                    const withoutNone = prev.penalties.filter((p) => p !== "None observed");
                    return {
                      ...prev,
                      penalties: has
                        ? withoutNone.filter((p) => p !== penalty)
                        : [...withoutNone, penalty],
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
        </div>

        {/* Short Answers */}
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
          className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg tracking-widest hover:glow-primary-strong transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
        >
          SUBMIT SCOUTING DATA
        </button>

        <p className="text-center text-muted-foreground/30 text-xs font-body pb-8">
          Data is saved locally on this device • FTC DECODE™ 2025–2026
        </p>
      </form>
    </div>
  );
};

export default ScoutingForm;
