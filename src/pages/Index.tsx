import { useState } from "react";
import LoginScreen from "@/components/LoginScreen";
import ScoutingForm from "@/components/ScoutingForm";

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

  return <ScoutingForm scouterName={user} onLogout={handleLogout} />;
};

export default Index;
