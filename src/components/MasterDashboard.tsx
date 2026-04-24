import { useState, useMemo, useEffect } from "react";
import { Info, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TEAM_MEMBERS, DRIVE_TEAM, titleCaseTeamName } from "@/lib/teamAuth";
import { useCelebration } from "@/hooks/useCelebration";
import CelebrationOverlay from "@/components/CelebrationOverlay";
import LockdownDashboard from "@/components/LockdownDashboard";
import { HamburgerTabs, type TabItem, type ActionItem } from "@/components/HamburgerTabs";
import AIChatBot from "@/components/AIChatBot";

interface MasterDashboardProps {
  onLogout: () => void;
  username: string;
  onViewAsBlueDriver?: () => void;
  onViewAsScouter?: () => void;
}

interface ScoutingEntry {
  id: string;
  teamNumber: string;
  teamName: string;
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



const MasterDashboard = ({ onLogout, username, onViewAsBlueDriver, onViewAsScouter }: MasterDashboardProps) => {
  const isBen = username === "Benjamin Hale";
  const isJude = username === "Jude Trujillo";
  const { celebrating, triggerCelebration } = useCelebration();
  const [showLockdown, setShowLockdown] = useState(false);
  const [entries, setEntries] = useState<ScoutingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [showCompositeInfo, setShowCompositeInfo] = useState(false);
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
  const [pendingAction, setPendingAction] = useState<null | { type: "clearAssignment"; scoutName: string }>(null);
  const [pendingPassword, setPendingPassword] = useState("");
  const [pendingError, setPendingError] = useState("");

  const [activeTab, setActiveTab] = useState<"dashboard" | "rankings" | "progress" | "assignments" | "bluedrivedata" | "livestream" | "approvals" | "scoutai" | "pitdata">("dashboard");
  const [pitEntries, setPitEntries] = useState<any[]>([]);
  const [expandedPit, setExpandedPit] = useState<string | null>(null);

  const fetchPitEntries = async () => {
    const { data, error } = await supabase.from("pit_scouting_entries" as any).select("*").order("created_at", { ascending: false });
    if (!error && data) setPitEntries(data as any[]);
  };
  const [driveEntries, setDriveEntries] = useState<ScoutingEntry[]>([]);
  const [driveProfiles, setDriveProfiles] = useState<{ display_name: string; username: string; role: string; user_id: string }[]>([]);
  const [pendingUsers, setPendingUsers] = useState<{ id: string; user_id: string; display_name: string; username: string; role: string; approval_status: string; created_at: string }[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<{ id: string; user_id: string; display_name: string; username: string; role: string; approval_status: string; created_at: string }[]>([]);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [upgradeTarget, setUpgradeTarget] = useState<{ userId: string; displayName: string } | null>(null);
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  // Drive team match schedules (from DB)
  const [blueMatches, setBlueMatches] = useState<{ id: string; match_label: string; sort_order: number }[]>([]);
  const [driveMatchInput, setDriveMatchInput] = useState<Record<string, string>>({ blue: "" });
  const [savingDriveMatch, setSavingDriveMatch] = useState(false);

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
        teamName: (row as any).team_name || "",
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
      setAssignments(data as TeamAssignment[]);
    }
    setAssignmentsLoading(false);
  };

