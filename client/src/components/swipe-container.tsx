import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence, animate } from "framer-motion";
import PropertyCard from "./property-card";
import LandingCard from "./landing-card";
import { Property, PricingPlan } from "@shared/schema";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LocalStorageService } from "@/lib/local-storage";
import HeartBubbles from "./heart-bubbles";
import { PricingCard } from "./pricing-card";
import { fbTrackViewContent, fbTrackAddToWishlist } from "@/components/FacebookPixel";

interface SwipeCard {
  type: 'property' | 'pricing' | 'landing';
  data: Property | PricingPlan | null;
}

interface SwipeContainerProps {
  properties: Property[];
  onSwipe: () => void;
  onSwipeAction: (direction: "left" | "right" | "up", action: string) => void;
  onPropertyTypeFilter?: (type: string) => void;
  selectedPropertyType?: string;
  user?: { id: string; name: string; email: string } | null;
  onOpenAuth?: () => void;
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
  user,
  onOpenAuth,
}, ref) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwipingDisabled, setIsSwipingDisabled] = useState(false);
  const [heartTrigger, setHeartTrigger] = useState(false);
  const [propertyHistory, setPropertyHistory] = useState<number[]>([]);

  // Fetch pricing plans
  const { data: pricingPlans = [] } = useQuery<PricingPlan[]>({
    queryKey: ["/api/pricing-plans"],
  });

  // Mix properties with pricing cards and landing card
  const mixedCards = () => {
    const cards: SwipeCard[] = [];

    // Add landing card as first card
    cards.push({ type: 'landing', data: null });

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
  const rotate = useTransform(x, [-200, 0, 200], [-30, 0, 30]); // More dramatic rotation for better visual feedback
  const opacity = useTransform(x, [-200, -50, 0, 50, 200], [0.3, 1, 1, 1, 0.3]); // Better opacity curve
  const likeOpacity = useTransform(x, [0, 100], [0, 1]); // Smoother fade-in
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]); // Smoother fade-out

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const swipeMutation = useMutation({
    mutationFn: async (swipeData: { propertyId: string; action: string }) => {
      const res = await apiRequest("POST", "/api/swipes", swipeData);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate swipes for the currently logged-in user
      const session = LocalStorageService.getUserSession();
      if (session.userId) {
        queryClient.invalidateQueries({ queryKey: ["/api/swipes", session.userId] });
      }
    },
  });

  const currentCard = cards[currentIndex];
  const currentProperty = currentCard?.type === 'property' ? currentCard.data as Property : null;

  // Track ViewContent on Facebook Pixel whenever a new property card becomes active
  useEffect(() => {
    if (currentProperty) {
      fbTrackViewContent({
        id: currentProperty.id,
        address: currentProperty.address,
        suburb: currentProperty.suburb ?? undefined,
        price: currentProperty.price ?? undefined,
        bedrooms: currentProperty.bedrooms ?? undefined,
        propertyType: currentProperty.propertyType ?? undefined,
      });
    }
  }, [currentIndex]);

  const handleSwipe = async (direction: "left" | "right" | "up", action: string) => {
    if (isSwipingDisabled || !currentCard) return;
    setIsSwipingDisabled(true);

    if (currentCard.type === 'property') {
      const property = currentCard.data as Property;
      
      // Check if user is logged in for database persistence
      const session = LocalStorageService.getUserSession();
      const isLoggedIn = session.isLoggedIn && session.userId;
      
      // Heart bubble for likes
      if (action === "like") {
        setHeartTrigger(true);
        LocalStorageService.addLikedProperty(property, action as "like");
        // FB: Track property save as AddToWishlist
        fbTrackAddToWishlist({
          id: property.id,
          address: property.address,
          price: property.price ?? undefined,
          propertyType: property.propertyType ?? undefined,
        });
        toast({
          title: isLoggedIn ? "Liked!" : "Liked (Login to save)",
          description: isLoggedIn 
            ? `${property.title} saved` 
            : "Log in to save your likes and access them later",
          duration: isLoggedIn ? 800 : 2000,
          variant: "subtle" as any,
        });
      }

      // Only record swipe in database if user is logged in
      if (isLoggedIn) {
        swipeMutation.mutate({ propertyId: property.id, action });
      }
    } else {
      // Handle pricing card swipe - no database record needed
      const plan = currentCard.data as PricingPlan;
      if (action === "like") {
        setHeartTrigger(true); // Show heart animation for pricing cards too
        toast({
          title: "💰 Interested in selling?",
          description: `${plan.name} could save you thousands in commission fees!`,
          duration: 2500,
        });
      }
      // Don't call swipeMutation for pricing cards - no property ID to save
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
    
    // Reset card position to center
    x.set(0);
    y.set(0);
    
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
    } else {
      // Silky smooth spring reset using optimized parameters
      animate(x, 0, { type: "spring", stiffness: 250, damping: 20, mass: 0.6 });
      animate(y, 0, { type: "spring", stiffness: 250, damping: 20, mass: 0.6 });
    }
  };


  if (!currentProperty) return (
    <div className="absolute inset-2 flex items-center justify-center text-white/80">
      No More Properties
    </div>
  );

  return (
    <div className="absolute inset-2 di-negative-top">
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
          bounceStiffness: 800,
          bounceDamping: 15,
          power: 0.2 // Ultra smooth mobile dragging
        }}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.98 }}
        whileDrag={{ 
          scale: 1.02, // Less aggressive scale for mobile performance
          rotateZ: 0 // Prevent additional rotation during drag that causes jank
        }}
        transition={{ 
          type: "spring", 
          stiffness: 400, // Increased for silky smooth response
          damping: 25,    // Reduced for smoother transitions
          mass: 0.6,      // Even lighter feel for fluid motion
          velocity: 0     // Start from rest for consistent feel
        }}
      >
        {currentCard?.type === 'landing' ? (
          <LandingCard />
        ) : currentCard?.type === 'property' ? (
          <PropertyCard
            property={currentCard.data as Property}
            onPropertyTypeFilter={onPropertyTypeFilter}
            selectedPropertyType={selectedPropertyType}
            user={user}
            onOpenAuth={onOpenAuth}
          />
        ) : currentCard?.type === 'pricing' ? (
          <PricingCard
            plan={currentCard.data as PricingPlan}
          />
        ) : null}

        {/* LIKE Overlay - Enhanced styling */}
        <motion.div 
          className="absolute top-12 left-8 border-4 border-green-500 px-6 py-3 rounded-xl -rotate-[30deg] pointer-events-none z-30" 
          style={{ opacity: likeOpacity }}
        >
          <span className="text-6xl font-black text-green-500 tracking-wider">
            LIKE
          </span>
        </motion.div>

        {/* NOPE Overlay - Enhanced styling */}
        <motion.div 
          className="absolute top-12 right-8 border-4 border-red-500 px-6 py-3 rounded-xl rotate-[30deg] pointer-events-none z-30" 
          style={{ opacity: nopeOpacity }}
        >
          <span className="text-6xl font-black text-red-500 tracking-wider">
            NOPE
          </span>
        </motion.div>

        <HeartBubbles trigger={heartTrigger} onComplete={() => setHeartTrigger(false)} />
      </motion.div>
    </div>
  );
});

SwipeContainer.displayName = "SwipeContainer";
export default SwipeContainer;
