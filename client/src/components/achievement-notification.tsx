import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  badgeColor: string;
  points: number;
  rarity: string;
}

interface AchievementNotificationProps {
  achievement: Achievement | null;
  onClose: () => void;
}

const badgeColors = {
  blue: "from-blue-500 to-blue-600",
  green: "from-green-500 to-green-600",
  purple: "from-purple-500 to-purple-600",
  gold: "from-yellow-500 to-yellow-600",
  red: "from-red-500 to-red-600",
  yellow: "from-yellow-400 to-yellow-500"
};

const rarityEmojis = {
  common: "⭐",
  rare: "💎",
  epic: "🔥",
  legendary: "👑"
};

export default function AchievementNotification({ achievement, onClose }: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation to finish
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  if (!achievement) return null;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={handleClose}
          />

          {/* Achievement Card */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              y: 0,
              transition: {
                type: "spring",
                damping: 15,
                stiffness: 300
              }
            }}
            exit={{ 
              scale: 0.8, 
              opacity: 0, 
              y: -20,
              transition: { duration: 0.2 }
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div 
              className="pointer-events-auto bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border-4 border-yellow-400"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with confetti effect */}
              <div className={`bg-gradient-to-r ${badgeColors[achievement.badgeColor as keyof typeof badgeColors]} text-white p-6 text-center relative overflow-hidden`}>
                {/* Animated background elements */}
                <motion.div
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute top-2 left-2 text-2xl opacity-30"
                >
                  ✨
                </motion.div>
                <motion.div
                  animate={{
                    rotate: [360, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute top-2 right-2 text-2xl opacity-30"
                >
                  🎉
                </motion.div>
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                    opacity: [0.3, 0.7, 0.3]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xl opacity-30"
                >
                  ⭐
                </motion.div>

                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ 
                    scale: 1, 
                    rotate: 0,
                    transition: { delay: 0.2, type: "spring", damping: 10 }
                  }}
                  className="text-6xl mb-2"
                >
                  🏆
                </motion.div>
                
                <motion.h2 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ 
                    y: 0, 
                    opacity: 1,
                    transition: { delay: 0.3 }
                  }}
                  className="text-2xl font-bold mb-1"
                >
                  Achievement Unlocked!
                </motion.h2>
                
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ 
                    scale: 1,
                    transition: { delay: 0.4, type: "spring" }
                  }}
                  className="flex items-center justify-center gap-2"
                >
                  <span className="text-lg">
                    {rarityEmojis[achievement.rarity as keyof typeof rarityEmojis]}
                  </span>
                  <span className="text-sm opacity-90 capitalize">
                    {achievement.rarity}
                  </span>
                </motion.div>
              </div>

              {/* Content */}
              <div className="p-6 text-center space-y-4">
                {/* Achievement Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ 
                    scale: 1,
                    transition: { delay: 0.6, type: "spring", damping: 12 }
                  }}
                  className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${badgeColors[achievement.badgeColor as keyof typeof badgeColors]} text-white text-2xl shadow-lg`}
                >
                  <i className={achievement.icon}></i>
                </motion.div>

                {/* Achievement Details */}
                <div className="space-y-2">
                  <motion.h3 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ 
                      y: 0, 
                      opacity: 1,
                      transition: { delay: 0.7 }
                    }}
                    className="text-xl font-bold text-gray-900"
                  >
                    {achievement.title}
                  </motion.h3>
                  
                  <motion.p 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ 
                      y: 0, 
                      opacity: 1,
                      transition: { delay: 0.8 }
                    }}
                    className="text-gray-600"
                  >
                    {achievement.description}
                  </motion.p>

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ 
                      scale: 1,
                      transition: { delay: 0.9, type: "spring" }
                    }}
                    className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    <span>⭐</span>
                    +{achievement.points} points
                  </motion.div>
                </div>

                {/* Close Button */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ 
                    y: 0, 
                    opacity: 1,
                    transition: { delay: 1.0 }
                  }}
                >
                  <Button 
                    onClick={handleClose}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8"
                    data-testid="button-close-achievement"
                  >
                    Awesome! 🎉
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}