  const fetchDriveData = async () => {
    const [{ data: entriesData }, { data: profilesData }] = await Promise.all([
      supabase.from("scouting_entries").select("*").in("scouter_name", ["Zoë Khansevahn", "Zoe GK", "Chantelle Wong", "Naila Nauman"]).order("timestamp", { ascending: false }),
      supabase.from("profiles").select("display_name, username, role, user_id").order("display_name"),
    ]);
    if (entriesData) {
      setDriveEntries(entriesData.map((row) => ({
        id: row.id, teamNumber: row.team_number, teamName: (row as any).team_name || "", matchNumber: row.match_number || "",
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

  const fetchDriveTeamMatches = async () => {
    const { data } = await (supabase as any).from("drive_team_matches").select("id, team_number, match_label, sort_order").order("sort_order", { ascending: true });
    if (data) {
      setBlueMatches(data.filter((r: any) => r.team_number === "14841").map((r: any) => ({ id: r.id, match_label: r.match_label, sort_order: r.sort_order })));
    }
  };

  const addDriveTeamMatch = async (teamNumber: string) => {
    const raw = (driveMatchInput.blue || "").trim().toUpperCase();
    if (!raw) return;
    const existing = blueMatches;
    if (existing.some(m => m.match_label === raw)) {
      setDriveMatchInput(prev => ({ ...prev, blue: "" }));
      return;
    }
    setSavingDriveMatch(true);
    await (supabase as any).from("drive_team_matches").insert({ team_number: teamNumber, match_label: raw, sort_order: existing.length });
    await fetchDriveTeamMatches();
    setDriveMatchInput(prev => ({ ...prev, blue: "" }));
    setSavingDriveMatch(false);
  };

  const removeDriveTeamMatch = async (id: string) => {
    await (supabase as any).from("drive_team_matches").delete().eq("id", id);
    await fetchDriveTeamMatches();
  };

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    setUpdatingRole(userId);
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-role`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ targetUserId: userId, newRole }),
      }
    );
    const result = await response.json();
    if (!response.ok) { toast.error(result.error || "Failed to update role."); }
    else { toast.success(`Role updated to ${newRole}!`); await fetchDriveData(); }
    setUpdatingRole(null);
  };

  const fetchPendingUsers = async () => {
    const [{ data: pendingData }, { data: approvedData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, user_id, display_name, username, role, approval_status, created_at")
        .in("approval_status", ["pending", "denied"])
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, user_id, display_name, username, role, approval_status, created_at")
        .eq("approval_status", "approved")
        .order("display_name"),
    ]);
    setPendingUsers((pendingData as any) ?? []);
    setApprovedUsers((approvedData as any) ?? []);
  };

  const handleApproval = async (profileId: string, status: "approved" | "denied") => {
    const { error } = await supabase
      .from("profiles")
      .update({ approval_status: status } as any)
      .eq("id", profileId);
    if (error) {
      toast.error("Failed to update approval status");
    } else {
      toast.success(status === "approved" ? "User approved!" : "User denied.");
      fetchPendingUsers();
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchAssignments();
    fetchDriveData();
    fetchDriveTeamMatches();
    fetchPendingUsers();
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

  const executeClearAssignment = async (scoutName: string) => {
    await supabase.from("team_assignments").delete().eq("scout_name", scoutName);
    await fetchAssignments();
    toast.success(`All assignments cleared for ${scoutName}.`);
  };

  const handlePendingAction = async () => {
    if (pendingPassword !== "BennyGF28!") { setPendingError("Incorrect password."); return; }
    if (!pendingAction) return;
    await executeClearAssignment(pendingAction.scoutName);
    setPendingAction(null);
    setPendingPassword("");
    setPendingError("");
  };

  const handleClearAll = async () => {
    if (clearAllPassword !== "BennyGF28!") { setClearAllError("Incorrect password."); return; }
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
    if (deletePassword !== "BennyGF28!") { setDeleteError("Incorrect password."); return; }
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

  const teamNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    // Prefer team_assignments names, fall back to scouter-entered names from scouting_entries
    entries.forEach(e => { if (e.teamName && !map[e.teamNumber]) map[e.teamNumber] = titleCaseTeamName(e.teamName); });
    assignments.forEach(a => { if (a.team_name) map[a.team_number] = titleCaseTeamName(a.team_name); });
    return map;
  }, [assignments, entries]);

  // Only show scouts that have an assignment
  const assignedScouts = assignments.filter((a) => a.team_number);
  const uniqueAssignedScoutNames = [...new Set(assignedScouts.map(a => a.scout_name))];
  const completedScoutsCount = uniqueAssignedScoutNames.filter(s => {
    const sa = assignments.filter(a => a.scout_name === s && a.team_number);
    return sa.length > 0 && sa.every(a => {
      const m = a.qual_matches || [];
      return m.length > 0 && m.every(q => isMatchDone(a, q));
    });
  }).length;

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

  if (showLockdown) {
    return <LockdownDashboard onLogout={onLogout} />;
  }

  return (
    <div className="min-h-screen bg-background relative">
      <CelebrationOverlay visible={celebrating} />
      <div className="fixed top-0 left-0 w-full h-64 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-xl text-accent text-glow tracking-wider truncate" style={{ textShadow: "0 0 10px hsl(260 80% 60% / 0.5)" }}>
              MASTER MEADOWBOT
            </h1>
            <p className="text-xs text-muted-foreground font-body">Team Rankings Dashboard</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <button onClick={() => { fetchEntries(); fetchAssignments(); fetchDriveData(); fetchDriveTeamMatches(); }} className="px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-display tracking-wider border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all duration-200 whitespace-nowrap">
              ↻ REFRESH
            </button>
            <div className="hidden md:flex items-center gap-2">
              {isBen && (
                <button onClick={() => triggerCelebration()} className="px-3 py-1.5 rounded-lg text-xs font-display tracking-wider border border-green-500/50 text-green-400 hover:border-green-400 hover:bg-green-500/10 transition-all duration-200">
                  🎉 LET'S GO!
                </button>
              )}
              {isBen && (
                <button onClick={() => setShowLockdown(true)} className="px-3 py-1.5 rounded-lg text-xs font-display tracking-wider border border-destructive/60 text-destructive hover:bg-destructive/10 transition-all duration-200">
                  🔴 LOCKDOWN
                </button>
              )}
              {isBen && (
                <button onClick={() => { setShowClearAll(true); setClearAllPassword(""); setClearAllError(""); }} className="px-3 py-1.5 rounded-lg text-xs font-display tracking-wider border border-destructive/40 text-destructive/70 hover:border-destructive hover:text-destructive transition-all duration-200">
                  🗑 CLEAR ALL
                </button>
              )}
              {onViewAsBlueDriver && (
                <button onClick={onViewAsBlueDriver} className="px-3 py-1.5 rounded-lg text-xs font-display tracking-wider border border-blue-500/40 text-blue-400 hover:border-blue-400 hover:text-blue-300 transition-all duration-200 whitespace-nowrap">
                  🔷 DRIVER DATA
                </button>
              )}
              {onViewAsScouter && (
                <button onClick={onViewAsScouter} className="px-3 py-1.5 rounded-lg text-xs font-display tracking-wider border border-primary/40 text-primary hover:border-primary hover:text-primary transition-all duration-200 whitespace-nowrap">
                  📋 SCOUT FORM
                </button>
              )}
            </div>
            <button
              onClick={onLogout}
              className="px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-display tracking-wider border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-all duration-200 whitespace-nowrap"
            >
              LOGOUT
            </button>
          </div>
        </div>

        <HamburgerTabs
          tabs={[
            { id: "dashboard", label: "DASHBOARD", icon: "🛰️" },
            { id: "rankings", label: "RANKINGS", icon: "🏆" },
            { id: "progress", label: "SCOUT PROGRESS", icon: "📊" },
            { id: "assignments", label: "ASSIGNMENTS", icon: "📋" },
            { id: "bluedrivedata", label: "BLUE DATA", icon: "🔷", activeClass: "bg-blue-500/20 text-blue-400 border border-blue-500/40" },
            { id: "livestream", label: "LIVE STREAM", icon: "🔴", activeClass: "bg-red-500/20 text-red-400 border border-red-500/40" },
            { id: "approvals", label: "APPROVALS", icon: "👤", activeClass: "bg-amber-500/20 text-amber-400 border border-amber-500/40", badge: pendingUsers.filter(u => u.approval_status === "pending").length, onClick: () => fetchPendingUsers() },
            { id: "scoutai", label: "SCOUT AI", icon: "🤖", activeClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" },
          ]}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as typeof activeTab)}
          actions={[
            ...(isBen ? [{ id: "letsgo", label: "LET'S GO!", icon: "🎉", className: "text-green-400 hover:text-green-300", onClick: () => triggerCelebration() }] : []),
            ...(isBen ? [{ id: "lockdown", label: "LOCKDOWN", icon: "🔴", className: "text-destructive hover:text-destructive", onClick: () => setShowLockdown(true) }] : []),
            ...(isBen ? [{ id: "clearall", label: "CLEAR ALL", icon: "🗑", className: "text-destructive/70 hover:text-destructive", onClick: () => { setShowClearAll(true); setClearAllPassword(""); setClearAllError(""); } }] : []),
            ...(onViewAsBlueDriver ? [{ id: "blueform", label: "DRIVER DATA", icon: "🔷", className: "text-blue-400 hover:text-blue-300", onClick: onViewAsBlueDriver }] : []),
            ...(onViewAsScouter ? [{ id: "scoutform", label: "SCOUT FORM", icon: "📋", className: "text-primary hover:text-primary", onClick: onViewAsScouter }] : []),
            { id: "refresh", label: "REFRESH", icon: "↻", onClick: () => { fetchEntries(); fetchAssignments(); fetchDriveData(); fetchDriveTeamMatches(); } },
          ]}
        />
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

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
                  {uniqueAssignedScoutNames.length}
                </p>
                <p className="text-xs text-muted-foreground font-body mt-1">Scouts Assigned</p>
              </div>
              <div className="glass rounded-xl p-4 text-center border border-border/50">
                <p className="font-display text-3xl text-primary text-glow">
                  {completedScoutsCount}
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
                        <p className="font-display text-sm text-foreground tracking-wide">{teamNameMap[team.teamNumber] ? `${teamNameMap[team.teamNumber]} ` : ""}#{team.teamNumber}</p>
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

            {/* Drive Team */}
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
            {uniqueAssignedScoutNames.length === 0 ? (
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
                      Live status — green = submitted, red = not yet scouted • 3 teams per scout
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-border/30">
                  {uniqueAssignedScoutNames.sort().map((scoutName) => {
                    const scoutAssignments = assignedScouts.filter(a => a.scout_name === scoutName);
                    const totalMatches = scoutAssignments.reduce((sum, a) => sum + (a.qual_matches || []).length, 0);
                    const doneMatches = scoutAssignments.reduce((sum, a) => (a.qual_matches || []).filter(m => isMatchDone(a, m)).length + sum, 0);
                    const allDone = totalMatches > 0 && doneMatches === totalMatches;

                    return (
                      <div
                        key={scoutName}
                        className={`px-5 py-3.5 space-y-2 transition-colors ${allDone ? "bg-green-500/5" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-display text-sm text-foreground tracking-wide leading-tight">{scoutName}</p>
                          <p className={`font-display text-sm font-bold ${allDone ? "text-green-400" : "text-muted-foreground"}`}>
                            {doneMatches}/{totalMatches}
                          </p>
                        </div>

                        {scoutAssignments.map((assignment) => {
                          const matches = assignment.qual_matches || [];
                          return (
                            <div key={assignment.team_number} className="flex items-center gap-3 flex-wrap">
                              <p className="text-xs text-muted-foreground font-body min-w-[80px]">
                                Team #{assignment.team_number}
                              </p>
                              <div className="flex flex-wrap gap-1.5 flex-1">
                                {matches.map((match) => {
                                  const done = isMatchDone(assignment, match);
                                  return (
                                    <span
                                      key={match}
                                      className={`px-3 py-1 rounded-lg text-xs font-body font-semibold transition-all duration-200 border ${
                                        done
                                          ? "bg-glow-success/20 border-glow-success text-glow-success"
                                          : "bg-destructive/20 border-destructive text-destructive"
                                      }`}
                                    >
                                      {match}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                <div className="px-5 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-body">
                    {completedScoutsCount} / {uniqueAssignedScoutNames.length} scouts complete
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

                  return (
                    <div
                      key={team.teamNumber}
                      className={`glass rounded-xl overflow-hidden transition-all duration-300 ${rank <= 3 ? "glow-primary" : ""}`}
                    >
                      <button
                        onClick={() => setExpandedTeam(isExpanded ? null : team.teamNumber)}
                        className="w-full px-6 py-5 flex items-center gap-4 text-left hover:bg-muted/30 transition-colors"
                      >
                        <div className={`text-2xl font-display font-bold min-w-12 w-12 shrink-0 text-center ${getRankColor(rank)}`}>
                          {getRankIcon(rank)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-3">
                            <span className="font-display text-lg text-foreground tracking-wider">{teamNameMap[team.teamNumber] ? `${teamNameMap[team.teamNumber]} ` : ""}#{team.teamNumber}</span>
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
                        <div
                          className="text-right cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); setShowCompositeInfo(true); }}
                          title="What is composite score?"
                        >
                          <p className="font-display text-xl text-primary text-glow underline decoration-dotted underline-offset-4">{Math.round(team.avgScore)}</p>
                          <p className="text-[10px] text-muted-foreground font-body">pts avg ⓘ</p>
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
                📋 Each scout is assigned <span className="text-foreground font-bold">3 teams</span> with <span className="text-foreground font-bold">3 qual matches</span> each. Progress updates live as scouts submit.
              </p>
            </div>

            {assignmentsLoading ? (
              <div className="glass rounded-xl p-12 text-center">
                <p className="text-4xl mb-4 animate-pulse">📡</p>
                <p className="text-muted-foreground font-body">Loading assignments...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...TEAM_MEMBERS].filter((m) => !DRIVE_TEAM.includes(m)).sort().map((scoutName) => {
                  const scoutAssignments = assignments.filter(a => a.scout_name === scoutName);
                  const hasAssignment = scoutAssignments.length > 0;
                  const totalMatches = scoutAssignments.reduce((sum, a) => sum + (a.qual_matches || []).length, 0);
                  const doneMatches = scoutAssignments.reduce((sum, a) => (a.qual_matches || []).filter(m => isMatchDone(a, m)).length + sum, 0);
                  const allDone = totalMatches > 0 && doneMatches === totalMatches;

                  return (
                    <div key={scoutName} className={`glass rounded-xl p-4 transition-all duration-200 ${allDone ? "border border-green-500/30 bg-green-500/5" : hasAssignment ? "border border-primary/30" : "border border-border/30"}`}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-display text-sm text-foreground tracking-wide">{scoutName}</p>
                          {hasAssignment && (
                            <p className={`text-xs font-body mt-0.5 ${allDone ? "text-green-400" : "text-primary"}`}>
                              {allDone ? "✓ All complete" : `${doneMatches}/${totalMatches} matches done`}
                            </p>
                          )}
                        </div>
                        {hasAssignment && (
                          <button
                            onClick={() => { setPendingAction({ type: "clearAssignment", scoutName }); setPendingPassword(""); setPendingError(""); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-display tracking-wider border border-destructive/50 text-destructive hover:bg-destructive/10 transition-all shrink-0"
                          >
                            CLEAR
                          </button>
                        )}
                      </div>

                      {!hasAssignment ? (
                        <p className="text-xs text-muted-foreground/50 font-body italic">No teams assigned</p>
                      ) : (
                        <div className="space-y-2">
                          {scoutAssignments.map((a) => {
                            const matches = a.qual_matches || [];
                            return (
                              <div key={a.team_number} className="flex items-center gap-3 flex-wrap p-2 rounded-lg bg-muted/30">
                                <p className="font-display text-xs text-primary tracking-wide min-w-[90px]">
                                  #{a.team_number}
                                </p>
                                <div className="flex flex-wrap gap-1.5 flex-1">
                                  {matches.map((match) => {
                                    const done = isMatchDone(a, match);
                                    return (
                                      <span
                                        key={match}
                                        className={`px-3 py-1 rounded-lg text-xs font-body font-semibold border transition-all duration-200 ${
                                          done
                                            ? "bg-glow-success/20 border-glow-success text-glow-success"
                                            : "bg-destructive/20 border-destructive text-destructive"
                                        }`}
                                      >
                                        {match}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
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
              🗑 CLEAR ASSIGNMENT
            </h3>
            <p className="text-sm text-muted-foreground font-body">
              {`This will clear the full assignment for ${pendingAction.scoutName}. Enter the password to confirm.`}
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


      {/* ── BLUE DRIVE TEAM DATA TAB ── */}
      {activeTab === "bluedrivedata" && (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          {/* Header */}
          <div className="glass rounded-xl p-6 border border-blue-500/40" style={{ boxShadow: "0 0 20px hsl(220 100% 60% / 0.15)" }}>
            <div className="flex items-center gap-4">
              <span className="text-4xl">🔷</span>
              <div>
                <h2 className="font-display text-xl tracking-wider text-blue-400">BLUE DATA</h2>
                <p className="text-xs text-muted-foreground font-body mt-1">Chantelle Wong</p>
              </div>
            </div>
          </div>

          {/* Qual Match Schedule Manager */}
          <div className="glass rounded-xl overflow-hidden border border-blue-500/20">
            <div className="px-5 py-4 border-b border-blue-500/20 flex items-center gap-3" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(37,99,235,0.04))" }}>
              <span className="text-lg">📅</span>
              <h3 className="font-display text-sm tracking-wider text-blue-400">QUAL MATCH SCHEDULE</h3>
              <span className="ml-auto text-xs text-blue-400/60 font-body">{blueMatches.length} matches added</span>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* Add match input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={driveMatchInput.blue}
                  onChange={(e) => setDriveMatchInput(prev => ({ ...prev, blue: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addDriveTeamMatch("14841"); } }}
                  placeholder="Type Q5 then Enter to add…"
                  className="flex-1 px-3 py-2 rounded-lg bg-muted border border-blue-500/30 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-foreground placeholder:text-muted-foreground/40 font-body text-sm outline-none transition-all"
                />
                <button
                  onClick={() => addDriveTeamMatch("14841")}
                  disabled={savingDriveMatch || !driveMatchInput.blue.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-display tracking-wider bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 transition-all"
                >
                  ADD
                </button>
              </div>
              {/* Match chips */}
              {blueMatches.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body text-center py-2">No matches added yet. Add them once the schedule is released.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {blueMatches.map((m) => {
                    const done = driveEntries.some(e => ["Chantelle Wong", "Zoë Khansevahn", "Zoe GK"].includes(e.scouterName) && e.teamNumber === "14841" && e.matchNumber.toUpperCase() === m.match_label);
                    return (
                      <div key={m.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-body font-semibold border transition-all ${
                        done ? "bg-green-500/20 border-green-500 text-green-400" : "bg-blue-500/10 border-blue-500/40 text-blue-300"
                      }`}>
                        {done ? "✓ " : ""}{m.match_label}
                        <button onClick={() => removeDriveTeamMatch(m.id)} className="ml-1 text-xs opacity-50 hover:opacity-100 transition-opacity">×</button>
                      </div>
                    );
                  })}
                </div>
              )}
              {blueMatches.length > 0 && (
                <p className="text-xs text-muted-foreground font-body">
                  ✓ = Chantelle submitted data · {blueMatches.filter(m => driveEntries.some(e => ["Chantelle Wong", "Zoë Khansevahn", "Zoe GK"].includes(e.scouterName) && e.teamNumber === "14841" && e.matchNumber.toUpperCase() === m.match_label)).length}/{blueMatches.length} complete
                </p>
              )}
            </div>
          </div>

          {/* Ranked Match Entries */}
          <div className="glass rounded-xl overflow-hidden border border-blue-500/20">
            <div className="px-5 py-4 border-b border-blue-500/20 flex items-center gap-3" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(37,99,235,0.04))" }}>
              <span className="text-lg">🏆</span>
              <h3 className="font-display text-sm tracking-wider text-blue-400">BEST QUAL MATCHES — RANKED</h3>
              <span className="ml-auto text-xs text-blue-400/60 font-body">
                {driveEntries.filter(e => ["Chantelle Wong", "Zoë Khansevahn", "Zoe GK"].includes(e.scouterName) && e.teamNumber === "14841").length} ENTRIES
              </span>
            </div>
            {driveEntries.filter(e => ["Chantelle Wong", "Zoë Khansevahn", "Zoe GK"].includes(e.scouterName) && e.teamNumber === "14841").length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground font-body">No Blue Drive Data submitted for Team #14841 yet.</div>
            ) : (
              <div className="divide-y divide-border/30">
                {[...driveEntries.filter(e => ["Chantelle Wong", "Zoë Khansevahn", "Zoe GK"].includes(e.scouterName) && e.teamNumber === "14841")]
                  .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
                  .map((entry, idx) => (
                  <div key={entry.id} className="px-5 py-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className="font-display text-lg w-8 text-center text-blue-400">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                        </span>
                        <div>
                          <p className="font-display text-sm text-foreground tracking-wide">
                            Match {entry.matchNumber || "N/A"}
                            {entry.matchScore != null && <span className="ml-2 text-blue-400">· Score: {entry.matchScore}</span>}
                            {entry.allianceWon && (
                              <span className={`ml-2 text-xs ${entry.allianceWon === "Yes – Won" ? "text-green-400" : entry.allianceWon === "No – Lost" ? "text-destructive" : "text-muted-foreground"}`}>
                                {entry.allianceWon === "Yes – Won" ? "🏆 Won" : entry.allianceWon === "No – Lost" ? "❌ Lost" : "🤝 Tie"}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground font-body mt-0.5">
                            🔵 <span className="text-blue-400">{entry.scouterName}</span> · {new Date(entry.timestamp).toLocaleDateString()}
                          </p>
                        </div>
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
                      {entry.penaltyPointsGiven != null && <DataCell label="Penalty Pts Received" value={String(entry.penaltyPointsGiven)} />}
                    </div>
                    {(entry.penalties || []).filter(p => p !== "None observed").length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground font-body">Penalties we received: </span>
                        {entry.penalties.filter(p => p !== "None observed").map((p, i) => (
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
              allowFullScreen
              className="w-full h-full"
              title="FIRSTNevadaSouth Live Stream"
            />
          </div>
        </div>
      )}

      {/* ── APPROVALS TAB ── */}
      {activeTab === "approvals" && (
        <div className="space-y-4">
          <div className="glass rounded-xl p-4 border border-amber-500/30">
            <h2 className="font-display text-sm tracking-wider text-amber-400 mb-1">ACCOUNT APPROVALS</h2>
            <p className="text-xs text-muted-foreground font-body">Approve or deny new account requests</p>
          </div>

          {/* Pending */}
          {pendingUsers.filter(u => u.approval_status === "pending").length > 0 && (
            <div>
              <h3 className="text-xs font-display tracking-wider text-amber-400 mb-2 px-1">PENDING ({pendingUsers.filter(u => u.approval_status === "pending").length})</h3>
              {pendingUsers.filter(u => u.approval_status === "pending").map(user => (
                <div key={user.id} className="glass rounded-xl p-4 border border-amber-500/30 flex items-center justify-between mb-2">
                  <div>
                    <p className="font-display text-sm text-foreground tracking-wider">{user.display_name}</p>
                    <p className="text-xs text-muted-foreground font-body">{user.username} · {user.role}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproval(user.id, "approved")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-display tracking-wider hover:bg-emerald-500/30 transition-all"
                    >
                      ✓ APPROVE
                    </button>
                    <button
                      onClick={() => handleApproval(user.id, "denied")}
                      className="px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive border border-destructive/40 text-xs font-display tracking-wider hover:bg-destructive/30 transition-all"
                    >
                      ✗ DENY
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Denied */}
          {pendingUsers.filter(u => u.approval_status === "denied").length > 0 && (
            <div className="glass rounded-xl overflow-hidden border border-destructive/30">
              <div className="px-5 py-3.5 border-b border-destructive/20 flex items-center justify-between" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(220,38,38,0.04))" }}>
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-sm tracking-wider text-destructive">DENIED</h3>
                </div>
                <span className="text-xs font-display tracking-wider text-destructive/70">{pendingUsers.filter(u => u.approval_status === "denied").length} users</span>
              </div>
              <div className="divide-y divide-destructive/10">
                {pendingUsers.filter(u => u.approval_status === "denied").map(user => (
                  <div key={user.id} className="px-5 py-3 flex items-center justify-between opacity-70">
                    <div>
                      <p className="font-display text-sm text-foreground tracking-wider">{user.display_name}</p>
                      <p className="text-xs text-muted-foreground font-body">{user.username} · {user.role}</p>
                    </div>
                    <button
                      onClick={() => handleApproval(user.id, "approved")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-display tracking-wider hover:bg-emerald-500/30 transition-all"
                    >
                      APPROVE
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingUsers.length === 0 && (
            <div className="glass rounded-xl p-8 border border-border/50 text-center">
              <span className="text-4xl mb-3 block">✅</span>
              <p className="text-muted-foreground font-body">No pending accounts to review</p>
            </div>
          )}

          {/* Accepted Users */}
          <div className="glass rounded-xl overflow-hidden border border-emerald-500/30">
            <div className="px-5 py-3.5 border-b border-emerald-500/20 flex items-center justify-between" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04))" }}>
              <div className="flex items-center gap-3">
                <h3 className="font-display text-sm tracking-wider text-emerald-400">ACCEPTED</h3>
              </div>
              <span className="text-xs font-display tracking-wider text-emerald-400/70">{approvedUsers.length} users</span>
            </div>
            <div className="divide-y divide-emerald-500/10">
              {approvedUsers.map(user => (
                <div key={user.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-display text-sm text-foreground tracking-wider">{user.display_name}</p>
                    <p className="text-xs text-muted-foreground font-body">
                      {user.username} · <span className={
                        user.role === "master" ? "text-amber-400" :
                        user.role === "bluedriver" ? "text-blue-400" :
                        user.role === "coach" ? "text-amber-300" :
                        "text-muted-foreground"
                      }>{
                        user.role === "master" ? "Master" :
                        user.role === "bluedriver" ? "Driver Data" :
                        user.role === "coach" ? "Coach" :
                        user.role === "driveteam" ? "Drive Team" :
                        "Scout"
                      }</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        setUpdatingRole(user.user_id);
                        const { error } = await supabase.from("profiles").update({ approval_status: "denied" }).eq("user_id", user.user_id);
                        setUpdatingRole(null);
                        if (error) { toast.error("Failed to revoke"); return; }
                        toast.success(`${user.display_name} access revoked.`);
                        fetchPendingUsers();
                      }}
                      disabled={updatingRole === user.user_id}
                      className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/30 text-xs font-display tracking-wider hover:bg-destructive/20 hover:border-destructive/50 transition-all disabled:opacity-50"
                    >
                      ⛔ REVOKE
                    </button>
                    {user.role === "master" && (
                      <button
                        onClick={async () => {
                          setUpdatingRole(user.user_id);
                          await handleRoleUpdate(user.user_id, "scout");
                          setUpdatingRole(null);
                          fetchPendingUsers();
                        }}
                        disabled={updatingRole === user.user_id}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-display tracking-wider hover:bg-amber-500/20 hover:border-amber-500/50 transition-all disabled:opacity-50"
                      >
                        ⬇ DOWNGRADE
                      </button>
                    )}
                    <button
                      onClick={() => setUpgradeTarget({ userId: user.user_id, displayName: user.display_name })}
                      disabled={updatingRole === user.user_id}
                      className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/30 text-xs font-display tracking-wider hover:bg-primary/20 hover:border-primary/50 transition-all disabled:opacity-50"
                    >
                      ⬆ UPGRADE
                    </button>
                  </div>
                </div>
              ))}
              {approvedUsers.length === 0 && (
                <div className="px-5 py-6 text-center">
                  <p className="text-muted-foreground font-body text-sm">No accepted users yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Role Modal */}
      {upgradeTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-xl p-6 w-full max-w-sm mx-4 border border-primary/40 space-y-4">
            <h3 className="font-display text-lg text-primary tracking-wider">⬆ UPGRADE ACCESS</h3>
            <p className="text-sm text-muted-foreground font-body">
              Change role for <span className="text-foreground font-bold">{upgradeTarget.displayName}</span>
            </p>
            <div className="space-y-2">
              {[
                { role: "bluedriver", label: "🔵 Driver Data", desc: "Can submit drive data entries" },
                { role: "master", label: "👑 Master", desc: "Full admin access" },
              ].map(({ role, label, desc }) => (
                <button
                  key={role}
                  disabled={updatingRole === upgradeTarget.userId}
                  onClick={async () => {
                    await handleRoleUpdate(upgradeTarget.userId, role);
                    setUpgradeTarget(null);
                    fetchPendingUsers();
                  }}
                  className="w-full py-3 px-4 rounded-lg bg-muted border border-border text-left hover:border-primary/60 hover:bg-primary/10 transition-all disabled:opacity-50"
                >
                  <p className="font-display text-sm text-foreground tracking-wider">{label}</p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setUpgradeTarget(null)}
              className="w-full py-2 rounded-lg text-xs font-display tracking-wider border border-border text-muted-foreground hover:bg-muted/30 transition-all"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* ── SCOUT AI TAB ── */}
      {activeTab === "scoutai" && (
        <div className="max-w-7xl mx-auto px-4 py-8" style={{ height: "calc(100vh - 200px)" }}>
          <AIChatBot
            onBack={() => setActiveTab("dashboard")}
            userName={username}
            backLabel="← Dashboard"
          />
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
