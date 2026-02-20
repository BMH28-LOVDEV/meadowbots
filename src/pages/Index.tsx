import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import LoginScreen from "@/components/LoginScreen";
import ScoutingForm from "@/components/ScoutingForm";
import MasterDashboard from "@/components/MasterDashboard";
import ScoutDashboard from "@/components/ScoutDashboard";
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
    const { data } = await supabase
      .from("profiles")
      .select("display_name, username, role")
      .eq("user_id", userId)
      .single();
    setProfile(data ?? null);
  };

  useEffect(() => {
    // Set up auth listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Then get current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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

  if (profile.role === "master") {
    return <MasterDashboard onLogout={handleLogout} />;
  }

  if (profile.role === "letsgo") {
    return <LetsGoDashboard onLogout={handleLogout} />;
  }

  // scout, viewer, bluedriver — all get ScoutDashboard (with role passed for Drive Data access)
  return <ScoutDashboard scouterName={profile.display_name} onLogout={handleLogout} userRole={profile.role} />;
};

export default Index;
