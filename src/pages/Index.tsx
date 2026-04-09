import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import LoginScreen from "@/components/LoginScreen";
import ScoutingForm from "@/components/ScoutingForm";
import MasterDashboard from "@/components/MasterDashboard";
import LetsGoDashboard from "@/components/LetsGoDashboard";
import AIChatBot from "@/components/AIChatBot";
import type { User } from "@supabase/supabase-js";

const FloatingChatButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform flex items-center justify-center text-2xl"
    title="Ask MeadowBot AI"
  >
    🤖
  </button>
);

interface Profile {
  display_name: string;
  username: string;
  role: string;
  approval_status: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewAsBlueDriver, setViewAsBlueDriver] = useState(false);
  const [viewAsScouter, setViewAsScouter] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const fetchProfile = async (userId: string, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("display_name, username, role, approval_status")
          .eq("user_id", userId)
          .single();
        if (data) {
          setProfile(data);
          return;
        }
      } catch {
        // profile not yet created by trigger
      }
      if (i < retries - 1) await new Promise(r => setTimeout(r, 500));
    }
    setProfile(null);
  };

  useEffect(() => {
    let isMounted = true;
    let initialLoadDone = false;

    // Listener for ONGOING auth changes (logout, token refresh)
    // Uses setTimeout to avoid Supabase deadlock on awaiting inside this callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted || !initialLoadDone) return;
        setUser(session?.user ?? null);
        if (!session?.user) {
          setProfile(null);
        } else {
          // Non-blocking profile refresh after auth change
          setTimeout(() => {
            if (isMounted) fetchProfile(session.user.id);
          }, 0);
        }
      }
    );

    // INITIAL load — this alone controls the loading state
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } finally {
        if (isMounted) {
          initialLoadDone = true;
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-primary font-display tracking-widest animate-pulse">LOADING...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return <LoginScreen onLogin={() => {}} />;
  }

  // Pending approval screen
  if (profile.approval_status === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="text-center px-8 py-12 max-w-lg mx-4">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center animate-pulse">
            <span className="text-4xl">⏳</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-primary tracking-wider mb-4">
            WAITING FOR APPROVAL
          </h1>
          <p className="text-muted-foreground font-body mb-2">
            Your account has been created successfully.
          </p>
          <p className="text-muted-foreground/70 font-body text-sm mb-8">
            A team administrator needs to approve your account before you can access the scouting portal.
          </p>
          <button
            onClick={handleLogout}
            className="px-6 py-3 rounded-lg bg-muted text-foreground font-display font-semibold tracking-wider hover:bg-muted/80 transition-all duration-300 border border-border"
          >
            LOG OUT
          </button>
        </div>
      </div>
    );
  }

  // Denied screen
  if (profile.approval_status === "denied") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-destructive/95 relative overflow-hidden">
        <div className="text-center px-8 py-12 max-w-lg mx-4">
          <div className="text-7xl md:text-9xl mb-6 animate-pulse">🚫</div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 tracking-wider">
            ACCESS DENIED
          </h1>
          <p className="text-white/80 font-body text-lg mb-2">
            Your account has been denied access.
          </p>
          <p className="text-white/60 font-body text-sm mb-8">
            Contact a team lead if you believe this is a mistake.
          </p>
          <button
            onClick={handleLogout}
            className="px-6 py-3 rounded-lg bg-white/20 text-white font-display font-semibold tracking-wider hover:bg-white/30 transition-all duration-300 border border-white/30"
          >
            LOG OUT
          </button>
        </div>
      </div>
    );
  }

  // AI ChatBot view
  if (showChat) {
    return <AIChatBot onBack={() => setShowChat(false)} userName={profile.display_name} />;
  }

  if (profile.role === "master" || profile.role === "coach") {
    if (viewAsBlueDriver) {
      return (
        <div>
          <div className="fixed top-0 left-0 right-0 z-50 bg-blue-900/90 backdrop-blur border-b border-blue-500/40 px-4 py-2 flex items-center justify-between">
            <span className="text-blue-300 text-xs font-display tracking-wider">👁 VIEWING AS BLUE DRIVER</span>
            <button
              onClick={() => setViewAsBlueDriver(false)}
              className="text-xs text-blue-300 border border-blue-500/40 rounded px-3 py-1 hover:bg-blue-500/20 transition-colors"
            >
              ← Back to Master
            </button>
          </div>
          <div className="pt-10">
            <ScoutingForm scouterName={profile.display_name} onLogout={handleLogout} userRole="bluedriver" />
          </div>
        </div>
      );
    }
    if (viewAsScouter) {
      return (
        <div>
          <div className="fixed top-0 left-0 right-0 z-50 bg-primary/10 backdrop-blur border-b border-primary/40 px-4 py-2 flex items-center justify-between">
            <span className="text-primary text-xs font-display tracking-wider">📋 SCOUTING FORM</span>
            <button
              onClick={() => setViewAsScouter(false)}
              className="text-xs text-primary border border-primary/40 rounded px-3 py-1 hover:bg-primary/20 transition-colors"
            >
              ← Back to Master
            </button>
          </div>
          <div className="pt-10">
            <ScoutingForm scouterName={profile.display_name} onLogout={handleLogout} userRole="scout" />
          </div>
        </div>
      );
    }
    return (
      <>
        <MasterDashboard
          onLogout={handleLogout}
          username={profile.display_name}
          onViewAsBlueDriver={() => setViewAsBlueDriver(true)}
          onViewAsScouter={() => setViewAsScouter(true)}
        />
        <FloatingChatButton onClick={() => setShowChat(true)} />
      </>
    );
  }

  if (profile.role === "letsgo") {
    return (
      <>
        <LetsGoDashboard onLogout={handleLogout} />
        <FloatingChatButton onClick={() => setShowChat(true)} />
      </>
    );
  }

  // scout, viewer, bluedriver — all get ScoutingForm (with role passed for Drive Data access)
  return (
    <>
      <ScoutingForm scouterName={profile.display_name} onLogout={handleLogout} userRole={profile.role} />
      <FloatingChatButton onClick={() => setShowChat(true)} />
    </>
  );
};

export default Index;
