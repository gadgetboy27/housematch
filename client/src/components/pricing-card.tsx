import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Star, TrendingUp, Users, Video, Zap, Check } from "lucide-react";
import { PricingPlan } from "@shared/schema";

interface PricingCardProps {
  plan: PricingPlan;
}

export function PricingCard({ plan }: PricingCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(0)}`;
  const formatDailyRate = (cents: number) => `$${(cents / 100).toFixed(0)}`;

  const handleCardTap = () => {
    setIsFlipped(!isFlipped);
  };

  // Floating hearts for animation
  const FloatingHeart = ({ delay = 0 }: { delay?: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 50, x: Math.random() * 50 - 25 }}
      animate={{ 
        opacity: [0, 1, 0],
        y: -50,
        x: Math.random() * 100 - 50
      }}
      transition={{
        duration: 3,
        delay,
        ease: "easeOut",
        repeat: Infinity,
        repeatDelay: Math.random() * 2 + 1
      }}
      className="absolute pointer-events-none"
      style={{
        left: `${Math.random() * 100}%`,
        bottom: '20%'
      }}
    >
      <Heart className="w-4 h-4 text-pink-400 fill-current" />
    </motion.div>
  );

  return (
    <div 
      className="w-full h-full relative select-none cursor-pointer"
      style={{ perspective: "1000px" }}
      onClick={handleCardTap}
    >
      {/* Floating hearts animation */}
      {[...Array(8)].map((_, i) => (
        <FloatingHeart key={i} delay={i * 0.3} />
      ))}

      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.320, 1] }}
      >
        {/* Front Side - Main Pricing Display */}
        <motion.div
          className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-3xl overflow-hidden shadow-2xl"
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Premium badge */}
          {plan.isPopular && (
            <div className="absolute top-4 right-4 z-10">
              <div className="bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                Most Popular
              </div>
            </div>
          )}

          {/* Background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 left-10 w-20 h-20 border border-white/30 rounded-full"></div>
            <div className="absolute top-20 right-16 w-12 h-12 border border-white/20 rounded-full"></div>
            <div className="absolute bottom-20 left-16 w-16 h-16 border border-white/25 rounded-full"></div>
            <div className="absolute bottom-10 right-10 w-8 h-8 bg-white/10 rounded-full"></div>
          </div>

          {/* Main content */}
          <div className="relative h-full p-6 flex flex-col justify-between text-white">
            {/* Top section */}
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-4"
              >
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <Video className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-1">{plan.name}</h2>
                <p className="text-white/80 text-sm">{plan.description}</p>
              </motion.div>

              {/* Pricing */}
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-6">
                <div className="text-5xl font-bold mb-2">
                  {formatPrice(plan.price)}
                </div>
                <div className="text-white/80 text-sm mb-3">
                  for {plan.duration} days
                </div>
                
                {/* Daily rate highlight */}
                <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-3 mb-3">
                  <div className="text-2xl font-bold text-green-200">
                    {formatDailyRate(plan.dailyRate)}/day
                  </div>
                  <div className="text-green-300 text-sm">
                    Save ${formatDailyRate(plan.savings)}/day vs casual
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom section */}
            <div>
              {/* Key features preview */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
                <div className="flex items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>TikTok Style</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>10k+ Buyers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4" />
                    <span>No Commission</span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-white/60 text-xs mb-2">
                  💡 Tap to see all features
                </div>
                <div className="bg-white/20 rounded-full py-2 px-4 text-sm font-medium">
                  Skip $20,000+ Commission Fees
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Back Side - Detailed Features */}
        <motion.div
          className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl text-white overflow-hidden"
          style={{ 
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)"
          }}
        >
          <div className="h-full overflow-y-auto p-6 space-y-4">
            {/* Header */}
            <div className="text-center pb-4 border-b border-gray-700">
              <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
              <p className="text-gray-300 text-sm">{plan.description}</p>
              <div className="mt-3">
                <span className="text-3xl font-bold text-purple-400">
                  {formatPrice(plan.price)}
                </span>
                <span className="text-gray-400 text-sm">/{plan.duration} days</span>
              </div>
            </div>

            {/* Commission Savings */}
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
              <h3 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Commission Savings
              </h3>
              <div className="text-sm text-green-300 space-y-1">
                <div>• Save $19,000+ vs 6% agent commission</div>
                <div>• Only ${formatDailyRate(plan.dailyRate)}/day = massive savings</div>
                <div>• No hidden fees or percentages</div>
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-200 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                What's Included:
              </h3>
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3 text-sm">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">{feature}</span>
                </div>
              ))}
            </div>

            {/* TikTok-style messaging */}
            <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
              <h3 className="text-purple-400 font-semibold mb-2 flex items-center gap-2">
                <Video className="w-4 h-4" />
                Modern Buyer Experience
              </h3>
              <div className="text-sm text-purple-300 space-y-1">
                <div>• TikTok-style property videos</div>
                <div>• Swipe interface buyers love</div>
                <div>• Instant connections with serious buyers</div>
                <div>• Mobile-first property discovery</div>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-4 text-center mt-6">
              <div className="font-semibold mb-1">Ready to Get Started?</div>
              <div className="text-sm opacity-90">
                Swipe right to choose this plan!
              </div>
            </div>

            <div className="text-center text-xs text-gray-500 pt-2">
              💡 Tap again to return to overview
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}