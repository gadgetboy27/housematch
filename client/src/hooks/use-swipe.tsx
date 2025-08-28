// src/utils/useSwipe.ts
import { useState, useRef, useEffect, useCallback } from "react";

export interface SwipeAnalytics {
  direction: "left" | "right" | "up" | null;
  distanceX: number;
  distanceY: number;
  velocityX: number;
  velocityY: number;
  timestamp: number;
}

interface UseSwipeConfig {
  threshold?: number; // Minimum distance to count as swipe
}

export const useSwipe = (config: UseSwipeConfig = {}) => {
  const { threshold = 100 } = config;

  const [isDragging, setIsDragging] = useState(false);
  const [swipeAnalytics, setSwipeAnalytics] = useState<SwipeAnalytics | null>(null);

  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);

  const onDragStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    startX.current = clientX;
    startY.current = clientY;
    startTime.current = Date.now();
  }, []);

  const onDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    // We could track real-time metrics here if needed
  }, [isDragging]);

  const onDragEnd = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    setIsDragging(false);

    const dx = clientX - startX.current;
    const dy = clientY - startY.current;
    const dt = (Date.now() - startTime.current) / 1000; // seconds

    const velocityX = dx / dt;
    const velocityY = dy / dt;

    let direction: "left" | "right" | "up" | null = null;
    if (Math.abs(dx) > threshold) {
      direction = dx > 0 ? "right" : "left";
    } else if (dy < -threshold) {
      direction = "up";
    }

    setSwipeAnalytics({
      direction,
      distanceX: dx,
      distanceY: dy,
      velocityX,
      velocityY,
      timestamp: Date.now(),
    });
  }, [isDragging, threshold]);

  return {
    isDragging,
    swipeAnalytics,
    onDragStart,
    onDragMove,
    onDragEnd,
  };
};
