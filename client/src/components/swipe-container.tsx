import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence, animate } from "framer-motion";
import PropertyCard from "./property-card";
import { Property, PricingPlan } from "@shared/schema";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LocalStorageService } from "@/lib/local-storage";
import HeartBubbles from "./heart-bubbles";
import { PricingCard } from "./pricing-card";

interface SwipeCard {
  type: 'property' | 'pricing';
  data: Property | PricingPlan;
}

interface SwipeContainerProps {
  properties: Property[];
  onSwipe: () => void;
  onSwipeAction: (direction: "left" | "right" | "up", action: string) => void;
  onPropertyTypeFilter?: (type: string) => void;
  selectedPropertyType?: string;
}

const SwipeContainer = forwardRef<
  { handleSwipe: (direction: "left" | "right" | "up", action: string) => void; setHeartTrigger: (val: boolean) => void; handleBack: () => void },
  SwipeContainerProps
>(({
  properties,
  onSwipe,
  onSwipeAction,
  onPropertyTypeFilter,
  selectedPropertyType,
}, ref) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwipingDisabled, setIsSwipingDisabled] = useState(false);
  const [heartTrigger, setHeartTrigger] = useState(false);
  const [propertyHistory, setPropertyHistory] = useState<number[]>([]);

  // Fetch pricing plans
  const { data: pricingPlans = [] } = useQuery<PricingPlan[]>({
    queryKey: ["/api/pricing-plans"],
  });

  // Mix properties with pricing cards every 5-7 properties
  const mixedCards = () => {
    const cards: SwipeCard[] = [];
    let pricingIndex = 0;
    
    properties.forEach((property, index) => {
      cards.push({ type: 'property', data: property });
      
      // Add pricing card every 6 properties (range of 5-7)
      if ((index + 1) % 6 === 0 && pricingPlans.length > 0) {
        const planIndex = pricingIndex % pricingPlans.length;
        cards.push({ type: 'pricing', data: pricingPlans[planIndex] });
        pricingIndex++;
      }
    });
    
    return cards;
  };

  const cards = mixedCards();

  // Create storage key based on property type filter
  const getStorageKey = () => `property-position-${selectedPropertyType || 'all'}`;

  // Save current index to localStorage whenever it changes
  useEffect(() => {
    if (currentIndex >= 0 && properties.length > 0) {
      localStorage.setItem(getStorageKey(), currentIndex.toString());
    }
  }, [currentIndex, selectedPropertyType, properties.length]);

  // Restore index when properties change or component mounts
  useEffect(() => {
    const savedIndex = localStorage.getItem(getStorageKey());
    if (savedIndex && properties.length > 0) {
      const parsedIndex = parseInt(savedIndex, 10);
      // Make sure saved index is within bounds
      const validIndex = Math.min(parsedIndex, properties.length - 1);
      setCurrentIndex(validIndex);
    } else {
      setCurrentIndex(0);
    }
    x.set(0);
    y.set(0);
  }, [properties, selectedPropertyType]);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]); // More subtle rotation like Tinder
  const opacity = useTransform(x, [-200, -50, 0, 50, 200], [0.3, 1, 1, 1, 0.3]); // Better opacity curve
  const likeOpacity = useTransform(x, [50, 150], [0, 1]); // Earlier feedback
  const nopeOpacity = useTransform(x, [-150, -50], [1, 0]); // Earlier feedback

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = "demo-user";

  const swipeMutation = useMutation({
    mutationFn: async (swipeData: { userId: string; propertyId: string; action: string }) => {
      const res = await apiRequest("POST", "/api/swipes", swipeData);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/swipes", userId] }),
  });

  const currentCard = cards[currentIndex];
  const currentProperty = currentCard?.type === 'property' ? currentCard.data as Property : null;

  const handleSwipe = async (direction: "left" | "right" | "up", action: string) => {
    if (isSwipingDisabled || !currentCard) return;
    setIsSwipingDisabled(true);

    if (currentCard.type === 'property') {
      const property = currentCard.data as Property;
      // Heart bubble for likes
      if (action === "like" || action === "super_like") {
        if (action === "like") setHeartTrigger(true);
        LocalStorageService.addLikedProperty(property, action as "like" | "super_like");
        toast({
          title: action === "super_like" ? "Super Liked!" : "Liked!",
          description: `${property.title} saved`,
          duration: 800,
          variant: (action === "super_like" ? "superlike" : "subtle") as any,
        });
      }

      // Record swipe for property
      const session = LocalStorageService.getUserSession();
      const uid = session.isLoggedIn && session.userId ? session.userId : userId;
      swipeMutation.mutate({ userId: uid, propertyId: property.id, action });
    } else {
      // Handle pricing card swipe
      const plan = currentCard.data as PricingPlan;
      if (action === "like") {
        toast({
          title: "Interested in selling?",
          description: `${plan.name} plan looks great! Check out our pricing page.`,
          duration: 2000,
        });
      }
    }

    // Animate off-screen using framer motion
    const targetX = direction === "left" ? -window.innerWidth * 1.5 : direction === "right" ? window.innerWidth * 1.5 : 0;
    const targetY = direction === "up" ? -window.innerHeight * 1.5 : 0;

    // Use framer motion animate with spring for smoother exit like Tinder
    await Promise.all([
      animate(x, targetX, { type: "spring", stiffness: 220, damping: 18 }),
      animate(y, targetY, { type: "spring", stiffness: 220, damping: 18 }),
    ]);

    // Add current index to history before advancing
    setPropertyHistory(prev => [...prev, currentIndex]);
    
    // Advance to next card first
    const nextIndex = (currentIndex + 1) % cards.length;
    setCurrentIndex(nextIndex);
    
    // For superlike (up swipe), animate new card in from above
    if (direction === "up") {
      y.set(-window.innerHeight * 1.5); // Start closer to screen
      x.set(0);
      // Faster but still smooth animation
      // Same speed as exit animation
      await animate(y, 0, { 
        type: "spring", 
        stiffness: 240,  // More responsive
        damping: 22     // Quick settling
      });
    } else {
      // For left/right swipes, just reset to center
      x.set(0);
      y.set(0);
    }
    
    setIsSwipingDisabled(false);
    setHeartTrigger(false);

    onSwipe();
    onSwipeAction(direction, action);
  };

  const handleBack = () => {
    if (propertyHistory.length === 0 || isSwipingDisabled) return;
    
    setIsSwipingDisabled(true);
    const previousIndex = propertyHistory[propertyHistory.length - 1];
    
    // Remove the last item from history
    setPropertyHistory(prev => prev.slice(0, -1));
    
    // Set to previous property
    setCurrentIndex(previousIndex);
    
    // Reset card position
    x.set(0);
    y.set(0);
    
    setIsSwipingDisabled(false);
    
    toast({
      title: "Went Back",
      description: "Returned to previous property",
      duration: 800,
      variant: "subtle" as any,
    });
  };

  useImperativeHandle(ref, () => ({ handleSwipe, setHeartTrigger, handleBack }));

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100; // Tinder-like threshold
    const velocityThreshold = 600; // Slightly higher for better feel

    if (Math.abs(info.offset.x) > threshold || Math.abs(info.velocity.x) > velocityThreshold) {
      handleSwipe(info.offset.x > 0 ? "right" : "left", info.offset.x > 0 ? "like" : "dislike");
    } else if (Math.abs(info.offset.y) > threshold && info.offset.y < 0) {
      handleSwipe("up", "super_like");
    } else {
      // Smooth spring reset using framer motion animate
      animate(x, 0, { type: "spring", stiffness: 180, damping: 18 });
      animate(y, 0, { type: "spring", stiffness: 180, damping: 18 });
    }
  };


  if (!currentProperty) return (
    <div className="absolute inset-2 flex items-center justify-center text-white/80">
      No More Properties
    </div>
  );

  return (
    <div className="absolute inset-2">
      <motion.div
        className="absolute inset-0 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ 
          x, 
          y, 
          rotate, 
          opacity, 
          zIndex: 20, 
          touchAction: "none", // Allow full control of touch events
          willChange: "transform", // Optimize for hardware acceleration
          backfaceVisibility: "hidden", // Prevent flicker
          perspective: 1000, // Enable 3D acceleration
          transform: "translateZ(0)" // Force hardware acceleration
        }}
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.2} // Slightly more elastic for better mobile feel
        dragMomentum={false} // Prevents overshoot
        dragTransition={{ 
          bounceStiffness: 600,
          bounceDamping: 20,
          power: 0.3 // Smoother mobile dragging
        }}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.98 }}
        whileDrag={{ 
          scale: 1.02, // Less aggressive scale for mobile performance
          rotateZ: 0 // Prevent additional rotation during drag that causes jank
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, // Reduced for smoother mobile performance
          damping: 35,    // Higher damping for less bounce
          mass: 0.8       // Lighter feel
        }}
      >
        {currentCard?.type === 'property' ? (
          <PropertyCard 
            property={currentCard.data as Property} 
            onPropertyTypeFilter={onPropertyTypeFilter} 
            selectedPropertyType={selectedPropertyType} 
          />
        ) : currentCard?.type === 'pricing' ? (
          <PricingCard 
            plan={currentCard.data as PricingPlan}
            isCompact={true}
          />
        ) : null}

        <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30" style={{ opacity: likeOpacity }}>
          <div className="text-green-500 text-6xl font-bold transform -rotate-12 drop-shadow-lg">LIKE</div>
        </motion.div>

        <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30" style={{ opacity: nopeOpacity }}>
          <div className="text-red-500 text-6xl font-bold transform rotate-12 drop-shadow-lg">NOPE</div>
        </motion.div>

        <HeartBubbles trigger={heartTrigger} onComplete={() => setHeartTrigger(false)} />
      </motion.div>
    </div>
  );
});

SwipeContainer.displayName = "SwipeContainer";
export default SwipeContainer;
