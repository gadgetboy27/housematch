import { motion } from "framer-motion";
import { useRef } from "react";
import { Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ActionButtonsProps {
  onReject: () => void;
  onLike: () => void;
  onAISearch: () => void;
  onBack?: () => void;
  disabled?: boolean;
  onLikeEffect?: () => void;
  debounceTime?: number;
}

export default function ActionButtons({
  onReject,
  onLike,
  onAISearch,
  onBack,
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
    <TooltipProvider>
      <div className="flex items-center space-x-4">
        {/* Reject Button - X */}
        <Tooltip>
          <TooltipTrigger asChild>
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
          </TooltipTrigger>
          <TooltipContent>
            <p>Pass - Swipe left or tap to skip this property</p>
          </TooltipContent>
        </Tooltip>

        {/* Back Button - Return to last seen */}
        {onBack && (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                className="relative group"
                onClick={() => handleClick(onBack)}
                disabled={disabled}
                whileTap={{ scale: 0.95 }}
                data-testid="button-back"
              >
                <div className="w-16 h-12 bg-transparent backdrop-blur-2xl rounded-lg flex items-center justify-center
                                shadow-[0_12px_24px_rgba(75,85,99,0.4),0_8px_16px_rgba(75,85,99,0.3),0_4px_8px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.3)]
                                border-2 border-white/60 
                                group-active:bg-gray-500/15 group-active:shadow-[0_6px_12px_rgba(75,85,99,0.5),inset_0_3px_6px_rgba(0,0,0,0.2)]
                                group-active:transform group-active:translate-y-1
                                transition-all duration-200 hover:bg-gray-500/10">
                  <span className="text-white text-2xl font-bold drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)] 
                                group-active:scale-90 transition-transform filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">↶</span>
                </div>
              </motion.button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Back - Return to previous property</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Like Button - Heart */}
        <Tooltip>
          <TooltipTrigger asChild>
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
          </TooltipTrigger>
          <TooltipContent>
            <p>Like - Swipe right or tap to save this property</p>
          </TooltipContent>
        </Tooltip>

        {/* AI Search Button - Replace Super Like */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              className="relative group"
              onClick={() => handleClick(onAISearch)}
              disabled={disabled}
              whileTap={{ scale: 0.95 }}
              data-testid="button-ai-search-action"
            >
              <div className="w-16 h-12 bg-gradient-to-br from-purple-500 to-pink-500 backdrop-blur-2xl rounded-lg flex items-center justify-center
                              shadow-[0_12px_24px_rgba(168,85,247,0.4),0_8px_16px_rgba(236,72,153,0.3),0_4px_8px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.3)]
                              border-2 border-white/60 
                              group-active:bg-purple-600/15 group-active:shadow-[0_6px_12px_rgba(168,85,247,0.5),inset_0_3px_6px_rgba(0,0,0,0.2)]
                              group-active:transform group-active:translate-y-1
                              transition-all duration-200 hover:brightness-110">
                <Sparkles className="w-6 h-6 text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)] 
                              group-active:scale-90 transition-transform filter drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]" />
              </div>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>
            <p>AI Search - Find properties with natural language</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
