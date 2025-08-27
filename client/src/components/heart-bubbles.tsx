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
      // Create 5 hearts with random positions, same size as button heart (text-2xl = 24px)
      const newHearts = Array.from({ length: 5 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 20 - 10, // -10 to 10px from center (tighter spread)
        size: 24, // Exact same size as like button heart (text-2xl)
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
              top: "90%", // Start even closer to like button position
              fontSize: `${heart.size}px`,
            }}
            initial={{ y: 0, opacity: 1, scale: 0.8 }}
            animate={{ y: -100, opacity: 0, scale: 1.2 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            ❤️
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}