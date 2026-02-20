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

    // Only handle SUBSEQUENT auth changes (logout, token refresh)
    // This does NOT control the loading state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        // Only react after initial load is done
        setUser(session?.user ?? null);
        if (!session?.user) {
          setProfile(null);
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
        if (isMounted) setLoading(false);
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
    return <MasterDashboard onLogout={handleLogout} username={profile.username} />;
  }

  if (profile.role === "letsgo") {
    return <LetsGoDashboard onLogout={handleLogout} />;
  }

  // scout, viewer, bluedriver — all get ScoutingForm (with role passed for Drive Data access)
  return <ScoutingForm scouterName={profile.display_name} onLogout={handleLogout} userRole={profile.role} />;
};

export default Index;
