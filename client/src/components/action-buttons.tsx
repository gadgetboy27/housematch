import { motion } from "framer-motion";
import { useRef } from "react";

interface ActionButtonsProps {
  onReject: () => void;
  onLike: () => void;
  onSuperLike: () => void;
  onPropertyList: () => void;
  disabled?: boolean;
  onLikeEffect?: () => void; // Optional callback for heart bubbles
  debounceTime?: number;     // Optional debounce duration (ms)
}

export default function ActionButtons({
  onReject,
  onLike,
  onSuperLike,
  onPropertyList,
  disabled = false,
  onLikeEffect,
  debounceTime = 500,
}: ActionButtonsProps) {
  const lastClickRef = useRef<number>(0);

  const handleClick = (callback: () => void, effect?: () => void) => {
    const now = Date.now();
    if (now - lastClickRef.current < debounceTime || disabled) return;
    lastClickRef.current = now;

    callback();
    effect?.();
  };

  return (
    <div className="flex items-center space-x-4">
      {/* Reject Button */}
      <motion.button
        className="relative group"
        onClick={() => handleClick(onReject)}
        disabled={disabled}
        whileTap={{ scale: 0.95 }}
        data-testid="button-reject"
      >
        <div className="w-16 h-12 bg-transparent backdrop-blur-2xl rounded-lg flex items-center justify-center
                        shadow-[0_12px_24px_rgba(0,0,0,0.4),0_8px_16px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.3)]
                        border-2 border-white/60 
                        group-active:bg-white/10 group-active:shadow-[0_6px_12px_rgba(0,0,0,0.5),inset_0_3px_6px_rgba(0,0,0,0.2)]
                        group-active:transform group-active:translate-y-1
                        transition-all duration-200 hover:bg-white/5">
          <span className="text-white text-2xl font-bold drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)] 
                        group-active:scale-90 transition-transform filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">✕</span>
        </div>
      </motion.button>

      {/* Like Button */}
      <motion.button
        className="relative group"
        onClick={() => handleClick(onLike, onLikeEffect)}
        disabled={disabled}
        whileTap={{ scale: 0.95 }}
        data-testid="button-like"
      >
        <div className="w-20 h-12 bg-transparent backdrop-blur-2xl rounded-lg flex items-center justify-center
                        shadow-[0_16px_32px_rgba(245,158,11,0.4),0_12px_24px_rgba(245,158,11,0.3),0_8px_16px_rgba(0,0,0,0.3),inset_0_3px_6px_rgba(255,255,255,0.4)]
                        border-2 border-white/60 
                        group-active:bg-amber-400/15 group-active:shadow-[0_8px_16px_rgba(245,158,11,0.5),inset_0_4px_8px_rgba(0,0,0,0.2)]
                        group-active:transform group-active:translate-y-1
                        transition-all duration-200 hover:bg-amber-400/10">
          <span className="text-white text-2xl font-bold drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] 
                        group-active:scale-90 transition-transform filter drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">❤️</span>
        </div>
      </motion.button>

      {/* Super Like Button */}
      <motion.button
        className="relative group"
        onClick={() => handleClick(onSuperLike)}
        disabled={disabled}
        whileTap={{ scale: 0.95 }}
        data-testid="button-super-like"
      >
        <div className="w-16 h-12 bg-transparent backdrop-blur-2xl rounded-lg flex items-center justify-center
                        shadow-[0_12px_24px_rgba(29,78,216,0.4),0_8px_16px_rgba(29,78,216,0.3),0_4px_8px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.3)]
                        border-2 border-white/60 
                        group-active:bg-blue-500/15 group-active:shadow-[0_6px_12px_rgba(29,78,216,0.5),inset_0_3px_6px_rgba(0,0,0,0.2)]
                        group-active:transform group-active:translate-y-1
                        transition-all duration-200 hover:bg-blue-500/10">
          <span className="text-yellow-200 text-2xl font-bold drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)] 
                        group-active:scale-90 transition-transform filter drop-shadow-[0_0_10px_rgba(255,255,100,0.6)]">⭐️</span>
        </div>
      </motion.button>

      {/* Property List Button */}
      <motion.button
        className="relative group"
        onClick={() => handleClick(onPropertyList)}
        disabled={disabled}
        whileTap={{ scale: 0.95 }}
        data-testid="button-property-list"
      >
        <div className="w-16 h-12 bg-transparent backdrop-blur-2xl rounded-lg flex items-center justify-center
                        shadow-[0_12px_24px_rgba(107,114,128,0.4),0_8px_16px_rgba(107,114,128,0.3),0_4px_8px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.3)]
                        border-2 border-white/60 
                        group-active:bg-gray-500/15 group-active:shadow-[0_6px_12px_rgba(107,114,128,0.5),inset_0_3px_6px_rgba(0,0,0,0.2)]
                        group-active:transform group-active:translate-y-1
                        transition-all duration-200 hover:bg-gray-500/10">
          <span className="text-white text-xl font-bold drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)] 
                        group-active:scale-90 transition-transform filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">☰</span>
        </div>
      </motion.button>
    </div>
  );
}
