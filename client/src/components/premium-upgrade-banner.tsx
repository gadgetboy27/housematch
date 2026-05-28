import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, X } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PremiumUpgradeBannerProps {
  totalAiSpending: number;
}

export default function PremiumUpgradeBanner({ totalAiSpending }: PremiumUpgradeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [, setLocation] = useLocation();

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-4"
        data-testid="banner-premium-upgrade"
      >
        <Card className="bg-gradient-to-r from-purple-600 to-pink-600 border-none text-white shadow-lg">
          <CardContent className="p-4 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white hover:bg-white/20"
              onClick={() => setIsDismissed(true)}
              data-testid="button-dismiss-banner"
            >
              <X className="w-4 h-4" />
            </Button>

            <div className="flex items-start gap-4 pr-8">
              <div className="flex-shrink-0 mt-1">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Crown className="w-6 h-6 text-yellow-300" />
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <h3 className="font-bold text-lg">You're a Power User!</h3>
                </div>
                <p className="text-white/90 text-sm mb-3">
                  You've spent <span className="font-bold">${Number(totalAiSpending || 0).toFixed(2)}</span> on AI features. 
                  Get unlimited access for just <span className="font-bold">$29/month</span> with Premium!
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="bg-white text-purple-600 hover:bg-white/90 font-medium"
                    size="sm"
                    onClick={() => setLocation("/premium")}
                    data-testid="button-view-premium"
                  >
                    View Premium Benefits
                  </Button>
                  <div className="text-xs text-white/80 flex items-center">
                    💡 Includes 2 free title searches ($30 value)
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
