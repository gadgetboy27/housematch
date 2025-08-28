import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence, animate } from "framer-motion";
import PropertyCard from "./property-card";
import { Property } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LocalStorageService } from "@/lib/local-storage";
import HeartBubbles from "./heart-bubbles";

interface SwipeContainerProps {
  properties: Property[];
  onPropertySelect: (property: Property) => void;
  onSwipe: () => void;
  onSwipeAction: (direction: "left" | "right" | "up", action: string) => void;
  onPropertyTypeFilter?: (type: string) => void;
}

const SwipeContainer = forwardRef<
  { handleSwipe: (direction: "left" | "right" | "up", action: string) => void; setHeartTrigger: (val: boolean) => void },
  SwipeContainerProps
>(({
  properties,
  onPropertySelect,
  onSwipe,
  onSwipeAction,
  onPropertyTypeFilter,
}, ref) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwipingDisabled, setIsSwipingDisabled] = useState(false);
  const [heartTrigger, setHeartTrigger] = useState(false);

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

  const currentProperty = properties[currentIndex];

  const handleSwipe = async (direction: "left" | "right" | "up", action: string) => {
    if (isSwipingDisabled || !currentProperty) return;
    setIsSwipingDisabled(true);

    // Heart bubble for likes
    if (action === "like" || action === "super_like") {
      if (action === "like") setHeartTrigger(true);
      LocalStorageService.addLikedProperty(currentProperty, action as "like" | "super_like");
      toast({
        title: action === "super_like" ? "Super Liked!" : "Liked!",
        description: `${currentProperty.title} saved`,
        duration: 800,
        variant: "subtle" as any,
      });
    }

    // Record swipe
    const session = LocalStorageService.getUserSession();
    const uid = session.isLoggedIn && session.userId ? session.userId : userId;
    swipeMutation.mutate({ userId: uid, propertyId: currentProperty.id, action });

    // Animate off-screen using framer motion
    const targetX = direction === "left" ? -window.innerWidth * 1.5 : direction === "right" ? window.innerWidth * 1.5 : 0;
    const targetY = direction === "up" ? -window.innerHeight * 1.5 : 0;

    // Immediately advance to next card so it slides into position
    setCurrentIndex(prev => (prev + 1) % properties.length);
    
    // Animate the old card off-screen (it's now gone from currentProperty)
    animate(x, targetX, { type: "spring", stiffness: 300, damping: 25, duration: 0.6 });
    animate(y, targetY, { type: "spring", stiffness: 300, damping: 25, duration: 0.6 });
    
    // After animation completes, reset for the next swipe
    setTimeout(() => {
      x.set(0);
      y.set(0);
      setIsSwipingDisabled(false);
      setHeartTrigger(false);
    }, 600);

    onSwipe();
    onSwipeAction(direction, action);
  };

  useImperativeHandle(ref, () => ({ handleSwipe, setHeartTrigger }));

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100; // Tinder-like threshold
    const velocityThreshold = 600; // Slightly higher for better feel

    if (Math.abs(info.offset.x) > threshold || Math.abs(info.velocity.x) > velocityThreshold) {
      handleSwipe(info.offset.x > 0 ? "right" : "left", info.offset.x > 0 ? "like" : "dislike");
    } else if (Math.abs(info.offset.y) > threshold && info.offset.y < 0) {
      handleSwipe("up", "super_like");
    } else {
      // Smooth spring reset using framer motion animate
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
      animate(y, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  };

  const handleClick = () => {
    if (Math.abs(x.get()) < 10 && currentProperty) onPropertySelect(currentProperty);
  };

  if (!currentProperty) return (
    <div className="absolute inset-2 flex items-center justify-center text-white/80">
      No More Properties
    </div>
  );

  return (
    <div className="absolute inset-2">
      {properties.slice(currentIndex + 1, currentIndex + 3).map((p, i) => (
        <div
          key={`${p.id}-${currentIndex}-${i}`}
          className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
          style={{ 
            transform: `scale(${0.98 - i * 0.015}) translateY(${(i + 1) * 8}px)`,
            zIndex: 10 - i 
          }}
        >
          <PropertyCard property={p} isBackground />
        </div>
      ))}

      <motion.div
        className="absolute inset-0 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ 
          x, 
          y, 
          rotate, 
          opacity, 
          zIndex: 20, 
          touchAction: "none", 
          willChange: "transform, opacity" 
        }}
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.1} // More rigid like Tinder
        dragMomentum={false} // Prevents overshoot
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        whileTap={{ scale: 0.99 }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 30,
          mass: 1
        }}
      >
        <PropertyCard property={currentProperty} onPropertyTypeFilter={onPropertyTypeFilter} />

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
