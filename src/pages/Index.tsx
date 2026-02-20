import { useState } from "react";
import LoginScreen from "@/components/LoginScreen";
import ScoutingForm from "@/components/ScoutingForm";
import MasterDashboard from "@/components/MasterDashboard";
import ScoutDashboard from "@/components/ScoutDashboard";
import LockdownDashboard from "@/components/LockdownDashboard";

const Index = () => {
  const [user, setUser] = useState<string | null>(() => {
    return sessionStorage.getItem("scouterName");
  });

  const handleLogin = (name: string) => {
    sessionStorage.setItem("scouterName", name);
    setUser(name);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("scouterName");
    setUser(null);
  };

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (user === "MeadowBot Master") {
    return <MasterDashboard onLogout={handleLogout} />;
  }

  if (user === "Scout Dashboard") {
    return <ScoutDashboard onLogout={handleLogout} />;
  }

  if (user === "Lockdown") {
    return <LockdownDashboard onLogout={handleLogout} />;
  }

  return <ScoutingForm scouterName={user} onLogout={handleLogout} />;
};

export default Index;
