import { motion } from "framer-motion";

interface AIBrainPopupProps {
  onClick: () => void;
}

export default function AIBrainPopup({ onClick }: AIBrainPopupProps) {
  return (
    <motion.div
      className="fixed top-1/2 right-4 w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl cursor-pointer z-50 shadow-lg"
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
      <motion.i
        className="fas fa-brain"
        animate={{ 
          scale: [1, 1.2, 1],
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
