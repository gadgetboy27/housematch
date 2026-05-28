import { useState, useCallback, useEffect } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Heart, X } from "lucide-react";

// ============================================================================
// TYPES - Copy these to your schema/types file
// ============================================================================

export interface Card {
  id: string;
  name: string;
  age?: number;
  bio?: string;
  imageUrl: string;
}

export type SwipeDirection = "left" | "right" | "up" | "down";

export interface SwipeResult {
  cardId: string;
  direction: SwipeDirection;
}

// ============================================================================
// SWIPE CARD COMPONENT
// ============================================================================

interface SwipeCardProps {
  card: Card;
  onSwipe?: (result: SwipeResult) => void;
  onCardExit?: () => void;
  isTop?: boolean;
  index?: number;
  programmaticSwipeDirection?: "left" | "right" | null;
}

export function SwipeCard({ 
  card, 
  onSwipe, 
  onCardExit,
  isTop = true,
  index = 0,
  programmaticSwipeDirection = null
}: SwipeCardProps) {
  const [exitX, setExitX] = useState(0);
  const [exitY, setExitY] = useState(0);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Handle programmatic swipes in useEffect to avoid render-phase state updates
  useEffect(() => {
    if (programmaticSwipeDirection && exitX === 0) {
      const direction = programmaticSwipeDirection;
      setExitX(direction === "right" ? 1000 : -1000);
      setExitY(0);
      
      if (onSwipe) {
        onSwipe({ cardId: card.id, direction });
      }
      
      setTimeout(() => {
        if (onCardExit) {
          onCardExit();
        }
      }, 300);
    }
  }, [programmaticSwipeDirection, exitX, card.id, onSwipe, onCardExit]);

  const rotate = useTransform(x, [-200, 0, 200], [-30, 0, 30]);
  const opacity = useTransform(
    x,
    [-200, -150, 0, 150, 200],
    [0, 1, 1, 1, 0]
  );

  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      const threshold = 100;
      const velocity = info.velocity.x;
      const offset = info.offset.x;

      if (Math.abs(offset) > threshold || Math.abs(velocity) > 500) {
        const direction: SwipeDirection = offset > 0 ? "right" : "left";
        
        setExitX(offset > 0 ? 1000 : -1000);
        setExitY(info.offset.y);
        
        if (onSwipe) {
          onSwipe({ cardId: card.id, direction });
        }
        
        setTimeout(() => {
          if (onCardExit) {
            onCardExit();
          }
        }, 300);
      }
    },
    [card.id, onSwipe, onCardExit]
  );

  const zIndex = isTop ? 50 : 40 - index;
  const scale = isTop ? 1 : 0.95 - (index * 0.02);
  const translateY = isTop ? 0 : index * 8;

  return (
    <motion.div
      className="absolute w-full h-full touch-none"
      style={{
        x: isTop ? x : 0,
        y: isTop ? y : translateY,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? opacity : 0.85,
        zIndex,
        scale,
      }}
      drag={isTop ? true : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={1}
      onDragEnd={handleDragEnd}
      animate={{
        x: exitX,
        y: exitY,
        opacity: exitX !== 0 ? 0 : undefined,
        scale: exitX !== 0 ? 0.8 : scale,
        transition: {
          duration: 0.3,
          ease: "easeOut"
        }
      }}
      transition={{
        scale: { duration: 0.3 },
        y: { duration: 0.3 }
      }}
      data-testid={`swipe-card-${card.id}`}
    >
      <div className="relative w-full h-full rounded-3xl overflow-hidden bg-card shadow-2xl">
        {/* Card Image */}
        <img
          src={card.imageUrl}
          alt={card.name}
          className="absolute inset-0 w-full h-full object-cover"
          draggable="false"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />

        {/* LIKE Overlay */}
        <motion.div
          className="absolute top-12 left-8 border-4 border-green-500 px-6 py-3 rounded-xl -rotate-[30deg] pointer-events-none"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-6xl font-black text-green-500 tracking-wider">
            LIKE
          </span>
        </motion.div>

        {/* NOPE Overlay */}
        <motion.div
          className="absolute top-12 right-8 border-4 border-red-500 px-6 py-3 rounded-xl rotate-[30deg] pointer-events-none"
          style={{ opacity: nopeOpacity }}
        >
          <span className="text-6xl font-black text-red-500 tracking-wider">
            NOPE
          </span>
        </motion.div>

        {/* Card Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h2 className="text-3xl font-bold mb-1" data-testid={`card-name-${card.id}`}>
            {card.name}
            {card.age && (
              <span className="text-2xl font-medium ml-2">{card.age}</span>
            )}
          </h2>
          {card.bio && (
            <p className="text-base font-normal text-white/90 line-clamp-2" data-testid={`card-bio-${card.id}`}>
              {card.bio}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// SWIPE CARD STACK COMPONENT
// ============================================================================

interface SwipeCardStackProps {
  cards: Card[];
  onSwipe?: (result: SwipeResult) => void;
  onStackEmpty?: () => void;
}

export function SwipeCardStack({ cards, onSwipe, onStackEmpty }: SwipeCardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [programmaticSwipe, setProgrammaticSwipe] = useState<"left" | "right" | null>(null);

  const handleSwipe = useCallback(
    (result: SwipeResult) => {
      if (onSwipe) {
        onSwipe(result);
      }
    },
    [onSwipe]
  );

  const handleCardExit = useCallback(() => {
    setProgrammaticSwipe(null);
    setCurrentIndex((prev) => {
      const next = prev + 1;
      if (next >= cards.length && onStackEmpty) {
        setTimeout(() => onStackEmpty(), 100);
      }
      return next;
    });
  }, [cards.length, onStackEmpty]);

  const handleProgrammaticSwipe = useCallback(
    (direction: "left" | "right") => {
      if (currentIndex < cards.length && !programmaticSwipe) {
        setProgrammaticSwipe(direction);
      }
    },
    [currentIndex, cards.length, programmaticSwipe]
  );

  const visibleCards = cards.slice(currentIndex, currentIndex + 3);

  if (currentIndex >= cards.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center" data-testid="empty-stack-message">
          <p className="text-2xl font-semibold text-foreground mb-2">No more cards!</p>
          <p className="text-muted-foreground">You've seen all the profiles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Card Stack */}
      <div className="relative w-full h-full">
        {visibleCards.map((card, index) => (
          <SwipeCard
            key={card.id}
            card={card}
            onSwipe={handleSwipe}
            onCardExit={index === 0 ? handleCardExit : undefined}
            isTop={index === 0}
            index={index}
            programmaticSwipeDirection={index === 0 ? programmaticSwipe : null}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-6 z-[100] px-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleProgrammaticSwipe("left")}
          className="flex items-center justify-center h-16 w-16 rounded-full bg-white dark:bg-card border-2 border-red-500/20 shadow-lg hover-elevate active-elevate-2"
          data-testid="button-reject"
        >
          <X className="h-8 w-8 text-red-500" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleProgrammaticSwipe("right")}
          className="flex items-center justify-center h-16 w-16 rounded-full bg-white dark:bg-card border-2 border-green-500/20 shadow-lg hover-elevate active-elevate-2"
          data-testid="button-like"
        >
          <Heart className="h-8 w-8 text-green-500" />
        </motion.button>
      </div>
    </div>
  );
}
