import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LoginScreenProps {
  onLogin: () => void;
}

const EMAIL_DOMAIN = "@themeadowsschool.org";

type Mode = "login" | "signup" | "forgot";

// Detect email type from prefix
// Student: first_last (contains underscore)
// Teacher/Coach: BHale (starts with capital letter, no underscore)
type EmailType = "student" | "staff";

function detectEmailType(prefix: string): EmailType {
  if (prefix.includes("_")) return "student";
  // Single capital letter followed by lowercase last name (teacher format)
  if (/^[A-Za-z][a-z]+$/.test(prefix) && prefix.length >= 3) return "staff";
  return "student";
}

// Special role assignments by email prefix (case-insensitive)
const BLUE_DRIVER_PREFIXES: string[] = [];
const COACH_PREFIXES = ["devin_allen"];
const MASTER_PREFIXES = ["maxwell_tran", "benjamin_hale"];

function getAssignedRole(prefix: string): string {
  const lower = prefix.trim().toLowerCase();
  if (MASTER_PREFIXES.includes(lower)) return "master";
  if (COACH_PREFIXES.includes(lower)) return "coach";
  if (BLUE_DRIVER_PREFIXES.includes(lower)) return "bluedriver";
  return "scout";
}

// Build display name from email prefix
// Student: first_last → "First Last"
// Teacher: BHale → "B. Hale" isn't ideal — we'll just title-case: "Bhale" → store as-is
// Actually for staff we can't reliably parse first/last without separator, so store prefix capitalized
function buildDisplayName(prefix: string, emailType: EmailType): string {
  if (emailType === "student") {
    return prefix
      .split("_")
      .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(" ");
  } else {
    // Teacher format e.g. BHale → capitalize first letter
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [mode, setMode] = useState<Mode>("login");
  const [accountCreated, setAccountCreated] = useState(false);

  // Login fields
  const [loginPrefix, setLoginPrefix] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup fields
  const [signupPrefix, setSignupPrefix] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  // Forgot password fields
  const [forgotPrefix, setForgotPrefix] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const [isShaking, setIsShaking] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  

  const shake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Auto-derived display name (read-only preview during signup)
  const signupEmailType = detectEmailType(signupPrefix);
  const signupDisplayName = signupPrefix.trim()
    ? buildDisplayName(signupPrefix.trim(), signupEmailType)
    : "";

  // Staff-type accounts get coach role unless they're a known bluedriver
  function resolveRole(prefix: string, emailType: EmailType): string {
    const special = getAssignedRole(prefix);
    if (special !== "scout") return special; // coach or bluedriver takes priority
    if (emailType === "staff") return "coach";
    return "scout";
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (!forgotPrefix.trim()) {
      setForgotError("Please enter your school email prefix.");
      shake();
      return;
    }
    const email = forgotPrefix.trim() + EMAIL_DOMAIN;
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      setForgotError(error.message);
      shake();
    } else {
      setForgotSent(true);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPrefix.trim()) {
      setLoginError("Please enter your school email prefix.");
      shake();
      return;
    }
    // Preserve exact casing for login (teacher emails are case-sensitive like BHale)
    const email = loginPrefix.trim() + EMAIL_DOMAIN;
    setLoginLoading(true);
    setLoginError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password: loginPassword });
    setLoginLoading(false);

    if (error) {
      // Check if the account doesn't exist at all — show Access Denied for the laughs
      const errorMsg = error.message?.toLowerCase() || "";
      if (errorMsg.includes("invalid login credentials")) {
        setAccessDenied(true);
      } else {
        setLoginError(error.message);
        shake();
      }
    } else {
      onLogin();
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError("");

    if (!signupPrefix.trim()) {
      setSignupError("Please enter your school email prefix.");
      shake(); return;
    }
    if (signupPassword.length < 6) {
      setSignupError("Password must be at least 6 characters.");
      shake(); return;
    }
    if (signupPassword !== signupConfirm) {
      setSignupError("Passwords do not match.");
      shake(); return;
    }

    const prefix = signupPrefix.trim();
    const email = prefix + EMAIL_DOMAIN;
    const emailType = detectEmailType(prefix);
    const displayName = buildDisplayName(prefix, emailType);
    const assignedRole = resolveRole(prefix, emailType);

    setSignupLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password: signupPassword });

    if (error) {
      setSignupError(error.message);
      setSignupLoading(false);
      shake();
      return;
    }

    // Profile is auto-created by a database trigger (handle_new_user)
    // No client-side insert needed — avoids RLS issues before session is established

    setSignupLoading(false);
    setAccountCreated(true);
    setMode("login");
  };

  // Role label for preview
  const rolePreviewLabel = () => {
    const prefix = signupPrefix.trim().toLowerCase();
    if (COACH_PREFIXES.includes(prefix)) return "🏆 Coach";
    if (BLUE_DRIVER_PREFIXES.includes(prefix)) return "🔵 Drive Data Collector";
    const emailType = detectEmailType(signupPrefix.trim());
    if (emailType === "staff") return "🏆 Coach";
    return "🔍 Scouter";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-6">
      {/* ACCESS DENIED OVERLAY */}
      {accessDenied && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-destructive/95 backdrop-blur-sm">
          <div className="text-center px-8 py-12 max-w-lg mx-4">
            <div className="text-7xl md:text-9xl mb-6 animate-pulse">🚫</div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 tracking-wider">
              ACCESS DENIED
            </h1>
            <p className="text-white/80 font-body text-lg mb-2">
              You are not authorized to access this system.
            </p>
            <p className="text-white/60 font-body text-sm mb-8">
              Nice try though 😏
            </p>
            <button
              onClick={() => { setAccessDenied(false); setLoginError(""); setLoginPassword(""); }}
              className="px-6 py-3 rounded-lg bg-white/20 text-white font-display font-semibold tracking-wider hover:bg-white/30 transition-all duration-300 border border-white/30"
            >
              ← TRY AGAIN
            </button>
          </div>
        </div>
      )}


      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />

      <div className={`w-full max-w-sm ${isShaking ? "animate-[shake_0.5s_ease-in-out]" : ""}`}>
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

        {/* Card */}
        <div className="glass rounded-xl p-6 sm:p-8 glow-primary">
          {mode !== "forgot" && (
            <div className="flex mb-6 rounded-lg bg-muted p-1 gap-1">
              <button
                onClick={() => { setMode("login"); }}
                className={`flex-1 py-2 rounded-md font-display text-sm tracking-wider transition-all ${mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                LOG IN
              </button>
              <button
                onClick={() => { setMode("signup"); setSignupError(""); setAccountCreated(false); }}
                className={`flex-1 py-2 rounded-md font-display text-sm tracking-wider transition-all ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                CREATE ACCOUNT
              </button>
            </div>
          )}

          {accountCreated && mode === "login" && (
            <div className="mb-5 px-4 py-3 rounded-lg border border-blue-500/50 bg-blue-500/10 text-blue-400 text-sm font-body text-center">
              ✅ Account Created. Please now log in with your new account.
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-2">
                  School Email
                </label>
                <div className="flex items-stretch rounded-lg overflow-hidden border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all duration-300 bg-muted">
                  <input
                    type="text"
                    value={loginPrefix}
                    onChange={e => { setLoginPrefix(e.target.value); setLoginError(""); }}
                    placeholder="first_last or JSmith"
                    className="flex-1 px-4 py-3 bg-transparent text-foreground placeholder:text-muted-foreground/50 font-body outline-none"
                    autoComplete="username"
                    autoCapitalize="none"
                  />
                  <span className="flex items-center px-3 text-muted-foreground/60 font-body text-sm bg-muted/50 border-l border-border select-none whitespace-nowrap">
                    {EMAIL_DOMAIN}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground/50 font-body">
                  Students: <span className="text-primary/60">first_last</span> · Teachers: <span className="text-primary/60">JSmith</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-body text-muted-foreground mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={e => { setLoginPassword(e.target.value); setLoginError(""); }}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all duration-300"
                  autoComplete="current-password"
                />
              </div>

              {loginError && <p className="text-sm text-destructive">{loginError}</p>}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-display font-semibold tracking-wider hover:glow-primary-strong transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
              >
                {loginLoading ? "LOGGING IN..." : "LOG IN"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setForgotError(""); setForgotSent(false); }}
                  className="text-xs text-muted-foreground/60 hover:text-primary font-body transition-colors duration-200 underline underline-offset-2"
                >
                  Forgot your password?
                </button>
              </div>
            </form>
          ) : mode === "forgot" ? (
            <div className="space-y-5">
              <div className="text-center mb-2">
                <h2 className="text-foreground font-display tracking-wider">FORGOT PASSWORD</h2>
                <p className="text-muted-foreground text-xs font-body mt-1">
                  Enter your school email prefix and we'll send a reset link.
                </p>
              </div>

              {forgotSent ? (
                <div className="px-4 py-4 rounded-lg border border-green-500/40 bg-green-500/10 text-green-400 text-sm font-body text-center space-y-1">
                  <p className="font-semibold">✅ Reset link sent!</p>
                  <p className="text-xs text-muted-foreground">Check your school email inbox for the reset link.</p>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div>
                    <label className="block text-sm font-body text-muted-foreground mb-2">
                      School Email
                    </label>
                    <div className="flex items-stretch rounded-lg overflow-hidden border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all duration-300 bg-muted">
                      <input
                        type="text"
                        value={forgotPrefix}
                        onChange={e => { setForgotPrefix(e.target.value); setForgotError(""); }}
                        placeholder="first_last or JSmith"
                        className="flex-1 px-4 py-3 bg-transparent text-foreground placeholder:text-muted-foreground/50 font-body outline-none"
                        autoComplete="username"
                        autoCapitalize="none"
                      />
                      <span className="flex items-center px-3 text-muted-foreground/60 font-body text-sm bg-muted/50 border-l border-border select-none whitespace-nowrap">
                        {EMAIL_DOMAIN}
                      </span>
                    </div>
                  </div>

                  {forgotError && <p className="text-sm text-destructive">{forgotError}</p>}

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-display font-semibold tracking-wider hover:glow-primary-strong transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                  >
                    {forgotLoading ? "SENDING..." : "SEND RESET LINK"}
                  </button>
                </form>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setMode("login"); setForgotSent(false); setForgotError(""); }}
                  className="text-xs text-muted-foreground/60 hover:text-primary font-body transition-colors duration-200 underline underline-offset-2"
                >
                  ← Back to Log In
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-5">
              {/* Email prefix */}
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-2">
                  School Email
                </label>
                <div className="flex items-stretch rounded-lg overflow-hidden border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all duration-300 bg-muted">
                  <input
                    type="text"
                    value={signupPrefix}
                    onChange={e => { setSignupPrefix(e.target.value); setSignupError(""); }}
                    placeholder="first_last or JSmith"
                    className="flex-1 px-4 py-3 bg-transparent text-foreground placeholder:text-muted-foreground/50 font-body outline-none"
                    autoComplete="username"
                    autoCapitalize="none"
                  />
                  <span className="flex items-center px-3 text-muted-foreground/60 font-body text-sm bg-muted/50 border-l border-border select-none whitespace-nowrap">
                    {EMAIL_DOMAIN}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground/50 font-body">
                  Students: <span className="text-primary/60">first_last</span> · Teachers: <span className="text-primary/60">JSmith</span>
                </p>
              </div>

              {/* Auto-filled display name — read only */}
              {signupPrefix.trim() && (
                <div>
                  <label className="block text-sm font-body text-muted-foreground mb-2">
                    Your Name <span className="text-muted-foreground/40 text-xs">(auto-filled)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={signupDisplayName}
                      readOnly
                      className="flex-1 px-4 py-3 rounded-lg bg-muted/50 border border-border text-foreground font-body outline-none cursor-not-allowed opacity-80"
                    />
                    <span className="text-xs font-body px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                      {rolePreviewLabel()}
                    </span>
                  </div>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={e => { setSignupPassword(e.target.value); setSignupError(""); }}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all duration-300"
                  autoComplete="new-password"
                />
              </div>

              {/* Confirm */}
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={signupConfirm}
                  onChange={e => { setSignupConfirm(e.target.value); setSignupError(""); }}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all duration-300"
                  autoComplete="new-password"
                />
              </div>

              {signupError && <p className="text-sm text-destructive">{signupError}</p>}

              <button
                type="submit"
                disabled={signupLoading}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-display font-semibold tracking-wider hover:glow-primary-strong transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
              >
                {signupLoading ? "CREATING..." : "CREATE ACCOUNT"}
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

export default LoginScreen;
