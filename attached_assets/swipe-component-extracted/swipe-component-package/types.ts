// ============================================================================
// SWIPE CARD TYPES
// ============================================================================
// Copy these to your app's schema or types file

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
