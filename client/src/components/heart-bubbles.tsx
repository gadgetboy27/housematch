import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface HeartBubblesProps {
  trigger: boolean;
  onComplete?: () => void;
}

export default function HeartBubbles({ trigger, onComplete }: HeartBubblesProps) {
  const [hearts, setHearts] = useState<Array<{id: number, x: number, size: number}>>([]);

  useEffect(() => {
    if (trigger) {
      // Create 5 hearts with random positions
      const newHearts = Array.from({ length: 5 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 40 - 20, // -20 to 20px from center
        size: 16 + Math.random() * 8, // 16-24px
      }));

      setHearts(newHearts);

      // Clear after animation
      setTimeout(() => {
        setHearts([]);
        onComplete?.();
      }, 1500);
    }
  }, [trigger, onComplete]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {hearts.map((heart) => (
          <motion.div
            key={heart.id}
            className="absolute text-red-400"
            style={{
              left: `calc(50% + ${heart.x}px)`,
              top: "50%",
              fontSize: `${heart.size}px`,
            }}
            initial={{ y: 0, opacity: 1, scale: 0.5 }}
            animate={{ y: -60, opacity: 0, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            ❤️
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}