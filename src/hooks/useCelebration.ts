import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";

export function useCelebration() {
  const [celebrating, setCelebrating] = useState(false);

  const triggerCelebration = async () => {
    // Broadcast to all connected clients
    const channel = supabase.channel("celebration");
    await channel.send({
      type: "broadcast",
      event: "lets_go",
      payload: { message: "Good Job Team, We Won!!" },
    });
    channel.unsubscribe();
    setCelebrating(true);
    fireCelebration();
    setTimeout(() => setCelebrating(false), 6000);
  };

  const fireCelebration = () => {
    setCelebrating(true);
    const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#ffffff"];

    // Center burst
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors,
      zIndex: 9999,
    });

    // Infinite side streams
    const frame = () => {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 80,
        origin: { x: 0 },
        colors,
        zIndex: 9999,
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 80,
        origin: { x: 1 },
        colors,
        zIndex: 9999,
      });
      requestAnimationFrame(frame);
    };
    frame();
  };

  useEffect(() => {
    const channel = supabase
      .channel("celebration")
      .on("broadcast", { event: "lets_go" }, () => {
        setCelebrating(true);
        fireCelebration();
        setTimeout(() => setCelebrating(false), 6000);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return { celebrating, triggerCelebration, fireCelebration };
}
