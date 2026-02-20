import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    // Check for recovery session from the email link
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidSession(true);
      }
    });
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      // Redirect to home after a moment
      setTimeout(() => {
        window.location.href = "/";
      }, 2500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-[100px] animate-pulse-glow" />

      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-primary text-glow-strong tracking-wider">
            MIGHTY MEADOWBOTS
          </h1>
          <p className="mt-4 text-muted-foreground font-body text-sm tracking-widest uppercase">
            Reset Password
          </p>
        </div>

        <div className="glass rounded-xl p-8 glow-primary">
          {success ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">✅</div>
              <p className="text-green-400 font-body font-semibold">Password updated successfully!</p>
              <p className="text-muted-foreground text-sm font-body">Redirecting you to login...</p>
            </div>
          ) : !validSession ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground font-body text-sm">
                This link may have expired or already been used. Please request a new password reset from the login page.
              </p>
              <a
                href="/"
                className="inline-block mt-2 text-primary font-display text-sm tracking-wider hover:underline"
              >
                ← Back to Login
              </a>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <h2 className="text-foreground font-display tracking-wider text-center mb-2">SET NEW PASSWORD</h2>

              <div>
                <label className="block text-sm font-body text-muted-foreground mb-2">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all duration-300"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-sm font-body text-muted-foreground mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all duration-300"
                  autoComplete="new-password"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-display font-semibold tracking-wider hover:glow-primary-strong transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? "UPDATING..." : "SET NEW PASSWORD"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-muted-foreground/40 text-xs mt-6 font-body">
          FTC DECODE™ 2025–2026 Season
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
