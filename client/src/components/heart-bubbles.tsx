import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Heart } from "lucide-react";

interface HeartBubble {
  id: number;
  x: number;
  delay: number;
}

interface HeartBubblesProps {
  trigger?: boolean;
  onComplete?: () => void;
}

export default function HeartBubbles({ trigger, onComplete }: HeartBubblesProps = {}) {
  const [bubbles, setBubbles] = useState<HeartBubble[]>([]);

  const addHeart = () => {
    const id = Date.now();
    const x = Math.random() * 80 - 40; // drift
    const delay = Math.random() * 0.2;
    setBubbles((prev) => [...prev, { id, x, delay }]);
    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== id));
      if (onComplete) onComplete();
    }, 2000);
  };

  // Trigger effect
  useEffect(() => {
    if (trigger) {
      addHeart();
    }
  }, [trigger]);

  return (
    <div className="absolute inset-0 pointer-events-none flex justify-center items-center">
      {bubbles.map((b) => (
        <motion.div
          key={b.id}
          initial={{ opacity: 0, y: 20, x: 0 }}
          animate={{ opacity: 1, y: -120, x: b.x }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, delay: b.delay }}
          className="absolute"
        >
          <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
        </motion.div>
      ))}
    </div>
  );
}

export function useHeartBubbles() {
  const [key, setKey] = useState(0);
  const trigger = () => setKey((k) => k + 1);
  return { trigger, key };
}
