import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import LoginScreen from "@/components/LoginScreen";
import ScoutingForm from "@/components/ScoutingForm";
import MasterDashboard from "@/components/MasterDashboard";
import LetsGoDashboard from "@/components/LetsGoDashboard";
import type { User } from "@supabase/supabase-js";

interface Profile {
  display_name: string;
  username: string;
  role: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewAsBlueDriver, setViewAsBlueDriver] = useState(false);
  const [viewAsScouter, setViewAsScouter] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username, role")
        .eq("user_id", userId)
        .single();
      setProfile(data ?? null);
    } catch {
      setProfile(null);
    }
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
      <MasterDashboard
        onLogout={handleLogout}
        username={profile.display_name}
        onViewAsBlueDriver={() => setViewAsBlueDriver(true)}
        onViewAsScouter={() => setViewAsScouter(true)}
      />
    );
  }

  if (profile.role === "letsgo") {
    return <LetsGoDashboard onLogout={handleLogout} />;
  }

  // scout, viewer, bluedriver — all get ScoutingForm (with role passed for Drive Data access)
  return <ScoutingForm scouterName={profile.display_name} onLogout={handleLogout} userRole={profile.role} />;
};

export default Index;
