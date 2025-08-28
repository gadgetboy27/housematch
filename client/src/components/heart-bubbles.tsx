import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface HeartBubblesProps {
  trigger: boolean;
  onComplete?: () => void;
}

export default function HeartBubbles({ trigger, onComplete }: HeartBubblesProps) {
  const [hearts, setHearts] = useState<Array<{id: number, x: number, y: number, size: number, delay: number}>>([]);

  useEffect(() => {
    if (trigger) {
      // Wait for card to fully exit the swipe area (350ms) before releasing hearts
      setTimeout(() => {
        // Create 5 hearts with random positions, same size as button heart (text-2xl = 24px)
        const newHearts = Array.from({ length: 5 }, (_, i) => ({
          id: Date.now() + i,
          x: Math.random() * -20 - 40, // -40 to 40px from center (much wider spread)
          y: Math.random() * -15 - 15, // Add vertical variation too
          size: 42, // Exact same size as like button heart (text-2xl)
          delay: Math.random() * -0.4, // Random delay for staggered animation
        }));

        setHearts(newHearts);

        // Clear after longer animation
        setTimeout(() => {
          setHearts([]);
          onComplete?.();
        }, 2500);
      }, 350); // Wait for card swipe animation to complete
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
              top: `calc(90% + ${heart.y}px)`, // Add vertical variation to start position
              fontSize: `${heart.size}px`,
            }}
            initial={{ y: 0, opacity: 1, scale: 0.8 }}
            animate={{ y: -200, opacity: 0, scale: 1.2 }}
            transition={{ 
              duration: 2.0, 
              ease: "easeOut",
              delay: heart.delay // Staggered start times
            }}
          >
            ❤️
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}