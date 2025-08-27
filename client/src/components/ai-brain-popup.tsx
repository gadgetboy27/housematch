import { motion } from "framer-motion";

interface AIBrainPopupProps {
  onClick: () => void;
}

export default function AIBrainPopup({ onClick }: AIBrainPopupProps) {
  return (
    <motion.div
      className="fixed top-1/2 right-4 w-16 h-16 cursor-pointer z-50"
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.9 }}
      transition={{
        duration: 0.3,
        ease: "easeOut"
      }}
      data-testid="button-ai-brain"
    >
      {/* 3D Glass Brain Container */}
      <div className="w-16 h-16 bg-purple-500/30 backdrop-blur-2xl rounded-full flex items-center justify-center
                      shadow-[0_12px_24px_rgba(147,51,234,0.4),0_8px_16px_rgba(147,51,234,0.3),0_4px_8px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.3)]
                      border border-purple-400/40 
                      hover:bg-purple-500/40 hover:shadow-[0_16px_32px_rgba(147,51,234,0.5),0_12px_24px_rgba(147,51,234,0.4)]
                      transition-all duration-200">
        <motion.div
          className="text-white text-2xl drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)]"
          animate={{ 
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            filter: "drop-shadow(0 0 12px rgba(255,255,255,0.4))"
          }}
        >
          🧠
        </motion.div>
      </div>
      
      {/* Glass Overlay Effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-white/10 to-purple-500/10 rounded-full pointer-events-none"></div>
      
      {/* Pulsing Ring Effect */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-purple-400/50"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.5, 0, 0.5]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </motion.div>
  );
}
