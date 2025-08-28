import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from "framer-motion";
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
  const rotate = useTransform(x, [-300, 0, 300], [-25, 0, 25]);
  const opacity = useTransform(x, [-300, -100, 0, 100, 300], [0, 1, 1, 1, 0]);
  const likeOpacity = useTransform(x, [0, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [0, -120], [0, 1]);

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

  const handleSwipe = (direction: "left" | "right" | "up", action: string) => {
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

    // Animate off-screen
    const targetX = direction === "left" ? -window.innerWidth * 1.5 : direction === "right" ? window.innerWidth * 1.5 : 0;
    const targetY = direction === "up" ? -window.innerHeight * 1.5 : 0;

    x.set(targetX);
    y.set(targetY);

    setTimeout(() => {
      x.set(0);
      y.set(0);
      setCurrentIndex(prev => (prev + 1) % properties.length);
      setIsSwipingDisabled(false);
      setHeartTrigger(false);
    }, 500);

    onSwipe();
    onSwipeAction(direction, action);
  };

  useImperativeHandle(ref, () => ({ handleSwipe, setHeartTrigger }));

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 120; // increased for mobile
    const velocityThreshold = 500;

    if (Math.abs(info.offset.x) > threshold || Math.abs(info.velocity.x) > velocityThreshold) {
      handleSwipe(info.offset.x > 0 ? "right" : "left", info.offset.x > 0 ? "like" : "dislike");
    } else if (Math.abs(info.offset.y) > threshold && info.offset.y < 0) {
      handleSwipe("up", "super_like");
    } else {
      // Smooth spring reset
      x.set(0);
      y.set(0);
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
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{ transform: `scale(${0.95 - i * 0.05}) translateY(${(i + 1) * 10}px)`, zIndex: 10 - i }}
        >
          <PropertyCard property={p} isBackground />
        </div>
      ))}

      <motion.div
        className="absolute inset-0 rounded-2xl overflow-hidden cursor-pointer"
        style={{ 
          zIndex: 20, 
          touchAction: "auto"
        }}
        onClick={handleClick}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }} // spring for smooth motion
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