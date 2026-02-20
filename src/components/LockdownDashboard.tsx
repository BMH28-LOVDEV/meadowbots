import { useState } from "react";

interface LockdownDashboardProps {
  onLogout: () => void;
}

const LockdownDashboard = ({ onLogout }: LockdownDashboardProps) => {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const shake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "BennyGF28!") {
      setLocked(true);
    } else {
      setError("Wrong password. Access denied.");
      setPassword("");
      shake();
    }
  };

  if (locked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-destructive/10 animate-pulse" />
        <div className="text-center z-10 space-y-6">
          <div className="text-8xl animate-bounce">🔴</div>
          <h1 className="text-5xl font-display font-bold text-destructive tracking-widest animate-pulse">
            SITE LOCKED
          </h1>
          <p className="text-destructive/70 font-body tracking-widest text-lg">EMERGENCY LOCKDOWN ACTIVE</p>
          <p className="text-muted-foreground font-body text-sm mt-8">Contact team leadership to restore access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-destructive/5 rounded-full blur-[120px] animate-pulse" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-md border-b border-destructive/20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl text-destructive tracking-wider">
              🔒 LOCKDOWN CONSOLE
            </h1>
            <p className="text-xs text-muted-foreground font-body">Emergency Access Panel</p>
          </div>
          <button
            onClick={onLogout}
            className="text-xs text-muted-foreground hover:text-foreground font-body transition-colors px-3 py-1 rounded border border-border hover:border-foreground/30"
          >
            EXIT
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="pt-24 pb-16 px-4 w-full max-w-lg text-center space-y-8">
        <div className="glass rounded-xl p-10 border border-destructive/20 space-y-6">
          <div className="text-6xl">⚠️</div>
          <h2 className="font-display text-2xl text-foreground tracking-wide">EMERGENCY SHUTDOWN</h2>
          <p className="text-muted-foreground font-body text-sm leading-relaxed">
            This will lock down the scouting portal immediately. Only use in case of emergency.
          </p>

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="w-full py-6 rounded-xl bg-destructive text-white font-display text-xl font-bold tracking-widest hover:bg-destructive/80 active:scale-95 transition-all duration-200 shadow-lg shadow-destructive/40 hover:shadow-destructive/60"
              style={{ boxShadow: "0 0 40px rgba(239,68,68,0.4)" }}
            >
              🔴 EMERGENCY SHUTDOWN
            </button>
          ) : (
            <div className={`space-y-4 ${isShaking ? "animate-[shake_0.5s_ease-in-out]" : ""}`}>
              <p className="text-destructive font-display tracking-wide text-sm">
                CONFIRM WITH MASTER PASSWORD
              </p>
              <form onSubmit={handleConfirm} className="space-y-3">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Master password"
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-destructive/40 focus:border-destructive focus:ring-1 focus:ring-destructive text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all duration-300 text-center"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setConfirming(false); setPassword(""); setError(""); }}
                    className="flex-1 py-3 rounded-lg border border-border text-muted-foreground font-body hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-lg bg-destructive text-white font-display font-bold tracking-wider hover:bg-destructive/80 transition-all duration-200"
                  >
                    CONFIRM LOCKDOWN
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <p className="text-muted-foreground/30 text-xs font-body">
          Lockdown Console · For authorized personnel only
        </p>
      </div>
    </div>
  );
};

export default LockdownDashboard;
