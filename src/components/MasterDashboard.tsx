import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TEAM_MEMBERS, DRIVE_TEAM } from "@/lib/teamAuth";
import { useCelebration } from "@/hooks/useCelebration";
import CelebrationOverlay from "@/components/CelebrationOverlay";

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
  matchScore: number | null;
  allianceWon: string;
  penaltyPointsGiven: number | null;
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
  const { celebrating } = useCelebration();
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

  // Active scouts presence
  const [activeScouts, setActiveScouts] = useState<string[]>([]);

  // Shared password modal for assignment CLEAR and qual match removal
  const [pendingAction, setPendingAction] = useState<null | { type: "clearAssignment"; scoutName: string } | { type: "removeMatch"; scoutName: string; match: string }>(null);
  const [pendingPassword, setPendingPassword] = useState("");
  const [pendingError, setPendingError] = useState("");

  const [activeTab, setActiveTab] = useState<"dashboard" | "rankings" | "progress" | "assignments" | "drivedata" | "livestream">("dashboard");
  const [driveEntries, setDriveEntries] = useState<ScoutingEntry[]>([]);
  const [driveProfiles, setDriveProfiles] = useState<{ display_name: string; username: string; role: string; user_id: string }[]>([]);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
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
        matchScore: (row as any).match_score ?? null,
        allianceWon: (row as any).alliance_won || "",
        penaltyPointsGiven: (row as any).penalty_points_given ?? null,
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

  const fetchDriveData = async () => {
    const [{ data: entriesData }, { data: profilesData }] = await Promise.all([
      supabase.from("scouting_entries").select("*").in("scouter_name", ["Zoë Khansevahn", "Zoe GK", "Chantelle Wong"]).order("timestamp", { ascending: false }),
      supabase.from("profiles").select("display_name, username, role, user_id").order("display_name"),
    ]);
    if (entriesData) {
      setDriveEntries(entriesData.map((row) => ({
        id: row.id, teamNumber: row.team_number, matchNumber: row.match_number || "",
        scouterName: row.scouter_name, timestamp: row.timestamp,
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
        matchScore: (row as any).match_score ?? null,
        allianceWon: (row as any).alliance_won || "",
        penaltyPointsGiven: (row as any).penalty_points_given ?? null,
      })));
    }
    if (profilesData) setDriveProfiles(profilesData as any);
  };

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    setUpdatingRole(userId);
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("user_id", userId);
    if (error) { toast.error("Failed to update role."); }
    else { toast.success(`Role updated to ${newRole}!`); await fetchDriveData(); }
    setUpdatingRole(null);
  };

  useEffect(() => {
    fetchEntries();
    fetchAssignments();
    fetchDriveData();
  }, []);

  // Subscribe to active scouts presence channel
  useEffect(() => {
    const channel = supabase.channel("active_scouts");
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ name: string }>();
        const names = Object.values(state)
          .flat()
          .map((p) => p.name)
          .filter(Boolean);
        setActiveScouts([...new Set(names)]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
      <CelebrationOverlay visible={celebrating} />
      <div className="fixed top-0 left-0 w-full h-64 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl text-accent text-glow tracking-wider" style={{ textShadow: "0 0 10px hsl(260 80% 60% / 0.5)" }}>
              MASTER MEADOWBOT
            </h1>
            <p className="text-xs text-muted-foreground font-body">Team Rankings Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchEntries(); fetchAssignments(); fetchDriveData(); }}
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
          <button
            onClick={() => setActiveTab("drivedata")}
            className={`px-4 py-1.5 rounded-lg text-xs font-display tracking-wider transition-all duration-200 whitespace-nowrap ${
              activeTab === "drivedata"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            🔵 DRIVE DATA
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

            {/* Active Scouts — Live Presence */}
            <div className="glass rounded-xl overflow-hidden border border-green-500/30">
              <div className="px-5 py-3.5 border-b border-green-500/20 flex items-center gap-3" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(22,163,74,0.04))" }}>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <h3 className="font-display text-sm tracking-wider text-green-400" style={{ textShadow: "0 0 8px rgba(74,222,128,0.4)" }}>
                  ACTIVE SCOUTS
                </h3>
                <span className="ml-auto text-xs font-display text-green-400/70">
                  {activeScouts.length} ONLINE
                </span>
              </div>
              {activeScouts.length === 0 ? (
                <div className="px-5 py-4 text-sm text-muted-foreground font-body">
                  No scouts currently active.
                </div>
              ) : (
                <div className="divide-y divide-green-500/10">
                  {activeScouts.map((name) => (
                    <div key={name} className="px-5 py-2.5 flex items-center gap-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400 flex-shrink-0"></span>
                      <span className="font-body text-sm text-foreground">{name}</span>
                    </div>
                  ))}
                </div>
              )}
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
                {[...TEAM_MEMBERS].filter((m) => !DRIVE_TEAM.includes(m)).sort((a, b) => a.localeCompare(b)).map((scoutName) => {
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

      {/* ── DRIVE DATA TAB ── */}
      {activeTab === "drivedata" && (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {/* Header */}
          <div className="glass rounded-xl p-6 border border-blue-500/40" style={{ boxShadow: "0 0 20px hsl(220 100% 60% / 0.15)" }}>
            <div className="flex items-center gap-4">
              <span className="text-4xl">🔵</span>
              <div>
                <h2 className="font-display text-xl tracking-wider text-blue-400">DRIVE DATA HQ</h2>
                <p className="text-xs text-muted-foreground font-body mt-1">Drive Team Data Collector submissions & role management</p>
              </div>
            </div>
          </div>

          {/* Role Manager */}
          <div className="glass rounded-xl overflow-hidden border border-blue-500/20">
            <div className="px-5 py-4 border-b border-blue-500/20 flex items-center gap-3" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(37,99,235,0.04))" }}>
              <span className="text-lg">👥</span>
              <h3 className="font-display text-sm tracking-wider text-blue-400">TEAM ROLE MANAGER</h3>
            </div>
            <div className="divide-y divide-border/30">
              {driveProfiles.filter(p => p.role !== "master").map((profile) => {
                const roleLabels: Record<string, string> = {
                  scout: "Scouter",
                  bluedriver: "Drive Team Data Collector",
                  driveteam: "Drive Team",
                  viewer: "Viewer",
                  letsgo: "Let's Go",
                };
                const roleColors: Record<string, string> = {
                  scout: "text-muted-foreground",
                  bluedriver: "text-blue-400",
                  driveteam: "text-blue-300",
                  viewer: "text-muted-foreground",
                  letsgo: "text-primary",
                };
                return (
                  <div key={profile.user_id} className="px-5 py-3.5 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-[160px]">
                      <p className="font-display text-sm text-foreground tracking-wide">{profile.display_name}</p>
                      <p className={`text-xs font-body mt-0.5 ${roleColors[profile.role] || "text-muted-foreground"}`}>
                        {roleLabels[profile.role] || profile.role}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {["scout", "driveteam", "bluedriver"].map((role) => (
                        <button key={role} type="button"
                          disabled={profile.role === role || updatingRole === profile.user_id}
                          onClick={() => handleRoleUpdate(profile.user_id, role)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-display tracking-wider transition-all duration-200 border ${
                            profile.role === role
                              ? role === "bluedriver" ? "bg-blue-500/20 border-blue-500 text-blue-400"
                                : role === "driveteam" ? "bg-blue-400/20 border-blue-400 text-blue-300"
                                : "bg-primary/20 border-primary text-primary"
                              : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                          }`}>
                          {role === "bluedriver" ? "Data Collector" : role === "driveteam" ? "Drive Team" : "Scout"}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {driveProfiles.filter(p => p.role !== "master").length === 0 && (
                <div className="px-5 py-6 text-sm text-muted-foreground font-body text-center">No user accounts created yet.</div>
              )}
            </div>
          </div>

          {/* Drive Data Entries */}
          <div className="glass rounded-xl overflow-hidden border border-blue-500/20">
            <div className="px-5 py-4 border-b border-blue-500/20 flex items-center gap-3" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(37,99,235,0.04))" }}>
              <span className="text-lg">📊</span>
              <h3 className="font-display text-sm tracking-wider text-blue-400">DRIVE DATA SUBMISSIONS</h3>
              <span className="ml-auto text-xs font-display text-blue-400/70">{driveEntries.length} ENTRIES</span>
            </div>
            {driveEntries.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground font-body">No Drive Data submitted yet.</div>
            ) : (
              <div className="divide-y divide-border/30">
                {driveEntries.map((entry) => (
                  <div key={entry.id} className="px-5 py-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-display text-sm text-foreground tracking-wide">
                          Team {entry.teamNumber} — Match {entry.matchNumber || "N/A"}
                          {entry.allianceWon && (
                            <span className={`ml-2 text-xs ${entry.allianceWon === "Yes – Won" ? "text-green-400" : entry.allianceWon === "No – Lost" ? "text-destructive" : "text-muted-foreground"}`}>
                              {entry.allianceWon === "Yes – Won" ? "🏆 Won" : entry.allianceWon === "No – Lost" ? "❌ Lost" : "🤝 Tie"}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground font-body mt-0.5">
                          🔵 <span className="text-blue-400">{entry.scouterName}</span> · {new Date(entry.timestamp).toLocaleDateString()}
                          {entry.matchScore != null && <span className="ml-2">· Score: {entry.matchScore}</span>}
                        </p>
                      </div>
                      <button
                        onClick={() => { setDeleteTarget({ id: entry.id }); setDeletePassword(""); setDeleteError(""); }}
                        className="px-3 py-1 rounded-lg text-xs font-display tracking-wider bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-all shrink-0"
                      >DELETE</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-body">
                      {entry.autoArtifactsScored && <DataCell label="Auto Artifacts" value={entry.autoArtifactsScored} />}
                      {entry.teleopArtifactClassification && <DataCell label="Teleop Artifacts" value={entry.teleopArtifactClassification} />}
                      {entry.teleopCycleSpeed && <DataCell label="Cycles" value={entry.teleopCycleSpeed} />}
                      {entry.teleopBallCapacity && <DataCell label="Cycle Time" value={entry.teleopBallCapacity} />}
                      {entry.endgameParking && <DataCell label="Park" value={entry.endgameParking} />}
                      {entry.penaltyPointsGiven != null && <DataCell label="Penalty Pts" value={String(entry.penaltyPointsGiven)} />}
                    </div>
                    {(entry.penalties || []).filter(p => p !== "None observed").length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground font-body">Penalties: </span>
                        {entry.penalties.map((p, i) => (
                          <span key={i} className="inline-block text-xs px-2 py-0.5 rounded mr-1 mt-1 bg-destructive/20 text-destructive">{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LIVESTREAM TAB content is rendered inside main scroll area ── */}
      {activeTab === "livestream" && (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
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
              title="FIRSTNevadaSouth Live Stream"
            />
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
