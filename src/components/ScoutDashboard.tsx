import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ScoutDashboardProps {
  onLogout: () => void;
}

interface ScoutingEntry {
  id: string;
  scouter_name: string;
  team_number: string;
  match_number: string | null;
}

interface TeamAssignment {
  scout_name: string;
  team_number: string;
  team_name: string;
  qual_matches: string[];
}

const ScoutDashboard = ({ onLogout }: ScoutDashboardProps) => {
  const [entries, setEntries] = useState<ScoutingEntry[]>([]);
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"progress" | "rankings">("progress");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [{ data: entriesData }, { data: assignmentsData }] = await Promise.all([
        supabase.from("scouting_entries").select("id, scouter_name, team_number, match_number"),
        supabase.from("team_assignments").select("scout_name, team_number, team_name, qual_matches"),
      ]);
      if (entriesData) setEntries(entriesData);
      if (assignmentsData) setAssignments(assignmentsData);
      setLoading(false);
    };
    fetchData();
  }, []);

  const isMatchDone = (assignment: TeamAssignment, match: string) =>
    entries.some(
      (e) =>
        e.scouter_name === assignment.scout_name &&
        e.team_number === assignment.team_number &&
        e.match_number?.toUpperCase() === match.toUpperCase()
    );

  const assignedScouts = assignments.filter((a) => a.team_number);

  // Simple team ranking by number of entries
  const teamCounts: Record<string, number> = {};
  entries.forEach((e) => {
    teamCounts[e.team_number] = (teamCounts[e.team_number] || 0) + 1;
  });
  const rankedTeams = Object.entries(teamCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed top-0 left-0 w-full h-64 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl text-accent text-glow tracking-wider">
              SCOUT DASHBOARD
            </h1>
            <p className="text-xs text-muted-foreground font-body">Read-only · Live Progress View</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setLoading(true);
                Promise.all([
                  supabase.from("scouting_entries").select("id, scouter_name, team_number, match_number"),
                  supabase.from("team_assignments").select("scout_name, team_number, team_name, qual_matches"),
                ]).then(([{ data: e }, { data: a }]) => {
                  if (e) setEntries(e);
                  if (a) setAssignments(a);
                  setLoading(false);
                });
              }}
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
        <div className="max-w-3xl mx-auto px-4 flex gap-1 pb-2">
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
            onClick={() => setActiveTab("rankings")}
            className={`px-4 py-1.5 rounded-lg text-xs font-display tracking-wider transition-all duration-200 ${
              activeTab === "rankings"
                ? "bg-primary/20 text-primary border border-primary/40"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            📊 TEAMS SCOUTED
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground font-body text-sm">Loading...</div>
        ) : activeTab === "progress" ? (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass rounded-xl p-4 text-center border border-border/50">
                <p className="font-display text-2xl text-primary text-glow">{entries.length}</p>
                <p className="text-xs text-muted-foreground font-body mt-1">Total Entries</p>
              </div>
              <div className="glass rounded-xl p-4 text-center border border-border/50">
                <p className="font-display text-2xl text-primary text-glow">{assignedScouts.length}</p>
                <p className="text-xs text-muted-foreground font-body mt-1">Scouts Assigned</p>
              </div>
              <div className="glass rounded-xl p-4 text-center border border-border/50">
                <p className="font-display text-2xl text-primary text-glow">
                  {assignedScouts.filter((a) => {
                    const m = a.qual_matches || [];
                    return m.length > 0 && m.every((q) => isMatchDone(a, q));
                  }).length}
                </p>
                <p className="text-xs text-muted-foreground font-body mt-1">Scouts Done</p>
              </div>
            </div>

            {/* Scout cards */}
            {assignedScouts.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center border border-border/50">
                <p className="text-muted-foreground font-body text-sm">No scout assignments yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignedScouts.map((assignment) => {
                  const matches = assignment.qual_matches || [];
                  const doneCount = matches.filter((m) => isMatchDone(assignment, m)).length;
                  const allDone = matches.length > 0 && doneCount === matches.length;

                  return (
                    <div
                      key={assignment.scout_name}
                      className={`glass rounded-xl p-4 border transition-all duration-200 ${
                        allDone ? "border-green-500/40" : "border-border/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div>
                          <span className="font-display text-sm text-foreground tracking-wide">
                            {assignment.scout_name}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground font-body">
                            → Team {assignment.team_number}
                            {assignment.team_name ? ` · ${assignment.team_name}` : ""}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-display tracking-wider px-2 py-0.5 rounded-full ${
                            allDone
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-muted text-muted-foreground border border-border/50"
                          }`}
                        >
                          {doneCount}/{matches.length} DONE
                        </span>
                      </div>
                      {matches.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {matches.map((match) => {
                            const done = isMatchDone(assignment, match);
                            return (
                              <span
                                key={match}
                                className={`px-2 py-0.5 rounded text-xs font-display tracking-wide ${
                                  done
                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                                }`}
                              >
                                {match}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Rankings tab */
          <div className="glass rounded-xl overflow-hidden border border-border/50">
            <div className="px-5 py-3.5 border-b border-border/30">
              <h3 className="font-display text-sm tracking-wider text-foreground">TEAMS SCOUTED</h3>
            </div>
            {rankedTeams.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground font-body text-sm">No data yet.</div>
            ) : (
              <div className="divide-y divide-border/30">
                {rankedTeams.map(([team, count], i) => (
                  <div key={team} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-xs text-muted-foreground w-5">{i + 1}</span>
                      <span className="font-display text-sm text-foreground">Team {team}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-body">
                      {count} {count === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoutDashboard;
