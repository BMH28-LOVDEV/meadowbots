import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TEAM_MEMBERS } from "@/lib/teamAuth";

interface MasterDashboardProps {
  onLogout: () => void;
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
}

interface TeamAssignment {
  id?: string;
  scout_name: string;
  team_number: string;
  team_name: string;
  qual_matches: string[];
}

// Scoring system to rank teams
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

interface TeamSummary {
  teamNumber: string;
  avgScore: number;
  entries: ScoutingEntry[];
  goodMatchResponses: { scouter: string; response: string }[];
}

const MasterDashboard = ({ onLogout }: MasterDashboardProps) => {
  const [entries, setEntries] = useState<ScoutingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string } | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [showClearAll, setShowClearAll] = useState(false);
  const [clearAllPassword, setClearAllPassword] = useState("");
  const [clearAllError, setClearAllError] = useState("");
  const [clearingAll, setClearingAll] = useState(false);

  // Shared password modal for assignment CLEAR and qual match removal
  const [pendingAction, setPendingAction] = useState<null | { type: "clearAssignment"; scoutName: string } | { type: "removeMatch"; scoutName: string; match: string }>(null);
  const [pendingPassword, setPendingPassword] = useState("");
  const [pendingError, setPendingError] = useState("");

  const [activeTab, setActiveTab] = useState<"dashboard" | "rankings" | "progress" | "assignments">("dashboard");
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState<string | null>(null);
  const [editedAssignments, setEditedAssignments] = useState<Record<string, { team_number: string; team_name: string; qual_matches: string[] }>>({});
  const [matchInputs, setMatchInputs] = useState<Record<string, string>>({});

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scouting_entries")
      .select("*")
      .order("timestamp", { ascending: true });

    if (error) {
      toast.error("Failed to load data.");
      console.error(error);
    } else {
      const mapped: ScoutingEntry[] = (data || []).map((row) => ({
        id: row.id,
        teamNumber: row.team_number,
        matchNumber: row.match_number || "",
        scouterName: row.scouter_name,
        timestamp: row.timestamp,
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
      }));
      setEntries(mapped);
    }
    setLoading(false);
  };

  const fetchAssignments = async () => {
    setAssignmentsLoading(true);
    const { data, error } = await supabase.from("team_assignments").select("*");
    if (!error && data) {
      const typed = data as TeamAssignment[];
      setAssignments(typed);
      const edited: Record<string, { team_number: string; team_name: string; qual_matches: string[] }> = {};
      typed.forEach((a) => {
        edited[a.scout_name] = {
          team_number: a.team_number,
          team_name: a.team_name,
          qual_matches: a.qual_matches || [],
        };
      });
      setEditedAssignments(edited);
    }
    setAssignmentsLoading(false);
  };

  useEffect(() => {
    fetchEntries();
    fetchAssignments();
  }, []);


  // Check if a scout has submitted a specific qual match for their team
  const isMatchDone = (assignment: TeamAssignment, match: string): boolean => {
    return entries.some(
      (e) =>
        e.scouterName === assignment.scout_name &&
        e.teamNumber === assignment.team_number &&
        e.matchNumber.toUpperCase() === match.toUpperCase()
    );
  };

  const handleSaveAssignment = async (scoutName: string) => {
    const edited = editedAssignments[scoutName];
    if (!edited) return;
    setSavingAssignment(scoutName);

    const existing = assignments.find((a) => a.scout_name === scoutName);
    if (existing) {
      const { error } = await supabase
        .from("team_assignments")
        .update({ team_number: edited.team_number, team_name: edited.team_name, qual_matches: edited.qual_matches })
        .eq("scout_name", scoutName);
      if (error) { toast.error("Failed to save."); console.error(error); }
      else { toast.success(`Saved for ${scoutName}!`); await fetchAssignments(); }
    } else {
      const { error } = await supabase
        .from("team_assignments")
        .insert({ scout_name: scoutName, team_number: edited.team_number, team_name: edited.team_name, qual_matches: edited.qual_matches });
      if (error) { toast.error("Failed to save."); console.error(error); }
      else { toast.success(`Saved for ${scoutName}!`); await fetchAssignments(); }
    }
    setSavingAssignment(null);
  };

  const executeClearAssignment = async (scoutName: string) => {
    const existing = assignments.find((a) => a.scout_name === scoutName);
    if (existing) {
      await supabase.from("team_assignments").delete().eq("scout_name", scoutName);
      await fetchAssignments();
      toast.success(`Assignment cleared for ${scoutName}.`);
    }
    setEditedAssignments((prev) => ({ ...prev, [scoutName]: { team_number: "", team_name: "", qual_matches: [] } }));
    setMatchInputs((prev) => ({ ...prev, [scoutName]: "" }));
  };

  const executeRemoveMatch = (scoutName: string, match: string) => {
    const current = editedAssignments[scoutName] || { team_number: "", team_name: "", qual_matches: [] };
    setEditedAssignments((prev) => ({ ...prev, [scoutName]: { ...current, qual_matches: current.qual_matches.filter((m) => m !== match) } }));
  };

  const handlePendingAction = async () => {
    if (pendingPassword !== "Team Leader") { setPendingError("Incorrect password."); return; }
    if (!pendingAction) return;
    if (pendingAction.type === "clearAssignment") {
      await executeClearAssignment(pendingAction.scoutName);
    } else if (pendingAction.type === "removeMatch") {
      executeRemoveMatch(pendingAction.scoutName, pendingAction.match);
    }
    setPendingAction(null);
    setPendingPassword("");
    setPendingError("");
  };

  const addMatch = (scoutName: string) => {
    const raw = (matchInputs[scoutName] || "").trim().toUpperCase();
    if (!raw) return;
    const current = editedAssignments[scoutName] || { team_number: "", team_name: "", qual_matches: [] };
    if (current.qual_matches.includes(raw)) { setMatchInputs((prev) => ({ ...prev, [scoutName]: "" })); return; }
    setEditedAssignments((prev) => ({ ...prev, [scoutName]: { ...current, qual_matches: [...current.qual_matches, raw] } }));
    setMatchInputs((prev) => ({ ...prev, [scoutName]: "" }));
  };

  const handleClearAll = async () => {
    if (clearAllPassword !== "Team Leader") { setClearAllError("Incorrect password."); return; }
    setClearingAll(true);
    const { error } = await supabase.from("scouting_entries").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) { toast.error("Failed to clear entries."); console.error(error); }
    else {
      setEntries([]);
      toast.success("All scouting entries cleared!");
      setShowClearAll(false);
      setClearAllPassword("");
      setClearAllError("");
    }
    setClearingAll(false);
  };

  const handleDelete = async () => {
    if (deletePassword !== "Team Leader") { setDeleteError("Incorrect password."); return; }
    if (!deleteTarget) return;
    const { error } = await supabase.from("scouting_entries").delete().eq("id", deleteTarget.id);
    if (error) { toast.error("Failed to delete entry."); console.error(error); return; }
    setEntries((prev) => prev.filter((e) => e.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeletePassword("");
    setDeleteError("");
    toast.success("Entry deleted.");
  };

  const teamSummaries = useMemo(() => {
    const byTeam: Record<string, ScoutingEntry[]> = {};
    entries.forEach((entry) => {
      if (!byTeam[entry.teamNumber]) byTeam[entry.teamNumber] = [];
      byTeam[entry.teamNumber].push(entry);
    });
    const summaries: TeamSummary[] = Object.entries(byTeam).map(([teamNumber, teamEntries]) => {
      const totalScore = teamEntries.reduce((sum, e) => sum + scoreEntry(e), 0);
      const avgScore = totalScore / teamEntries.length;
      const goodMatchResponses = teamEntries
        .filter((e) => e.goodMatch?.trim())
        .map((e) => ({ scouter: e.scouterName, response: e.goodMatch }));
      return { teamNumber, avgScore, entries: teamEntries, goodMatchResponses };
    });
    summaries.sort((a, b) => b.avgScore - a.avgScore);
    return summaries;
  }, [entries]);

  // Only show scouts that have an assignment
  const assignedScouts = assignments.filter((a) => a.team_number);

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-400";
    if (rank === 2) return "text-gray-300";
    if (rank === 3) return "text-amber-600";
    return "text-muted-foreground";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed top-0 left-0 w-full h-64 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl text-accent text-glow tracking-wider" style={{ textShadow: "0 0 10px hsl(260 80% 60% / 0.5)" }}>
              MEADOWBOT MASTER
            </h1>
            <p className="text-xs text-muted-foreground font-body">Team Rankings Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchEntries(); fetchAssignments(); }}
              className="px-3 py-1.5 rounded-lg text-xs font-display tracking-wider border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all duration-200"
            >
              ↻ REFRESH
            </button>
            <button
              onClick={() => { setShowClearAll(true); setClearAllPassword(""); setClearAllError(""); }}
              className="px-3 py-1.5 rounded-lg text-xs font-display tracking-wider border border-destructive/40 text-destructive/70 hover:border-destructive hover:text-destructive transition-all duration-200"
            >
              🗑 CLEAR ALL
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
            onClick={() => setActiveTab("rankings")}
            className={`px-4 py-1.5 rounded-lg text-xs font-display tracking-wider transition-all duration-200 ${
              activeTab === "rankings"
                ? "bg-primary/20 text-primary border border-primary/40"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            📊 RANKINGS
          </button>
          <button
            onClick={() => setActiveTab("progress")}
            className={`px-4 py-1.5 rounded-lg text-xs font-display tracking-wider transition-all duration-200 ${
              activeTab === "progress"
                ? "bg-primary/20 text-primary border border-primary/40"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            📡 SCOUT PROGRESS
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={`px-4 py-1.5 rounded-lg text-xs font-display tracking-wider transition-all duration-200 ${
              activeTab === "assignments"
                ? "bg-primary/20 text-primary border border-primary/40"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            📋 SCOUT ASSIGNMENTS
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
                  <p className="text-sm text-muted-foreground font-body mt-1">MeadowBot Master — DECODE 2025–2026</p>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass rounded-xl p-4 text-center border border-border/50">
                <p className="font-display text-3xl text-primary text-glow">{entries.length}</p>
                <p className="text-xs text-muted-foreground font-body mt-1">Total Entries</p>
              </div>
              <div className="glass rounded-xl p-4 text-center border border-border/50">
                <p className="font-display text-3xl text-primary text-glow">{teamSummaries.length}</p>
                <p className="text-xs text-muted-foreground font-body mt-1">Teams Scouted</p>
              </div>
              <div className="glass rounded-xl p-4 text-center border border-border/50">
                <p className="font-display text-3xl text-primary text-glow">
                  {assignments.filter((a) => a.team_number).length}
                </p>
                <p className="text-xs text-muted-foreground font-body mt-1">Scouts Assigned</p>
              </div>
              <div className="glass rounded-xl p-4 text-center border border-border/50">
                <p className="font-display text-3xl text-primary text-glow">
                  {assignments.filter((a) => {
                    const m = a.qual_matches || [];
                    return m.length > 0 && m.every((q) => entries.some((e) => e.scouterName === a.scout_name && e.teamNumber === a.team_number && e.matchNumber.toUpperCase() === q.toUpperCase()));
                  }).length}
                </p>
                <p className="text-xs text-muted-foreground font-body mt-1">Scouts Complete</p>
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
                <div className="px-5 py-3 border-t border-border/50">
                  <button onClick={() => setActiveTab("rankings")} className="text-xs text-primary font-body hover:underline">
                    View full rankings →
                  </button>
                </div>
              </div>
            )}

            {/* Quick nav */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button onClick={() => setActiveTab("rankings")} className="glass rounded-xl p-5 text-left border border-border/50 hover:border-primary/40 transition-all group">
                <span className="text-2xl">📊</span>
                <p className="font-display text-sm text-foreground tracking-wider mt-2 group-hover:text-primary transition-colors">RANKINGS</p>
                <p className="text-xs text-muted-foreground font-body mt-1">Full team rankings & match data</p>
              </button>
              <button onClick={() => setActiveTab("progress")} className="glass rounded-xl p-5 text-left border border-border/50 hover:border-primary/40 transition-all group">
                <span className="text-2xl">📡</span>
                <p className="font-display text-sm text-foreground tracking-wider mt-2 group-hover:text-primary transition-colors">SCOUT PROGRESS</p>
                <p className="text-xs text-muted-foreground font-body mt-1">Live match completion status</p>
              </button>
              <button onClick={() => setActiveTab("assignments")} className="glass rounded-xl p-5 text-left border border-border/50 hover:border-primary/40 transition-all group">
                <span className="text-2xl">📋</span>
                <p className="font-display text-sm text-foreground tracking-wider mt-2 group-hover:text-primary transition-colors">ASSIGNMENTS</p>
                <p className="text-xs text-muted-foreground font-body mt-1">Assign scouts to teams & matches</p>
              </button>
            </div>
          </div>
        )}

        {/* ── SCOUT PROGRESS TAB ── */}
        {activeTab === "progress" && (
          <>
            {assignedScouts.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <p className="text-4xl mb-4">📋</p>
                <p className="text-muted-foreground font-body">No scouts assigned yet. Set up assignments in the Scout Assignments tab.</p>
              </div>
            ) : (
              <div className="glass rounded-xl overflow-hidden border border-border/50">
                <div className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
                  <span className="text-xl">📡</span>
                  <div>
                    <h2 className="font-display text-base text-foreground tracking-wider">SCOUT PROGRESS</h2>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      Live status — green = submitted, red = not yet scouted
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-border/30">
                  {assignedScouts.map((assignment) => {
                    const matches = assignment.qual_matches || [];
                    const doneCount = matches.filter((m) => isMatchDone(assignment, m)).length;
                    const allDone = matches.length > 0 && doneCount === matches.length;

                    return (
                      <div
                        key={assignment.scout_name}
                        className={`px-5 py-3.5 flex items-center gap-4 flex-wrap transition-colors ${allDone ? "bg-green-500/5" : ""}`}
                      >
                        <div className="min-w-[130px]">
                          <p className="font-display text-sm text-foreground tracking-wide leading-tight">{assignment.scout_name}</p>
                          <p className="text-xs text-muted-foreground font-body mt-0.5">
                            {assignment.team_name ? `${assignment.team_name} #${assignment.team_number}` : `Team #${assignment.team_number}`}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1.5 flex-1">
                          {matches.length === 0 ? (
                            <span className="text-xs text-muted-foreground/50 font-body italic">No matches assigned</span>
                          ) : (
                            matches.map((match) => {
                              const done = isMatchDone(assignment, match);
                              return (
                                <span
                                  key={match}
                                  className={`px-4 py-2 rounded-lg text-sm font-body font-semibold transition-all duration-200 border ${
                                    done
                                      ? "bg-glow-success/20 border-glow-success text-glow-success"
                                      : "bg-destructive/20 border-destructive text-destructive"
                                  }`}
                                >
                                  {match}
                                </span>
                              );
                            })
                          )}
                        </div>

                        {/* Progress count */}
                        {matches.length > 0 && (
                          <div className="text-right shrink-0">
                            <p className={`font-display text-sm font-bold ${allDone ? "text-green-400" : "text-muted-foreground"}`}>
                              {doneCount}/{matches.length}
                            </p>
                            <p className="text-xs text-muted-foreground font-body">done</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="px-5 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-body">
                    {assignedScouts.filter((a) => {
                      const m = a.qual_matches || [];
                      return m.length > 0 && m.every((q) => isMatchDone(a, q));
                    }).length} / {assignedScouts.length} scouts complete
                  </p>
                  <p className="text-xs text-muted-foreground font-body">
                    {entries.length} total entries submitted
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── RANKINGS TAB ── */}
        {activeTab === "rankings" && (
          <>
            {/* ── TEAM RANKINGS ── */}
            {loading ? (
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
                <p className="text-sm text-muted-foreground font-body">
                  {teamSummaries.length} team{teamSummaries.length !== 1 ? "s" : ""} scouted • Ranked by composite score
                </p>

                {teamSummaries.map((team, index) => {
                  const rank = index + 1;
                  const isExpanded = expandedTeam === team.teamNumber;

                  return (
                    <div
                      key={team.teamNumber}
                      className={`glass rounded-xl overflow-hidden transition-all duration-300 ${rank <= 3 ? "glow-primary" : ""}`}
                    >
                      <button
                        onClick={() => setExpandedTeam(isExpanded ? null : team.teamNumber)}
                        className="w-full px-6 py-5 flex items-center gap-4 text-left hover:bg-muted/30 transition-colors"
                      >
                        <div className={`text-2xl font-display font-bold w-12 text-center ${getRankColor(rank)}`}>
                          {getRankIcon(rank)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-3">
                            <span className="font-display text-lg text-foreground tracking-wider">Team {team.teamNumber}</span>
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
                                    <span className="text-xs text-muted-foreground font-body shrink-0">{r.scouter}:</span>
                                    <p className="text-sm text-foreground font-body">{r.response}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {team.entries.map((entry, i) => (
                            <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <span className="font-display text-sm text-foreground tracking-wider">
                                    Match {entry.matchNumber || "N/A"} • Score: {scoreEntry(entry)}
                                  </span>
                                  <p className="text-xs text-muted-foreground font-body mt-0.5">
                                    🧑‍💻 Scouted by <span className="text-foreground">{entry.scouterName || "Unknown"}</span> • {new Date(entry.timestamp).toLocaleDateString()}
                                  </p>
                                </div>
                                <button
                                  onClick={() => { setDeleteTarget({ id: entry.id }); setDeletePassword(""); setDeleteError(""); }}
                                  className="px-3 py-1 rounded-lg text-xs font-display tracking-wider bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-all duration-200 shrink-0"
                                >
                                  DELETE
                                </button>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-body">
                                <DataCell label="Auto Artifacts" value={entry.autoArtifactsScored} />
                                <DataCell label="Auto Pattern" value={entry.autoPatternAlignment} />
                                <DataCell label="Launch Line" value={entry.autoLaunchLine} />
                                <DataCell label="Auto Leave" value={entry.autoLeave} />
                                <DataCell label="Auto Consistency" value={entry.autoConsistency} />
                                <DataCell label="Intake" value={entry.teleopIntakeMethod} />
                                <DataCell label="Ball Capacity" value={entry.teleopBallCapacity} />
                                <DataCell label="Shooting" value={entry.teleopShootingAccuracy} />
                                <DataCell label="Gate" value={entry.teleopGateInteraction} />
                                <DataCell label="Overflow" value={entry.teleopOverflowManagement} />
                                <DataCell label="Cycle Speed" value={entry.teleopCycleSpeed} />
                                <DataCell label="Classification" value={entry.teleopArtifactClassification} />
                                <DataCell label="Parking" value={entry.endgameParking} />
                                <DataCell label="Alliance Assist" value={entry.endgameAllianceAssist} />
                              </div>

                              {(entry.penalties || []).length > 0 && (
                                <div>
                                  <span className="text-xs text-muted-foreground font-body">Penalties: </span>
                                  {(entry.penalties || []).map((p, j) => (
                                    <span key={j} className={`inline-block text-xs px-2 py-0.5 rounded mr-1 mt-1 ${
                                      p === "None observed" ? "bg-glow-success/20 text-glow-success" : "bg-destructive/20 text-destructive"
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
          </>
        )}

        {/* ── ASSIGNMENTS TAB ── */}
        {activeTab === "assignments" && (
          <div className="space-y-4">
            <div className="glass rounded-xl p-4 border border-primary/20">
              <p className="text-sm text-muted-foreground font-body">
                📋 Assign each scout their team and qualification matches (e.g. <span className="text-foreground font-mono">Q5, Q7, Q12</span>). The progress chart will update live as scouts submit.
              </p>
            </div>

            {assignmentsLoading ? (
              <div className="glass rounded-xl p-12 text-center">
                <p className="text-4xl mb-4 animate-pulse">📡</p>
                <p className="text-muted-foreground font-body">Loading assignments...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...TEAM_MEMBERS].sort((a, b) => a.localeCompare(b)).map((scoutName) => {
                  const current = editedAssignments[scoutName] || { team_number: "", team_name: "", qual_matches: [] };
                  const saved = assignments.find((a) => a.scout_name === scoutName);
                  const isDirty =
                    current.team_number !== (saved?.team_number || "") ||
                    current.team_name !== (saved?.team_name || "") ||
                    JSON.stringify(current.qual_matches) !== JSON.stringify(saved?.qual_matches || []);
                  const hasAssignment = !!(saved?.team_number);
                  const matchInput = matchInputs[scoutName] || "";

                  return (
                    <div key={scoutName} className={`glass rounded-xl p-4 transition-all duration-200 ${hasAssignment ? "border border-primary/30" : "border border-border/30"}`}>
                      <div className="flex items-start gap-3 flex-wrap">
                        {/* Scout name */}
                        <div className="min-w-[140px] pt-1">
                          <p className="font-display text-sm text-foreground tracking-wide">{scoutName}</p>
                          {hasAssignment && (
                            <p className="text-xs text-primary font-body mt-0.5">✓ Assigned</p>
                          )}
                        </div>

                        {/* Fields */}
                        <div className="flex-1 space-y-2 min-w-[260px]">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-muted-foreground font-body mb-1">Team #</label>
                              <input
                                type="text"
                                value={current.team_number}
                                onChange={(e) => setEditedAssignments((prev) => ({ ...prev, [scoutName]: { ...current, team_number: e.target.value } }))}
                                placeholder="e.g. 254"
                                className="w-full px-3 py-1.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body text-sm outline-none transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground font-body mb-1">Official Team Name</label>
                              <input
                                type="text"
                                value={current.team_name}
                                onChange={(e) => setEditedAssignments((prev) => ({ ...prev, [scoutName]: { ...current, team_name: e.target.value } }))}
                                placeholder="e.g. The Cheesy Poofs"
                                className="w-full px-3 py-1.5 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body text-sm outline-none transition-all"
                              />
                            </div>
                          </div>

                          {/* Tag-style match input */}
                          <div>
                            <label className="block text-xs text-muted-foreground font-body mb-1">Qual Matches to Scout</label>
                            <div className="min-h-[44px] w-full px-3 py-2 rounded-lg bg-muted border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all flex flex-wrap gap-1.5 items-center">
                              {current.qual_matches.map((match) => {
                                const done = saved ? isMatchDone(saved, match) : false;
                                return (
                                  <button
                                    key={match}
                                    type="button"
                                    onClick={() => { setPendingAction({ type: "removeMatch", scoutName, match }); setPendingPassword(""); setPendingError(""); }}
                                    title="Click to remove"
                                    className={`px-3 py-1 rounded-lg text-sm font-body font-semibold border transition-all duration-200 hover:opacity-70 ${
                                      done
                                        ? "bg-glow-success/20 border-glow-success text-glow-success"
                                        : "bg-destructive/20 border-destructive text-destructive"
                                    }`}
                                  >
                                    {match} ×
                                  </button>
                                );
                              })}
                              <input
                                type="text"
                                value={matchInput}
                                onChange={(e) => setMatchInputs((prev) => ({ ...prev, [scoutName]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === "," || e.key === " ") {
                                    e.preventDefault();
                                    addMatch(scoutName);
                                  }
                                }}
                                placeholder={current.qual_matches.length === 0 ? "Type Q5 then Enter…" : "Add more…"}
                                className="flex-1 min-w-[100px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground/40 font-body text-sm"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-2 items-start pt-5 shrink-0">
                          <button
                            onClick={() => handleSaveAssignment(scoutName)}
                            disabled={!isDirty || savingAssignment === scoutName || !current.team_number}
                            className="px-3 py-1.5 rounded-lg text-xs font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {savingAssignment === scoutName ? "SAVING..." : "SAVE"}
                          </button>
                          {hasAssignment && (
                            <button
                              onClick={() => { setPendingAction({ type: "clearAssignment", scoutName }); setPendingPassword(""); setPendingError(""); }}
                              className="px-3 py-1.5 rounded-lg text-xs font-display tracking-wider border border-destructive/50 text-destructive hover:bg-destructive/10 transition-all"
                            >
                              CLEAR
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-xl p-6 w-full max-w-sm mx-4 border border-border space-y-4">
            <h3 className="font-display text-lg text-destructive tracking-wider">CONFIRM DELETE</h3>
            <p className="text-sm text-muted-foreground font-body">Enter the password to delete this match entry.</p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleDelete(); }}
              placeholder="Enter password"
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm font-body focus:outline-none focus:ring-2 focus:ring-destructive/50"
            />
            {deleteError && <p className="text-xs text-destructive font-body">{deleteError}</p>}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setDeleteTarget(null); setDeletePassword(""); setDeleteError(""); }}
                className="px-4 py-2 rounded-lg text-xs font-display tracking-wider border border-border text-muted-foreground hover:bg-muted/30 transition-all"
              >
                CANCEL
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-xs font-display tracking-wider bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-all"
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password modal for CLEAR assignment / remove qual match */}
      {pendingAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-xl p-6 w-full max-w-sm mx-4 border border-destructive/40 space-y-4">
            <h3 className="font-display text-lg text-destructive tracking-wider">
              {pendingAction.type === "clearAssignment" ? "🗑 CLEAR ASSIGNMENT" : `✕ REMOVE ${pendingAction.match}`}
            </h3>
            <p className="text-sm text-muted-foreground font-body">
              {pendingAction.type === "clearAssignment"
                ? `This will clear the full assignment for ${pendingAction.scoutName}. Enter the password to confirm.`
                : `This will remove match ${pendingAction.match} from ${pendingAction.scoutName}'s schedule. Enter the password to confirm.`}
            </p>
            <input
              type="password"
              value={pendingPassword}
              onChange={(e) => { setPendingPassword(e.target.value); setPendingError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handlePendingAction(); }}
              placeholder="Enter password"
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm font-body focus:outline-none focus:ring-2 focus:ring-destructive/50"
            />
            {pendingError && <p className="text-xs text-destructive font-body">{pendingError}</p>}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setPendingAction(null); setPendingPassword(""); setPendingError(""); }}
                className="px-4 py-2 rounded-lg text-xs font-display tracking-wider border border-border text-muted-foreground hover:bg-muted/30 transition-all"
              >
                CANCEL
              </button>
              <button
                onClick={handlePendingAction}
                className="px-4 py-2 rounded-lg text-xs font-display tracking-wider bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-all"
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All modal */}
      {showClearAll && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-xl p-6 w-full max-w-sm mx-4 border border-destructive/40 space-y-4">
            <h3 className="font-display text-lg text-destructive tracking-wider">🗑 CLEAR ALL ENTRIES</h3>
            <p className="text-sm text-muted-foreground font-body">
              This will permanently delete <span className="text-foreground font-bold">all {entries.length} scouting entries</span>. Assignments will not be affected. Enter the password to confirm.
            </p>
            <input
              type="password"
              value={clearAllPassword}
              onChange={(e) => { setClearAllPassword(e.target.value); setClearAllError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleClearAll(); }}
              placeholder="Enter password"
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm font-body focus:outline-none focus:ring-2 focus:ring-destructive/50"
            />
            {clearAllError && <p className="text-xs text-destructive font-body">{clearAllError}</p>}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowClearAll(false); setClearAllPassword(""); setClearAllError(""); }}
                className="px-4 py-2 rounded-lg text-xs font-display tracking-wider border border-border text-muted-foreground hover:bg-muted/30 transition-all"
              >
                CANCEL
              </button>
              <button
                onClick={handleClearAll}
                disabled={clearingAll}
                className="px-4 py-2 rounded-lg text-xs font-display tracking-wider bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-all disabled:opacity-60"
              >
                {clearingAll ? "CLEARING..." : "CLEAR ALL"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DataCell = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-background/50 rounded px-2 py-1.5">
    <span className="text-muted-foreground">{label}: </span>
    <span className="text-foreground">{value || "—"}</span>
  </div>
);

export default MasterDashboard;
