// ============================================================================
// COMPLETE EXAMPLE: Full Swipe App with Recent Swipes Component
// ============================================================================

import { useState } from 'react';
import { SwipeCardStack, Card, SwipeResult } from './SwipeCard';
import { RecentSwipes, SwipeStats } from './RecentSwipes';
import { RotateCcw } from 'lucide-react';

const DEMO_CARDS: Card[] = [
  {
    id: "1",
    name: "Sarah",
    age: 26,
    bio: "Love hiking and coffee ☕️",
    imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330"
  },
  {
    id: "2",
    name: "James", 
    age: 28,
    bio: "Foodie and world traveler 🌍",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d"
  },
  {
    id: "3",
    name: "Emma",
    age: 24,
    bio: "Artist and music lover 🎨",
    imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80"
  },
  {
    id: "4",
    name: "Alex",
    age: 27,
    bio: "Tech enthusiast and gamer 🎮",
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e"
  }
];

export default function CompleteSwipeApp() {
  const [cards, setCards] = useState<Card[]>(DEMO_CARDS);
  const [swipeHistory, setSwipeHistory] = useState<SwipeResult[]>([]);
  const [resetKey, setResetKey] = useState(0);

  const handleSwipe = (result: SwipeResult) => {
    setSwipeHistory((prev) => [...prev, result]);
    console.log("Swiped:", result);
    
    // Here you would save to database, update matches, etc.
  };

  const handleStackEmpty = () => {
    console.log("Stack empty!");
    // Here you would load more cards from API
  };

  const handleReset = () => {
    setCards(DEMO_CARDS);
    setSwipeHistory([]);
    setResetKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            SuperSwipe
          </h1>
          <p className="text-sm text-muted-foreground">
            The smoothest swipe experience
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </header>

      {/* Main Swipe Area */}
      <main className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div className="w-full max-w-md mx-auto">
          <div className="relative w-full aspect-[9/16] max-h-[calc(100vh-16rem)]">
            <SwipeCardStack
              key={resetKey}
              cards={cards}
              onSwipe={handleSwipe}
              onStackEmpty={handleStackEmpty}
            />
          </div>
        </div>
      </main>

      {/* Stats */}
      <SwipeStats swipeHistory={swipeHistory} />

      {/* Recent Swipes */}
      <RecentSwipes
        swipeHistory={swipeHistory}
        cards={DEMO_CARDS}
        maxVisible={5}
      />
    </div>
  );
}

// ============================================================================
// MINIMAL EXAMPLE: Just Swipe + Recent Swipes
// ============================================================================

export function MinimalSwipeApp() {
  const [swipeHistory, setSwipeHistory] = useState<SwipeResult[]>([]);

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 p-4">
        <SwipeCardStack
          cards={DEMO_CARDS}
          onSwipe={(result) => setSwipeHistory(prev => [...prev, result])}
          onStackEmpty={() => console.log("Done!")}
        />
      </div>
      
      <RecentSwipes
        swipeHistory={swipeHistory}
        cards={DEMO_CARDS}
      />
    </div>
  );
}

// ============================================================================
// ADVANCED EXAMPLE: With Database Integration
// ============================================================================

export function AdvancedSwipeApp() {
  const [cards, setCards] = useState<Card[]>([]);
  const [swipeHistory, setSwipeHistory] = useState<SwipeResult[]>([]);

  // Load cards from API
  const loadCards = async () => {
    const response = await fetch('/api/cards');
    const data = await response.json();
    setCards(data);
  };

  // Save swipe to database
  const handleSwipe = async (result: SwipeResult) => {
    // Update local state immediately
    setSwipeHistory(prev => [...prev, result]);
    
    // Save to database
    await fetch('/api/swipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    });
    
    // Check for matches if it's a like
    if (result.direction === 'right') {
      const matchResponse = await fetch(`/api/matches/${result.cardId}`);
      const match = await matchResponse.json();
      
      if (match.isMatch) {
        // Show match notification
        console.log("It's a match! 🎉");
      }
    }
  };

  // Load more cards when stack is empty
  const handleStackEmpty = async () => {
    await loadCards();
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1">
        <SwipeCardStack
          cards={cards}
          onSwipe={handleSwipe}
          onStackEmpty={handleStackEmpty}
        />
      </div>
      
      <RecentSwipes swipeHistory={swipeHistory} cards={cards} />
    </div>
  );
}
