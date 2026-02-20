interface CelebrationOverlayProps {
  visible: boolean;
}

const CelebrationOverlay = ({ visible }: CelebrationOverlayProps) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none">
      <div className="animate-[scale-in_0.4s_ease-out] text-center px-8 py-10 rounded-3xl bg-black/70 backdrop-blur-md border border-green-400/40 shadow-2xl shadow-green-500/30">
        <div className="text-7xl mb-4 animate-bounce">🏆</div>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-green-400 tracking-wider mb-3"
          style={{ textShadow: "0 0 30px rgba(74,222,128,0.8)" }}>
          GOOD JOB, TEAM.
        </h1>
        <p className="text-2xl md:text-3xl font-display text-white tracking-widest">
          WE WON!! 🎉
        </p>
        <div className="flex justify-center gap-3 mt-5 text-3xl">
          {["🎊", "⭐", "🎊", "⭐", "🎊"].map((e, i) => (
            <span key={i} className="animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}>{e}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CelebrationOverlay;
