import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Zap, TrendingUp, Star, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingPlan } from "@shared/schema";

interface PricingSelectionProps {
  onPlanSelect: (planId: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function PricingSelection({ onPlanSelect, onClose, isLoading = false }: PricingSelectionProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  // The 4 selling options
  const pricingOptions = [
    {
      id: "day-trader",
      name: "Day Trader",
      subtitle: "Live by the Seat of Your Pants",
      dailyRate: 19,
      duration: 1, // 1 day
      price: 1900, // $19 in cents
      description: "Perfect for quick test listings",
      features: [
        "24-hour swipe exposure",
        "Basic photo hosting",
        "Quick market test",
        "Flexible daily billing"
      ],
      icon: <Zap className="w-6 h-6" />,
      color: "from-orange-500 to-red-500",
      isPopular: false
    },
    {
      id: "quick-match",
      name: "Quick Match",
      subtitle: "30 Day Power Play",
      dailyRate: 16,
      duration: 30,
      price: 48800, // $488 in cents
      description: "Perfect for motivated sellers who want quick results",
      features: [
        "Unlimited swipe-style exposure",
        "Professional photo hosting", 
        "TikTok-style video showcase",
        "Basic analytics dashboard",
        "Email support"
      ],
      icon: <TrendingUp className="w-6 h-6" />,
      color: "from-blue-500 to-cyan-500",
      isPopular: false
    },
    {
      id: "serious-seller", 
      name: "Serious Seller",
      subtitle: "60 Day Domination",
      dailyRate: 11,
      duration: 60,
      price: 68800, // $688 in cents
      description: "Most popular choice for sellers wanting maximum exposure",
      features: [
        "Everything in Quick Match",
        "Priority listing placement",
        "Advanced buyer insights", 
        "Social media promotion",
        "Dedicated seller support",
        "Market trend analysis"
      ],
      icon: <Star className="w-6 h-6" />,
      color: "from-green-500 to-emerald-500",
      isPopular: true
    },
    {
      id: "committed-closer",
      name: "Committed Closer", 
      subtitle: "90 Day Victory Lap",
      dailyRate: 9,
      duration: 90,
      price: 87800, // $878 in cents
      description: "Ultimate package for sellers who want every advantage",
      features: [
        "Everything in Serious Seller",
        "Premium featured listings",
        "AI-powered buyer matching",
        "Professional video tours", 
        "Priority customer success",
        "Extended market analysis",
        "Negotiation support"
      ],
      icon: <CheckCircle className="w-6 h-6" />,
      color: "from-purple-500 to-indigo-500", 
      isPopular: false
    }
  ];

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(0)}`;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Choose Your Selling Plan</h2>
              <p className="text-gray-600 mt-1">Skip the $20k+ agent commission fees!</p>
            </div>
            <Button variant="ghost" onClick={onClose} data-testid="button-close-pricing">
              ✕
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pricingOptions.map((plan) => (
              <motion.div
                key={plan.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative border-2 rounded-xl p-6 cursor-pointer transition-all duration-200 ${
                  selectedPlan === plan.id
                    ? "border-blue-500 bg-blue-50" 
                    : "border-gray-200 hover:border-gray-300"
                } ${plan.isPopular ? "ring-2 ring-green-500" : ""}`}
                onClick={() => setSelectedPlan(plan.id)}
                data-testid={`card-plan-${plan.id}`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${plan.color}`}>
                    <div className="text-white">{plan.icon}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      ${plan.dailyRate}/day
                    </div>
                    {plan.duration > 1 && (
                      <div className="text-lg text-gray-600">
                        {formatPrice(plan.price)} total
                      </div>
                    )}
                  </div>
                </div>

                {/* Plan Details */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{plan.subtitle}</p>
                  <p className="text-sm text-gray-700">{plan.description}</p>
                </div>

                {/* Features */}
                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Duration Badge */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${plan.color} text-white`}>
                    {plan.duration === 1 ? "Daily Billing" : `${plan.duration} Days`}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              💡 <strong>Save thousands</strong> vs traditional agent fees
            </div>
            
            <div className="flex gap-4">
              <Button variant="outline" onClick={onClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button 
                onClick={() => selectedPlan && onPlanSelect(selectedPlan)}
                disabled={!selectedPlan || isLoading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                data-testid="button-continue"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Processing...
                  </>
                ) : (
                  "Continue to Payment"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Floating Hearts Animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 100, x: Math.random() * 100 }}
              animate={{ 
                opacity: [0, 1, 0],
                y: -50,
                x: Math.random() * 200
              }}
              transition={{
                duration: 4,
                delay: i * 0.5,
                ease: "easeOut",
                repeat: Infinity,
                repeatDelay: 3
              }}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                bottom: '10%'
              }}
            >
              <Heart className="w-3 h-3 text-pink-400 fill-current" />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}