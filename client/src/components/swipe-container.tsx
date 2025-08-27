import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import PropertyCard from "./property-card";
import { Property } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SwipeContainerProps {
  properties: Property[];
  onPropertySelect: (property: Property) => void;
  onSwipe: () => void;
}

export default function SwipeContainer({ properties, onPropertySelect, onSwipe }: SwipeContainerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwipingDisabled, setIsSwipingDisabled] = useState(false);
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

    // Record the swipe
    swipeMutation.mutate({
      userId,
      propertyId: currentProperty.id,
      action,
    });

    // Animate card out
    const targetX = direction === "left" ? -300 : direction === "right" ? 300 : 0;
    const targetY = direction === "up" ? -300 : 0;
    
    x.set(targetX);
    y.set(targetY);

    // Move to next property after animation
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % properties.length);
      x.set(0);
      y.set(0);
      setIsSwipingDisabled(false);
      onSwipe();
    }, 600);
  };

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
        }}
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        onDragEnd={handleDragEnd}
        onClick={handleCardClick}
        whileTap={{ scale: 0.98 }}
        data-testid="card-swipe-active"
      >
        <PropertyCard property={currentProperty} />
        
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
      </motion.div>

      {/* Professional Action Buttons */}
      <div className="absolute bottom-[2.25rem] left-1/2 transform -translate-x-1/2 flex items-center space-x-4 z-30">
        {/* Reject Button */}
        <motion.button
          className="relative group"
          onClick={() => handleSwipe("left", "dislike")}
          disabled={isSwipingDisabled}
          whileTap={{ scale: 0.95 }}
          data-testid="button-reject"
        >
          <div className="w-16 h-12 bg-gradient-to-b from-slate-500 to-slate-700 rounded-lg flex items-center justify-center
                          shadow-[0_12px_24px_rgba(0,0,0,0.5),0_8px_16px_rgba(0,0,0,0.3),0_4px_8px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.2)]
                          border border-slate-400/60 backdrop-blur-sm
                          group-active:shadow-[0_6px_12px_rgba(0,0,0,0.6),inset_0_3px_6px_rgba(0,0,0,0.3)]
                          group-active:transform group-active:translate-y-1
                          transition-all duration-200">
            <span className="text-white text-2xl font-bold drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)] 
                          group-active:scale-90 transition-transform filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">✕</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/30 rounded-lg pointer-events-none"></div>
        </motion.button>
        
        {/* Like Button - Premium Gold */}
        <motion.button
          className="relative group"
          onClick={() => handleSwipe("right", "like")}
          disabled={isSwipingDisabled}
          whileTap={{ scale: 0.95 }}
          data-testid="button-like"
        >
          <div className="w-20 h-14 bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500 rounded-lg flex items-center justify-center
                          shadow-[0_16px_32px_rgba(245,158,11,0.6),0_12px_24px_rgba(245,158,11,0.4),0_8px_16px_rgba(0,0,0,0.4),inset_0_3px_6px_rgba(255,255,255,0.4)]
                          border border-amber-200/80 backdrop-blur-sm
                          group-active:shadow-[0_8px_16px_rgba(245,158,11,0.7),inset_0_4px_8px_rgba(0,0,0,0.3)]
                          group-active:transform group-active:translate-y-1
                          transition-all duration-200">
            <span className="text-white text-2xl font-bold drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] 
                          group-active:scale-90 transition-transform filter drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">❤️</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-amber-600/40 rounded-lg pointer-events-none"></div>
        </motion.button>
        
        {/* Super Like Button - Professional Navy */}
        <motion.button
          className="relative group"
          onClick={() => handleSwipe("up", "super_like")}
          disabled={isSwipingDisabled}
          whileTap={{ scale: 0.95 }}
          data-testid="button-super-like"
        >
          <div className="w-16 h-12 bg-gradient-to-b from-blue-500 via-blue-600 to-blue-800 rounded-lg flex items-center justify-center
                          shadow-[0_12px_24px_rgba(29,78,216,0.6),0_8px_16px_rgba(29,78,216,0.4),0_4px_8px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(255,255,255,0.3)]
                          border border-blue-400/70 backdrop-blur-sm
                          group-active:shadow-[0_6px_12px_rgba(29,78,216,0.7),inset_0_3px_6px_rgba(0,0,0,0.3)]
                          group-active:transform group-active:translate-y-1
                          transition-all duration-200">
            <span className="text-yellow-200 text-2xl font-bold drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)] 
                          group-active:scale-90 transition-transform filter drop-shadow-[0_0_10px_rgba(255,255,100,0.6)]">⭐️</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-blue-800/40 rounded-lg pointer-events-none"></div>
        </motion.button>
      </div>
    </div>
  );
}
