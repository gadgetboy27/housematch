import { motion } from "framer-motion";

interface ActionButtonsProps {
  onReject: () => void;
  onLike: () => void;
  onSuperLike: () => void;
  disabled?: boolean;
}

export default function ActionButtons({ onReject, onLike, onSuperLike, disabled = false }: ActionButtonsProps) {
  return (
    <div className="flex items-center space-x-4">
      {/* Reject Button */}
      <motion.button
        className="relative group"
        onClick={onReject}
        disabled={disabled}
        whileTap={{ scale: 0.95 }}
        data-testid="button-reject"
      >
        <div className="w-16 h-12 bg-gradient-to-b from-slate-500 to-slate-700 rounded-lg flex items-center justify-center
                        shadow-[0_12px_24px_rgba(0,0,0,0.5),0_8px_16px_rgba(0,0,0,0.3),0_4px_8px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.2)]
                        border border-slate-400/60 backdrop-blur-sm
                        group-active:shadow-[0_6px_12px_rgba(0,0,0,0.6),inset_0_3px_6px_rgba(0,0,0,0.3)]
                        group-active:transform group-active:translate-y-1
                        transition-all duration-200">
          <span className="text-white text-2xl font-bold drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)] 
                        group-active:scale-90 transition-transform filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">✕</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/30 rounded-lg pointer-events-none"></div>
      </motion.button>
      
      {/* Like Button - Premium Gold */}
      <motion.button
        className="relative group"
        onClick={onLike}
        disabled={disabled}
        whileTap={{ scale: 0.95 }}
        data-testid="button-like"
      >
        <div className="w-20 h-12 bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500 rounded-lg flex items-center justify-center
                        shadow-[0_16px_32px_rgba(245,158,11,0.6),0_12px_24px_rgba(245,158,11,0.4),0_8px_16px_rgba(0,0,0,0.4),inset_0_3px_6px_rgba(255,255,255,0.4)]
                        border border-amber-200/80 backdrop-blur-sm
                        group-active:shadow-[0_8px_16px_rgba(245,158,11,0.7),inset_0_4px_8px_rgba(0,0,0,0.3)]
                        group-active:transform group-active:translate-y-1
                        transition-all duration-200">
          <span className="text-white text-2xl font-bold drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] 
                        group-active:scale-90 transition-transform filter drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">❤️</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-amber-600/40 rounded-lg pointer-events-none"></div>
      </motion.button>
      
      {/* Super Like Button - Professional Navy */}
      <motion.button
        className="relative group"
        onClick={onSuperLike}
        disabled={disabled}
        whileTap={{ scale: 0.95 }}
        data-testid="button-super-like"
      >
        <div className="w-16 h-12 bg-gradient-to-b from-blue-500 via-blue-600 to-blue-800 rounded-lg flex items-center justify-center
                        shadow-[0_12px_24px_rgba(29,78,216,0.6),0_8px_16px_rgba(29,78,216,0.4),0_4px_8px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(255,255,255,0.3)]
                        border border-blue-400/70 backdrop-blur-sm
                        group-active:shadow-[0_6px_12px_rgba(29,78,216,0.7),inset_0_3px_6px_rgba(0,0,0,0.3)]
                        group-active:transform group-active:translate-y-1
                        transition-all duration-200">
          <span className="text-yellow-200 text-2xl font-bold drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)] 
                        group-active:scale-90 transition-transform filter drop-shadow-[0_0_10px_rgba(255,255,100,0.6)]">⭐️</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-blue-800/40 rounded-lg pointer-events-none"></div>
      </motion.button>
    </div>
  );
}