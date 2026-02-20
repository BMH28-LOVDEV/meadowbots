interface CelebrationOverlayProps {
  visible: boolean;
}

const CelebrationOverlay = ({ visible }: CelebrationOverlayProps) => {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="text-center px-10 py-12 rounded-3xl border border-green-400/50 shadow-2xl shadow-green-500/40"
        style={{ background: "rgba(0,20,0,0.90)", animation: "scale-in 0.4s ease-out" }}
      >
        <div className="text-8xl mb-5 animate-bounce">🏆</div>
        <h1
          className="text-5xl md:text-6xl font-display font-bold text-green-400 tracking-wider mb-4"
          style={{ textShadow: "0 0 50px rgba(74,222,128,1)" }}
        >
          GOOD JOB, TEAM.
        </h1>
        <p className="text-3xl md:text-4xl font-display text-white tracking-widest mb-6">
          WE WON!! 🎉
        </p>
        <div className="flex justify-center gap-4 text-4xl">
          {["🎊", "⭐", "🎊", "⭐", "🎊"].map((e, i) => (
            <span key={i} className="animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}>{e}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CelebrationOverlay;
