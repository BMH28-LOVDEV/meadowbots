import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LoginScreenProps {
  onLogin: () => void;
}

const EMAIL_DOMAIN = "@themeadowsschool.org";

type Mode = "login" | "signup";

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
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  const [isShaking, setIsShaking] = useState(false);

  const shake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPrefix.trim()) {
      setLoginError("Please enter your school email prefix.");
      shake();
      return;
    }
    const email = loginPrefix.trim().toLowerCase() + EMAIL_DOMAIN;
    setLoginLoading(true);
    setLoginError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password: loginPassword });
    setLoginLoading(false);

    if (error) {
      setLoginError("Incorrect email or password.");
      shake();
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
    if (!signupUsername.trim()) {
      setSignupError("Please choose a username.");
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

    const email = signupPrefix.trim().toLowerCase() + EMAIL_DOMAIN;
    setSignupLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password: signupPassword });

    if (error) {
      setSignupError(error.message);
      setSignupLoading(false);
      shake();
      return;
    }

    if (data.user) {
      // Build display name from prefix: first_last → First Last
      const displayName = signupPrefix
        .split("_")
        .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join(" ");

      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: data.user.id,
        username: signupUsername.trim(),
        display_name: displayName,
        role: "scout",
      });

      if (profileError) {
        setSignupError(profileError.message.includes("unique") ? "That username is already taken." : profileError.message);
        setSignupLoading(false);
        shake();
        return;
      }
    }

    setSignupLoading(false);
    setAccountCreated(true);
    setMode("login");
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

        {/* Card */}
        <div className="glass rounded-xl p-8 glow-primary">
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

          {accountCreated && mode === "login" && (
            <div className="mb-5 px-4 py-3 rounded-lg border border-blue-500/50 bg-blue-500/10 text-blue-400 text-sm font-body text-center">
              ✅ Account Created. Please now log in with your new account.
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email prefix */}
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-2">
                  School Email
                </label>
                <div className="flex items-stretch rounded-lg overflow-hidden border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all duration-300 bg-muted">
                  <input
                    type="text"
                    value={loginPrefix}
                    onChange={e => { setLoginPrefix(e.target.value); setLoginError(""); }}
                    placeholder="first_last"
                    className="flex-1 px-4 py-3 bg-transparent text-foreground placeholder:text-muted-foreground/50 font-body outline-none"
                    autoComplete="username"
                    autoCapitalize="none"
                  />
                  <span className="flex items-center px-3 text-muted-foreground/60 font-body text-sm bg-muted/50 border-l border-border select-none whitespace-nowrap">
                    {EMAIL_DOMAIN}
                  </span>
                </div>
              </div>

              {/* Password */}
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
            </form>
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
                    placeholder="first_last"
                    className="flex-1 px-4 py-3 bg-transparent text-foreground placeholder:text-muted-foreground/50 font-body outline-none"
                    autoComplete="username"
                    autoCapitalize="none"
                  />
                  <span className="flex items-center px-3 text-muted-foreground/60 font-body text-sm bg-muted/50 border-l border-border select-none whitespace-nowrap">
                    {EMAIL_DOMAIN}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground/60 font-body">
                  e.g. <span className="text-primary/70">benjamin_hale</span>{EMAIL_DOMAIN}
                </p>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-2">
                  Username <span className="text-muted-foreground/50">(you choose this)</span>
                </label>
                <input
                  type="text"
                  value={signupUsername}
                  onChange={e => { setSignupUsername(e.target.value); setSignupError(""); }}
                  placeholder="e.g. ScoutName1"
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 font-body outline-none transition-all duration-300"
                  autoCapitalize="none"
                />
              </div>

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
