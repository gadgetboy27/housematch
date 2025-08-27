import { useState, useRef, useCallback } from "react";
import { PanInfo } from "framer-motion";

interface SwipeConfig {
  threshold?: number;
  velocityThreshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  disabled?: boolean;
}

export function useSwipe({
  threshold = 100,
  velocityThreshold = 500,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  disabled = false,
}: SwipeConfig) {
  const [isDragging, setIsDragging] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | "up" | "down" | null>(null);
  const startPositionRef = useRef({ x: 0, y: 0 });

  const handleDragStart = useCallback((event: any, info: PanInfo) => {
    if (disabled) return;
    
    setIsDragging(true);
    setSwipeDirection(null);
    startPositionRef.current = { x: info.point.x, y: info.point.y };
  }, [disabled]);

  const handleDrag = useCallback((event: any, info: PanInfo) => {
    if (disabled || !isDragging) return;

    const deltaX = info.point.x - startPositionRef.current.x;
    const deltaY = info.point.y - startPositionRef.current.y;

    // Determine primary swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeDirection(deltaX > 0 ? "right" : "left");
    } else {
      setSwipeDirection(deltaY > 0 ? "down" : "up");
    }
  }, [disabled, isDragging]);

  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    if (disabled) {
      setIsDragging(false);
      setSwipeDirection(null);
      return;
    }

    const deltaX = info.offset.x;
    const deltaY = info.offset.y;
    const velocityX = info.velocity.x;
    const velocityY = info.velocity.y;

    setIsDragging(false);

    // Check if swipe meets threshold criteria
    const meetsDistanceThreshold = Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold;
    const meetsVelocityThreshold = Math.abs(velocityX) > velocityThreshold || Math.abs(velocityY) > velocityThreshold;

    if (meetsDistanceThreshold || meetsVelocityThreshold) {
      // Determine which direction had the most movement
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    }

    setSwipeDirection(null);
  }, [disabled, threshold, velocityThreshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return {
    isDragging,
    swipeDirection,
    handlers: {
      onDragStart: handleDragStart,
      onDrag: handleDrag,
      onDragEnd: handleDragEnd,
    },
  };
}

// Hook for touch-based swipe detection (alternative to drag)
export function useTouchSwipe({
  threshold = 50,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  disabled = false,
}: SwipeConfig) {
  const touchStartRef = useRef({ x: 0, y: 0 });
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (disabled) return;
    
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsSwiping(true);
  }, [disabled]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (disabled || !isSwiping) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    setIsSwiping(false);

    // Check if swipe meets threshold
    if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    }
  }, [disabled, isSwiping, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return {
    isSwiping,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
    },
  };
}

// Utility function to create swipe animations
export function getSwipeTransform(
  direction: "left" | "right" | "up" | "down" | null,
  progress: number
) {
  if (!direction) return "translate(0px, 0px) rotate(0deg)";

  const maxDistance = 300;
  const maxRotation = 30;

  switch (direction) {
    case "left":
      return `translate(${-progress * maxDistance}px, 0px) rotate(${-progress * maxRotation}deg)`;
    case "right":
      return `translate(${progress * maxDistance}px, 0px) rotate(${progress * maxRotation}deg)`;
    case "up":
      return `translate(0px, ${-progress * maxDistance}px) rotate(0deg)`;
    case "down":
      return `translate(0px, ${progress * maxDistance}px) rotate(0deg)`;
    default:
      return "translate(0px, 0px) rotate(0deg)";
  }
}
