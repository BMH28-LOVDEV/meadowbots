import { useState } from "react";
import { findTeamMember } from "@/lib/teamAuth";

interface LoginScreenProps {
  onLogin: (name: string) => void;
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [pendingMaster, setPendingMaster] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [masterError, setMasterError] = useState("");

  const shake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingMaster) {
      if (masterPassword === "MeadowBots") {
        onLogin("Master Data");
      } else {
        setMasterError("Incorrect password.");
        shake();
      }
      return;
    }
    const match = findTeamMember(name);
    if (match === "Master Data") {
      setPendingMaster(true);
      setMasterPassword("");
      setMasterError("");
    } else if (match) {
      setError("");
      onLogin(match);
    } else {
      setError("Name not recognized. Please enter your team name.");
      shake();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />

      <div className={`w-full max-w-md mx-4 ${isShaking ? "animate-[shake_0.5s_ease-in-out]" : ""}`}>
        {/* Team header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-primary text-glow-strong tracking-wider">
            MIGHTY MEADOWBOTS
          </h1>
          <div className="flex items-center justify-center gap-3 mt-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/40" />
            <span className="text-primary/80 font-display text-sm tracking-[0.3em]">BLUE #14841</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/40" />
          </div>
          <p className="mt-4 text-muted-foreground font-body text-sm tracking-widest uppercase">
            Scouting Portal
          </p>
        </div>

        {/* Login card */}
        <div className="glass rounded-xl p-8 glow-primary">
          <h2 className="text-xl font-display text-foreground mb-6 text-center tracking-wide">
            {pendingMaster ? "MASTER ACCESS" : "IDENTIFY YOURSELF"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {!pendingMaster ? (
              <div>
                <label htmlFor="name" className="block text-sm font-body text-muted-foreground mb-2">
                  Enter your full name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  placeholder="First Last"
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all duration-300"
                  autoComplete="off"
                />
                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
              </div>
            ) : (
              <div>
                <label htmlFor="master-pw" className="block text-sm font-body text-muted-foreground mb-2">
                  Enter the Master Data password
                </label>
                <input
                  id="master-pw"
                  type="password"
                  value={masterPassword}
                  onChange={(e) => { setMasterPassword(e.target.value); setMasterError(""); }}
                  placeholder="Password"
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all duration-300"
                />
                {masterError && <p className="mt-2 text-sm text-destructive">{masterError}</p>}
                <button
                  type="button"
                  onClick={() => { setPendingMaster(false); setName(""); setMasterPassword(""); setMasterError(""); }}
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground font-body transition-colors"
                >
                  ← Back
                </button>
              </div>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-display font-semibold tracking-wider hover:glow-primary-strong transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {pendingMaster ? "UNLOCK" : "ENTER"}
            </button>
          </form>
        </div>

        <p className="text-center text-muted-foreground/40 text-xs mt-6 font-body">
          FTC DECODE™ 2025–2026 Season
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
