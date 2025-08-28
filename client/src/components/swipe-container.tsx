import { forwardRef, useRef, useState, useImperativeHandle, useEffect } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import PropertyCard from "./property-card";
import HeartBubbles from "./heart-bubbles";
import { Property } from "@shared/schema";
import { useSwipe } from "@/utils/useSwipe";

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
>(
  ({ properties, onPropertySelect, onSwipe, onSwipeAction, onPropertyTypeFilter }, ref) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [heartTrigger, setHeartTrigger] = useState(false);
    const [isSwipingDisabled, setIsSwipingDisabled] = useState(false);

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-300, 0, 300], [-30, 0, 30]);
    const opacity = useTransform(x, [-300, -100, 0, 100, 300], [0, 1, 1, 1, 0]);
    const likeOpacity = useTransform(x, [0, 100], [0, 1]);
    const nopeOpacity = useTransform(x, [0, -100], [0, 1]);

    const cardRef = useRef<HTMLDivElement>(null);
    const currentProperty = properties[currentIndex];

    const { swipeAnalytics, onDragStart, onDragMove, onDragEnd } = useSwipe({ threshold: 150 });

    // Effect: when swipeAnalytics changes, trigger swipe
    useEffect(() => {
      if (swipeAnalytics?.direction && !isSwipingDisabled && currentProperty) {
        const directionMap: Record<string, "like" | "dislike" | "super_like"> = {
          left: "dislike",
          right: "like",
          up: "super_like",
        };

        const action = directionMap[swipeAnalytics.direction];
        handleSwipe(swipeAnalytics.direction, action);
      }
    }, [swipeAnalytics]);

    const handleSwipe = (direction: "left" | "right" | "up", action: "like" | "dislike" | "super_like") => {
      if (isSwipingDisabled || !currentProperty) return;
      setIsSwipingDisabled(true);

      // Heart effect for likes
      if (action === "like") setHeartTrigger(true);

      // Animate card offscreen
      const targetX = direction === "left" ? -600 : direction === "right" ? 600 : 0;
      const targetY = direction === "up" ? -800 : 0;
      x.set(targetX);
      y.set(targetY);

      // After animation, reset and move to next card
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % properties.length);
        x.set(0);
        y.set(0);
        setIsSwipingDisabled(false);
        setHeartTrigger(false);
        onSwipe();
      }, 300);

      onSwipeAction(direction, action);
    };

    // Expose functions to parent
    useImperativeHandle(ref, () => ({ handleSwipe, setHeartTrigger }));

    if (!currentProperty) {
      return (
        <div className="absolute inset-2 flex items-center justify-center text-white">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">No More Properties</h3>
            <p className="text-white/80 text-sm">Check back later for new listings</p>
          </div>
        </div>
      );
    }

    return (
      <div className="absolute inset-2">
        {/* Background Cards */}
        {properties.slice(currentIndex + 1, currentIndex + 3).map((property, index) => (
          <div
            key={`${property.id}-${index}`}
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
          style={{ x, y, rotate, opacity, zIndex: 20, willChange: "transform, opacity" }}
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.3}
          onDragStart={(e, info) => onDragStart(info.point.x, info.point.y)}
          onDrag={(e, info) => onDragMove(info.point.x, info.point.y)}
          onDragEnd={(e, info) => onDragEnd(info.point.x, info.point.y)}
        >
          <PropertyCard property={currentProperty} onPropertyTypeFilter={onPropertyTypeFilter} />

          {/* Swipe Indicators */}
          <motion.div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 text-green-500 text-6xl font-bold transform -rotate-12 drop-shadow-lg"
            style={{ opacity: likeOpacity }}
          >
            LIKE
          </motion.div>

          <motion.div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 text-red-500 text-6xl font-bold transform rotate-12 drop-shadow-lg"
            style={{ opacity: nopeOpacity }}
          >
            NOPE
          </motion.div>

          {/* Heart bubbles */}
          <HeartBubbles trigger={heartTrigger} onComplete={() => setHeartTrigger(false)} />
        </motion.div>
      </div>
    );
  }
);

SwipeContainer.displayName = "SwipeContainer";
export default SwipeContainer;
