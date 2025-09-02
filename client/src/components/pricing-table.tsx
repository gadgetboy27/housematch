import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Heart, TrendingUp, Video, Users, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PricingPlan {
  id: string;
  name: string;
  duration: number;
  price: number;
  dailyRate: number;
  savings: number;
  popular?: boolean;
  features: string[];
  description: string;
}

const plans: PricingPlan[] = [
  {
    id: 'quick-match',
    name: 'Quick Match',
    duration: 30,
    price: 488,
    dailyRate: 16,
    savings: 13,
    features: [
      'Unlimited swipe-style exposure',
      'Professional photo hosting',
      'TikTok-style video showcase',
      'Basic analytics dashboard',
      'Email support'
    ],
    description: 'Perfect for motivated sellers who want quick results'
  },
  {
    id: 'serious-seller',
    name: 'Serious Seller',
    duration: 60,
    price: 688,
    dailyRate: 11,
    savings: 18,
    popular: true,
    features: [
      'Everything in Quick Match',
      'Priority listing placement',
      'Advanced buyer insights',
      'Social media promotion',
      'Dedicated seller support',
      'Market trend analysis'
    ],
    description: 'Most popular choice for sellers wanting maximum exposure'
  },
  {
    id: 'committed-closer',
    name: 'Committed Closer',
    duration: 90,
    price: 878,
    dailyRate: 9,
    savings: 20,
    features: [
      'Everything in Serious Seller',
      'Premium featured listings',
      'AI-powered buyer matching',
      'Professional video tours',
      'Priority customer success',
      'Extended market analysis',
      'Negotiation support'
    ],
    description: 'Ultimate package for sellers who want every advantage'
  }
];

const FloatingHeart = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 100, x: Math.random() * 100 - 50 }}
    animate={{ 
      opacity: [0, 1, 0],
      y: -100,
      x: Math.random() * 200 - 100
    }}
    transition={{
      duration: 4,
      delay,
      ease: "easeOut",
      repeat: Infinity,
      repeatDelay: Math.random() * 3 + 2
    }}
    className="absolute pointer-events-none"
    style={{
      left: `${Math.random() * 100}%`,
      bottom: '10%'
    }}
  >
    <Heart className="w-4 h-4 text-pink-400 fill-current" />
  </motion.div>
);

export function PricingTable() {
  const [selectedPlan, setSelectedPlan] = useState<string>('serious-seller');

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-12 px-4 overflow-hidden">
      {/* Floating Hearts Background */}
      {[...Array(12)].map((_, i) => (
        <FloatingHeart key={i} delay={i * 0.5} />
      ))}

      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
              Sell Without Paying
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                {" "}$20,000+{" "}
              </span>
              in Commission
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8">
              As low as <strong className="text-purple-600">$9/day</strong> to reach serious buyers
            </p>
          </motion.div>

          {/* TikTok-Style Video Messaging */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-8 inline-block"
          >
            <div className="flex items-center justify-center gap-3 text-gray-700">
              <Video className="w-6 h-6 text-purple-600" />
              <span className="text-lg font-medium">
                Houses shown the way buyers actually browse now
              </span>
              <TrendingUp className="w-6 h-6 text-pink-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              TikTok-style videos • Swipe interface • Instant connections
            </p>
          </motion.div>

          {/* Commission Savings Highlight */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-xl p-4 inline-block"
          >
            <p className="text-green-800 font-semibold">
              💰 Even 90 days at $878 = less than 5% of a typical agent's cut
            </p>
            <p className="text-green-600 text-sm">
              Save $19,000+ compared to traditional 6% commission on a $350k home
            </p>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 ${
                plan.popular 
                  ? 'ring-2 ring-purple-500 scale-105 lg:scale-110' 
                  : 'hover:scale-105'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                    <Star className="w-4 h-4 fill-current" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                
                {/* Price Display */}
                <div className="mb-4">
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    ${plan.price}
                    <span className="text-lg font-normal text-gray-500">/{plan.duration} days</span>
                  </div>
                  
                  {/* Daily Rate Comparison */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 mb-3">
                    <div className="text-2xl font-bold text-purple-600">
                      ${plan.dailyRate}/day
                    </div>
                    <div className="text-sm text-gray-600 line-through">
                      Was $29/day casual
                    </div>
                    <div className="text-green-600 font-semibold flex items-center justify-center gap-1">
                      💸 Save ${plan.savings}/day
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="mb-8">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Button */}
              <Button
                className={`w-full h-12 text-base font-semibold transition-all duration-300 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                    : 'bg-gray-900 hover:bg-gray-800 text-white'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
                data-testid={`button-select-${plan.id}`}
              >
                {selectedPlan === plan.id ? 'Selected Plan' : `Choose ${plan.name}`}
              </Button>

              {/* Urgency Message */}
              {plan.duration <= 60 && (
                <p className="text-center text-xs text-gray-500 mt-3">
                  ⚡ Perfect for motivated sellers
                </p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center bg-white/90 backdrop-blur-sm rounded-2xl p-8"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Skip the $20,000+ Commission?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Most homes sell in 30–50 days. Choose the plan that matches your timeline 
            and start reaching serious buyers today.
          </p>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span>10,000+ Active Buyers</span>
            </div>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-purple-600" />
              <span>Unlimited Photos & Videos</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-600" />
              <span>Swipe-Style Discovery</span>
            </div>
          </div>

          <Button 
            size="lg" 
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold"
            data-testid="button-get-started"
          >
            Get Started Today
          </Button>
          
          <p className="text-xs text-gray-500 mt-4">
            No long-term contracts • Cancel anytime • 30-day money-back guarantee
          </p>
        </motion.div>
      </div>
    </div>
  );
}