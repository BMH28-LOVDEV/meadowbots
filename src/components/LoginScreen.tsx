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
  const [pendingScout, setPendingScout] = useState<string | null>(null);
  const [pendingLockdown, setPendingLockdown] = useState(false);
  const [pendingLetsGo, setPendingLetsGo] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [masterError, setMasterError] = useState("");

  const shake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Step 2a: Master password
    if (pendingMaster) {
      if (masterPassword === "MeadowBots") {
        onLogin("MeadowBot Master");
      } else {
        setMasterError("Incorrect password.");
        shake();
      }
      return;
    }

    // Step 2b: Lockdown password
    if (pendingLockdown) {
      if (masterPassword === "BennyGF28!") {
        onLogin("Lockdown");
      } else {
        setMasterError("Incorrect password.");
        shake();
      }
      return;
    }

    // Step 2c: Let's Go password (14841)
    if (pendingLetsGo) {
      if (masterPassword === "14841") {
        onLogin("Lets Go");
      } else {
        setMasterError("Incorrect password.");
        shake();
      }
      return;
    }

    // Step 2d: Scout password
    if (pendingScout) {
      if (password.toLowerCase() === "meadowbots") {
        onLogin(pendingScout);
      } else {
        setPasswordError("Incorrect password.");
        shake();
      }
      return;
    }

    // Step 1: Name lookup
    const match = findTeamMember(name);
    if (match === "MeadowBot Master") {
      setPendingMaster(true);
      setMasterPassword("");
      setMasterError("");
    } else if (match === "Lockdown") {
      setPendingLockdown(true);
      setMasterPassword("");
      setMasterError("");
    } else if (match === "Lets Go") {
      setPendingLetsGo(true);
      setMasterPassword("");
      setMasterError("");
    } else if (match) {
      setPendingScout(match);
      setPassword("");
      setPasswordError("");
      setError("");
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
            {pendingMaster ? "MASTER ACCESS" : pendingLockdown ? "🔒 LOCKDOWN ACCESS" : pendingLetsGo ? "🎉 LET'S GO! ACCESS" : pendingScout ? "TEAM PASSWORD" : "AUTHENTICATION"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {!pendingMaster && !pendingLockdown && !pendingLetsGo && !pendingScout ? (
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
            ) : pendingScout ? (
              <div>
                <p className="text-sm font-body text-foreground mb-1">Welcome, <span className="text-primary font-semibold">{pendingScout}</span>!</p>
                <label htmlFor="scout-pw" className="block text-sm font-body text-muted-foreground mb-2">
                  Enter the team password
                </label>
                <input
                  id="scout-pw"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                  placeholder="Password"
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all duration-300"
                />
                {passwordError && <p className="mt-2 text-sm text-destructive">{passwordError}</p>}
                <button
                  type="button"
                  onClick={() => { setPendingScout(null); setName(""); setPassword(""); setPasswordError(""); }}
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground font-body transition-colors"
                >
                  ← Back
                </button>
              </div>
            ) : pendingLockdown ? (
              <div>
                <p className="text-sm font-body text-destructive mb-3">⚠️ Lockdown requires master authorization.</p>
                <label htmlFor="lockdown-pw" className="block text-sm font-body text-muted-foreground mb-2">
                  Enter the master password
                </label>
                <input
                  id="lockdown-pw"
                  type="password"
                  value={masterPassword}
                  onChange={(e) => { setMasterPassword(e.target.value); setMasterError(""); }}
                  placeholder="Password"
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-destructive/40 focus:border-destructive focus:ring-1 focus:ring-destructive text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all duration-300"
                />
                {masterError && <p className="mt-2 text-sm text-destructive">{masterError}</p>}
                <button
                  type="button"
                  onClick={() => { setPendingLockdown(false); setName(""); setMasterPassword(""); setMasterError(""); }}
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground font-body transition-colors"
                >
                  ← Back
                </button>
              </div>
            ) : pendingLetsGo ? (
              <div>
                <p className="text-sm font-body mb-3" style={{ color: "#4ade80" }}>🎉 Let's celebrate — enter the password!</p>
                <label htmlFor="letsgo-pw" className="block text-sm font-body text-muted-foreground mb-2">
                  Enter the password
                </label>
                <input
                  id="letsgo-pw"
                  type="password"
                  value={masterPassword}
                  onChange={(e) => { setMasterPassword(e.target.value); setMasterError(""); }}
                  placeholder="Password"
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg bg-muted border focus:ring-1 text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all duration-300"
                  style={{ borderColor: "rgba(74,222,128,0.4)" }}
                />
                {masterError && <p className="mt-2 text-sm text-destructive">{masterError}</p>}
                <button
                  type="button"
                  onClick={() => { setPendingLetsGo(false); setName(""); setMasterPassword(""); setMasterError(""); }}
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground font-body transition-colors"
                >
                  ← Back
                </button>
              </div>
            ) : (
              <div>
                <label htmlFor="master-pw" className="block text-sm font-body text-muted-foreground mb-2">
                  Enter the MeadowBot Master password
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
              {pendingMaster || pendingScout || pendingLockdown || pendingLetsGo ? "UNLOCK" : "ENTER"}
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
