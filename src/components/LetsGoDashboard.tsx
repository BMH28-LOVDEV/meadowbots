import { useState } from "react";
import { useCelebration } from "@/hooks/useCelebration";
import CelebrationOverlay from "@/components/CelebrationOverlay";

const LETSGO_PASSWORD = "BennyGF28!";

interface LetsGoDashboardProps {
  onLogout: () => void;
}

const LetsGoDashboard = ({ onLogout }: LetsGoDashboardProps) => {
  const { celebrating, triggerCelebration } = useCelebration();
  const [pressed, setPressed] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handlePressAttempt = () => {
    setPasswordInput("");
    setPasswordError("");
    setShowPasswordModal(true);
  };

  const handlePasswordConfirm = async () => {
    if (passwordInput !== LETSGO_PASSWORD) {
      setPasswordError("Incorrect password.");
      return;
    }
    setShowPasswordModal(false);
    setPressed(true);
    await triggerCelebration();
    setTimeout(() => setPressed(false), 6000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      <CelebrationOverlay visible={celebrating} />

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-green-400/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-background/80 backdrop-blur-md border-b border-green-500/20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl tracking-wider" style={{ color: "#4ade80", textShadow: "0 0 12px rgba(74,222,128,0.5)" }}>
              🎉 LET'S GO!
            </h1>
            <p className="text-xs text-muted-foreground font-body">Celebration Console</p>
          </div>
          <button
            onClick={onLogout}
            className="text-xs text-muted-foreground hover:text-foreground font-body transition-colors px-3 py-1 rounded border border-border hover:border-foreground/30"
          >
            LOGOUT
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="pt-24 pb-16 px-4 w-full max-w-lg text-center space-y-8">
        <div className="glass rounded-xl p-10 border border-green-500/20 space-y-6">
          <div className="text-6xl">{celebrating ? "🏆" : "🎉"}</div>
          <h2 className="font-display text-2xl text-foreground tracking-wide">TEAM CELEBRATION</h2>
          <p className="text-muted-foreground font-body text-sm leading-relaxed">
            Press the button to send a celebration to <span className="text-green-400 font-semibold">everyone's screen</span> right now!
          </p>

          <button
            onClick={handlePressAttempt}
            disabled={pressed}
            className="w-full py-8 rounded-xl font-display text-2xl font-bold tracking-widest transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: pressed
                ? "linear-gradient(135deg, #16a34a, #15803d)"
                : "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "white",
              boxShadow: pressed
                ? "0 0 20px rgba(34,197,94,0.3)"
                : "0 0 50px rgba(34,197,94,0.5), 0 0 100px rgba(34,197,94,0.2)",
            }}
          >
            {pressed ? "🎊 CELEBRATING! 🎊" : "🟢 LET'S GO!"}
          </button>

          <p className="text-muted-foreground/40 text-xs font-body">
            Triggers confetti + celebration message on all connected screens
          </p>
        </div>

        <p className="text-muted-foreground/30 text-xs font-body">
          Let's Go Console · MeadowBots #14841
        </p>
      </div>

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-background border border-green-500/30 rounded-xl p-8 w-full max-w-sm space-y-5 shadow-2xl">
            <h3 className="font-display text-lg text-foreground tracking-wide text-center">🔒 CONFIRM LET'S GO</h3>
            <p className="text-muted-foreground text-sm font-body text-center">Enter the password to trigger the celebration.</p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordConfirm()}
              placeholder="Password"
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground font-body text-sm focus:outline-none focus:border-green-500/60"
              autoFocus
            />
            {passwordError && <p className="text-red-400 text-xs text-center font-body">{passwordError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 py-2 rounded-lg border border-border text-muted-foreground text-sm font-body hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordConfirm}
                className="flex-1 py-2 rounded-lg text-sm font-body font-bold text-white transition-all"
                style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LetsGoDashboard;
