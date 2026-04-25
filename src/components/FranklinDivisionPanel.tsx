import { useMemo, useState } from "react";
import { FRANKLIN_TEAMS } from "@/lib/franklinDivision";

interface FranklinDivisionPanelProps {
  /** All match scouting entries (from `scouting_entries`). Used to count matches scouted per team. */
  matchEntries: { team_number?: string; teamNumber?: string }[];
  /** All pit scouting entries (from `pit_scouting_entries`). Used to mark green/red. */
  pitEntries: { team_number?: string; teamNumber?: string }[];
}

const getTN = (e: { team_number?: string; teamNumber?: string }) =>
  (e.team_number ?? e.teamNumber ?? "").toString().trim();

const FranklinDivisionPanel = ({ matchEntries, pitEntries }: FranklinDivisionPanelProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const pitSet = useMemo(() => {
    const s = new Set<string>();
    pitEntries.forEach((p) => {
      const tn = getTN(p);
      if (tn) s.add(tn);
    });
    return s;
  }, [pitEntries]);

  const matchCounts = useMemo(() => {
    const m: Record<string, number> = {};
    matchEntries.forEach((e) => {
      const tn = getTN(e);
      if (!tn) return;
      m[tn] = (m[tn] || 0) + 1;
    });
    return m;
  }, [matchEntries]);

  const pitDoneCount = useMemo(
    () => FRANKLIN_TEAMS.filter((t) => pitSet.has(t.number)).length,
    [pitSet]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FRANKLIN_TEAMS;
    return FRANKLIN_TEAMS.filter(
      (t) =>
        t.number.includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.country.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="glass rounded-xl overflow-hidden border border-purple-400/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 py-3.5 flex items-center justify-between gap-4 border-b border-purple-400/30 hover:bg-purple-400/5 transition-colors"
        style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.14), rgba(124,58,237,0.06))" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">🏟️</span>
          <h3
            className="font-display text-sm tracking-wider"
            style={{ color: "#c084fc", textShadow: "0 0 8px rgba(192,132,252,0.5)" }}
          >
            DIVISION — FRANKLIN
          </h3>
          <span className="text-[10px] font-display tracking-wider px-2 py-0.5 rounded-md bg-purple-400/15 text-purple-200 border border-purple-400/30">
            {FRANKLIN_TEAMS.length} TEAMS
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-display tracking-wider text-purple-200/80">
            PIT {pitDoneCount}/{FRANKLIN_TEAMS.length}
          </span>
          <span
            className="text-purple-300 text-base transition-transform duration-200"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            ▾
          </span>
        </div>
      </button>

      {open && (
        <div>
          <div className="px-4 py-3 border-b border-purple-400/20 bg-background/30">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by team number, name, or city…"
              className="w-full px-3 py-2 rounded-md bg-muted/40 border border-border/50 text-sm font-body text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-purple-400/60"
            />
            <div className="flex items-center gap-4 mt-2 text-[10px] font-display tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-green-400/80 inline-block" />
                <span className="text-muted-foreground">PIT SCOUTED</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-400/80 inline-block" />
                <span className="text-muted-foreground">NOT PIT SCOUTED</span>
              </span>
            </div>
          </div>

          <div className="divide-y divide-purple-400/10 max-h-[480px] overflow-y-auto">
            {filtered.map((t) => {
              const pitDone = pitSet.has(t.number);
              const matches = matchCounts[t.number] || 0;
              const nameColor = pitDone ? "#4ade80" : "#f87171";
              const nameGlow = pitDone
                ? "0 0 6px rgba(74,222,128,0.45)"
                : "0 0 6px rgba(248,113,113,0.45)";
              return (
                <div
                  key={t.number}
                  className="px-5 py-2.5 flex items-center justify-between gap-3 hover:bg-purple-400/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-display text-xs tracking-wider text-purple-300/80 w-14 shrink-0">
                      #{t.number}
                    </span>
                    <div className="min-w-0">
                      <p
                        className="font-body text-sm truncate"
                        style={{ color: nameColor, textShadow: nameGlow }}
                        title={t.name}
                      >
                        {t.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-body truncate">
                        {t.city}, {t.region} · {t.country}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">
                      Matches Scouted
                    </p>
                    <p
                      className={`font-display text-base ${
                        matches > 0 ? "text-purple-300" : "text-muted-foreground/60"
                      }`}
                    >
                      {matches}
                    </p>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-5 py-6 text-center text-xs text-muted-foreground font-body">
                No teams match your search.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FranklinDivisionPanel;
