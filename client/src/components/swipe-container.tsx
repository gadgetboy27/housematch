import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
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

const SwipeContainer = forwardRef<{ handleSwipe: (direction: "left" | "right" | "up", action: string) => void }, SwipeContainerProps>(
  ({ properties, onPropertySelect, onSwipe, onSwipeAction, onPropertyTypeFilter }, ref) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwipingDisabled, setIsSwipingDisabled] = useState(false);
  const [heartTrigger, setHeartTrigger] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-30, 0, 30]);
  const opacity = useTransform(x, [-300, -100, 0, 100, 300], [0, 1, 1, 1, 0]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [0, -100], [0, 1]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock user ID for demo
  const userId = "demo-user";

  const swipeMutation = useMutation({
    mutationFn: async (swipeData: { userId: string; propertyId: string; action: string }) => {
      const response = await apiRequest("POST", "/api/swipes", swipeData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/swipes", userId] });
    },
  });

  const currentProperty = properties[currentIndex];

  const handleSwipe = (direction: "left" | "right" | "up", action: string) => {
    if (isSwipingDisabled || !currentProperty) return;

    setIsSwipingDisabled(true);

    // Save to local storage if it's a like action
    if (action === "like" || action === "super_like") {
      try {
        LocalStorageService.addLikedProperty(currentProperty, action as "like" | "super_like");
        
        // Trigger heart bubbles for regular likes only
        if (action === "like") {
          setHeartTrigger(true);
        }
        
        toast({
          title: action === "super_like" ? "Super Liked!" : "Liked!",
          description: `${currentProperty.title} saved to your favorites`,
          duration: 500,
          variant: "subtle" as any,
        });
      } catch (error) {
        console.error("Error saving liked property:", error);
      }
    }

    // Record the swipe to server (if user is logged in, this will be handled)
    const userSession = LocalStorageService.getUserSession();
    if (userSession.isLoggedIn && userSession.userId) {
      swipeMutation.mutate({
        userId: userSession.userId,
        propertyId: currentProperty.id,
        action,
      });
    } else {
      // Just record for demo user as fallback
      swipeMutation.mutate({
        userId,
        propertyId: currentProperty.id,
        action,
      });
    }

    // Animate card out smoothly
    const targetX = direction === "left" ? -300 : direction === "right" ? 300 : 0;
    const targetY = direction === "up" ? -300 : 0;
    
    // Use smooth animation instead of instant set
    const animationControls = {
      x: targetX,
      y: targetY,
      transition: { 
        duration: 0.3, 
        ease: "easeOut",
        type: "tween"
      }
    };

    // Animate and then reset
    Promise.resolve().then(() => {
      // Move to next property after smooth animation
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % properties.length);
        // Reset positions smoothly
        x.set(0);
        y.set(0);
        setIsSwipingDisabled(false);
        onSwipe();
      }, 300);
    });
    
    // Set target position with smooth transition
    x.set(targetX);
    y.set(targetY);

    // Call the external action handler
    onSwipeAction(direction, action);
  };

  // Expose handleSwipe function to parent component
  useImperativeHandle(ref, () => ({
    handleSwipe,
    setHeartTrigger,
  }));

  const handleDragEnd = (event: any, info: PanInfo) => {
    const swipeThreshold = 100;
    const velocity = info.velocity.x;

    if (Math.abs(info.offset.x) > swipeThreshold || Math.abs(velocity) > 500) {
      if (info.offset.x > 0) {
        handleSwipe("right", "like");
      } else {
        handleSwipe("left", "dislike");
      }
    } else {
      // Snap back
      x.set(0);
      y.set(0);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Only trigger if not dragging
    if (Math.abs(x.get()) < 10 && currentProperty) {
      onPropertySelect(currentProperty);
    }
  };

  if (!currentProperty) {
    return (
      <div className="absolute inset-4 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-home text-2xl"></i>
          </div>
          <h3 className="text-lg font-semibold mb-2">No More Properties</h3>
          <p className="text-white/80 text-sm">Check back later for new listings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-4">
      {/* Background Cards */}
      {properties.slice(currentIndex + 1, currentIndex + 3).map((property, index) => (
        <div
          key={`${property.id}-${currentIndex}-${index}`}
          className="absolute inset-0 bg-white rounded-2xl overflow-hidden"
          style={{
            transform: `scale(${0.95 - index * 0.05}) translateY(${(index + 1) * 10}px)`,
            zIndex: 10 - index,
          }}
        >
          <PropertyCard property={property} isBackground />
        </div>
      ))}

      {/* Active Card */}
      <motion.div
        ref={cardRef}
        className="absolute inset-0 bg-white rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          x,
          y,
          rotate,
          opacity,
          zIndex: 20,
          willChange: "transform, opacity", // Hardware acceleration
          touchAction: "pan-y", // Better touch handling
        }}
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.3}
        onDragEnd={handleDragEnd}
        onClick={handleCardClick}
        whileTap={{ scale: 0.98 }}
        data-testid="card-swipe-active"
        transition={{
          type: "spring",
          damping: 25,
          stiffness: 300,
        }}
      >
        <PropertyCard 
          property={currentProperty} 
          onPropertyTypeFilter={onPropertyTypeFilter}
        />
        
        {/* Swipe Indicators */}
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
          style={{ opacity: likeOpacity }}
        >
          <div className="text-green-500 text-6xl font-bold transform -rotate-12 drop-shadow-lg">
            LIKE
          </div>
        </motion.div>
        
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
          style={{ opacity: nopeOpacity }}
        >
          <div className="text-red-500 text-6xl font-bold transform rotate-12 drop-shadow-lg">
            NOPE
          </div>
        </motion.div>
        
        {/* Heart Bubbles Effect */}
        <HeartBubbles 
          trigger={heartTrigger} 
          onComplete={() => setHeartTrigger(false)} 
        />
      </motion.div>

    </div>
  );
});

SwipeContainer.displayName = 'SwipeContainer';

export default SwipeContainer;
