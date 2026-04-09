import { useState, useEffect } from "react";

// April 29, 2026 at 8:00 AM CDT (Houston, TX) = UTC-5 during daylight saving
const TARGET = new Date("2026-04-29T13:00:00Z").getTime();

const ChampionshipCountdown = () => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, TARGET - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  if (diff <= 0) {
    return null;
  }

  const weeks = Math.round(days / 7);

  const blocks = [
    { value: `~${weeks}`, label: "WKS" },
    { value: days, label: "DAYS" },
    { value: hours, label: "HRS" },
    { value: mins, label: "MIN" },
    { value: secs, label: "SEC" },
  ];

  return (
    <div className="w-full py-3 px-4 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-b border-primary/20">
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-primary font-display text-xs sm:text-sm tracking-[0.2em] font-bold">
          🏆 FIRST WORLD CHAMPIONSHIP 🏆
        </span>
        <div className="flex items-center gap-2 sm:gap-4">
          {blocks.map((b) => (
            <div key={b.label} className="flex flex-col items-center">
              <span className="text-foreground font-display text-xl sm:text-2xl font-black tabular-nums leading-none">
                {typeof b.value === "number" ? String(b.value).padStart(2, "0") : b.value}
              </span>
              <span className="text-muted-foreground text-[10px] sm:text-xs font-display tracking-wider mt-0.5">
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChampionshipCountdown;
