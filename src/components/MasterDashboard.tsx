import { useState, useMemo } from "react";

interface MasterDashboardProps {
  onLogout: () => void;
}

interface ScoutingEntry {
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

// Scoring system to rank teams
const scoreEntry = (entry: ScoutingEntry): number => {
  let score = 0;

  // Auto scoring
  const autoArtifacts: Record<string, number> = { "0": 0, "1-2": 5, "3-4": 10, "5+": 15 };
  score += autoArtifacts[entry.autoArtifactsScored] || 0;

  const autoPattern: Record<string, number> = { "None": 0, "1 Pattern": 5, "2 Patterns": 10, "3+ Patterns": 15 };
  score += autoPattern[entry.autoPatternAlignment] || 0;

  if (entry.autoLaunchLine === "Yes") score += 5;
  if (entry.autoLeave === "Yes") score += 3;

  const autoConsistency: Record<string, number> = { "Very Consistent": 10, "Mostly Consistent": 6, "Inconsistent": 2, "No Auto": 0 };
  score += autoConsistency[entry.autoConsistency] || 0;

  // Teleop scoring
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

  // Endgame
  const parking: Record<string, number> = { "Yes – Full Park": 10, "Partial": 5, "No": 0 };
  score += parking[entry.endgameParking] || 0;

  const assist: Record<string, number> = { "Yes": 8, "Attempted": 4, "No": 0 };
  score += assist[entry.endgameAllianceAssist] || 0;

  // Penalty deductions
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
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ teamNumber: string; matchIndex: number } | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDelete = () => {
    if (deletePassword !== "Group Leader") {
      setDeleteError("Incorrect password.");
      return;
    }
    if (!deleteTarget) return;

    const raw: ScoutingEntry[] = JSON.parse(localStorage.getItem("scoutingData") || "[]");
    const teamEntries = raw.filter((e) => e.teamNumber === deleteTarget.teamNumber);
    const entryToRemove = teamEntries[deleteTarget.matchIndex];
    if (entryToRemove) {
      const idx = raw.indexOf(entryToRemove);
      if (idx !== -1) raw.splice(idx, 1);
      localStorage.setItem("scoutingData", JSON.stringify(raw));
    }
    setDeleteTarget(null);
    setDeletePassword("");
    setDeleteError("");
    setRefreshKey((k) => k + 1);
  };

  const teamSummaries = useMemo(() => {
    const raw: ScoutingEntry[] = JSON.parse(localStorage.getItem("scoutingData") || "[]");
    const byTeam: Record<string, ScoutingEntry[]> = {};

    raw.forEach((entry) => {
      const team = entry.teamNumber;
      if (!byTeam[team]) byTeam[team] = [];
      byTeam[team].push(entry);
    });

    const summaries: TeamSummary[] = Object.entries(byTeam).map(([teamNumber, entries]) => {
      const totalScore = entries.reduce((sum, e) => sum + scoreEntry(e), 0);
      const avgScore = totalScore / entries.length;
      const goodMatchResponses = entries
        .filter((e) => e.goodMatch?.trim())
        .map((e) => ({ scouter: e.scouterName, response: e.goodMatch }));

      return { teamNumber, avgScore, entries, goodMatchResponses };
    });

    summaries.sort((a, b) => b.avgScore - a.avgScore);
    return summaries;
  }, [refreshKey]);

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
              MASTER DATA
            </h1>
            <p className="text-xs text-muted-foreground font-body">Team Rankings Dashboard</p>
          </div>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-lg text-xs font-display tracking-wider border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-all duration-200"
          >
            LOGOUT
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {teamSummaries.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-muted-foreground font-body">No scouting data yet. Teams will appear here once scouts submit data.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground font-body mb-2">
              {teamSummaries.length} team{teamSummaries.length !== 1 ? "s" : ""} scouted • Ranked by composite score
            </p>

            {teamSummaries.map((team, index) => {
              const rank = index + 1;
              const isExpanded = expandedTeam === team.teamNumber;

              return (
                <div
                  key={team.teamNumber}
                  className={`glass rounded-xl overflow-hidden transition-all duration-300 ${
                    rank <= 3 ? "glow-primary" : ""
                  }`}
                >
                  {/* Main row - always visible */}
                  <button
                    onClick={() => setExpandedTeam(isExpanded ? null : team.teamNumber)}
                    className="w-full px-6 py-5 flex items-center gap-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    {/* Rank */}
                    <div className={`text-2xl font-display font-bold w-12 text-center ${getRankColor(rank)}`}>
                      {getRankIcon(rank)}
                    </div>

                    {/* Team info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3">
                        <span className="font-display text-lg text-foreground tracking-wider">
                          Team {team.teamNumber}
                        </span>
                        <span className="text-xs text-muted-foreground font-body">
                          {team.entries.length} match{team.entries.length !== 1 ? "es" : ""} scouted
                        </span>
                      </div>

                      {/* Good match preview */}
                      {team.goodMatchResponses.length > 0 && (
                        <p className="text-sm text-primary font-body mt-1 truncate">
                          💬 "{team.goodMatchResponses[0].response}"
                        </p>
                      )}
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <p className="font-display text-xl text-primary text-glow">{Math.round(team.avgScore)}</p>
                      <p className="text-xs text-muted-foreground font-body">pts avg</p>
                    </div>

                    {/* Expand icon */}
                    <span className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                      ▼
                    </span>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-6 pb-6 space-y-6 border-t border-border/50">
                      {/* Good Match Section - PROMINENT */}
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

                  {/* All match entries */}
                  {team.entries.map((entry, i) => (
                    <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-display text-sm text-foreground tracking-wider">
                            Match {entry.matchNumber || "N/A"} • Score: {scoreEntry(entry)}
                          </span>
                          <p className="text-xs text-muted-foreground font-body mt-0.5">
                            🧑‍💻 Scouted by <span className="text-foreground">{entry.scouterName || "Unknown"}</span> • {new Date(entry.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  setDeleteTarget({ teamNumber: team.teamNumber, matchIndex: i });
                                  setDeletePassword("");
                                  setDeleteError("");
                                }}
                                className="px-3 py-1 rounded-lg text-xs font-display tracking-wider bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-all duration-200"
                              >
                                DELETE
                              </button>
                            </div>
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

                          {/* Penalties */}
                          {(entry.penalties || []).length > 0 && (
                            <div>
                              <span className="text-xs text-muted-foreground font-body">Penalties: </span>
                              {(entry.penalties || []).map((p, j) => (
                                <span
                                  key={j}
                                  className={`inline-block text-xs px-2 py-0.5 rounded mr-1 mt-1 ${
                                    p === "None observed"
                                      ? "bg-glow-success/20 text-glow-success"
                                      : "bg-destructive/20 text-destructive"
                                  }`}
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Special features */}
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

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-xl p-6 w-full max-w-sm mx-4 border border-border space-y-4">
            <h3 className="font-display text-lg text-destructive tracking-wider">CONFIRM DELETE</h3>
            <p className="text-sm text-muted-foreground font-body">
              Enter the password to delete this match entry.
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => {
                setDeletePassword(e.target.value);
                setDeleteError("");
              }}
              onKeyDown={(e) => { if (e.key === "Enter") handleDelete(); }}
              placeholder="Enter password"
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm font-body focus:outline-none focus:ring-2 focus:ring-destructive/50"
            />
            {deleteError && (
              <p className="text-xs text-destructive font-body">{deleteError}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setDeletePassword("");
                  setDeleteError("");
                }}
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
