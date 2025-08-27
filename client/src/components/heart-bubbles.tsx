import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface HeartBubblesProps {
  isTriggered: boolean;
  onComplete: () => void;
}

interface Heart {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

export default function HeartBubbles({ isTriggered, onComplete }: HeartBubblesProps) {
  const [hearts, setHearts] = useState<Heart[]>([]);

  useEffect(() => {
    if (isTriggered) {
      // Generate 6-8 hearts with random positions and sizes
      const newHearts: Heart[] = Array.from({ length: 7 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 60 - 30, // -30 to 30px from center
        y: 0,
        size: Math.random() * 8 + 12, // 12-20px
        delay: Math.random() * 0.3, // 0-300ms delay
      }));

      setHearts(newHearts);

      // Clear hearts and call onComplete after animation
      setTimeout(() => {
        setHearts([]);
        onComplete();
      }, 2000);
    }
  }, [isTriggered, onComplete]);

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
            initial={{
              y: 0,
              opacity: 1,
              scale: 0,
            }}
            animate={{
              y: -80,
              opacity: 0,
              scale: 1,
              rotate: Math.random() * 20 - 10,
            }}
            transition={{
              duration: 1.5,
              delay: heart.delay,
              ease: "easeOut",
            }}
          >
            ❤️
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}