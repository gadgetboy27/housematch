// ============================================================================
// EXAMPLE: How to use the Swipe Component in your app
// ============================================================================

import { useState } from 'react';
import { SwipeCardStack, Card, SwipeResult } from './SwipeCard';

// Example card data
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
  }
];

export default function SwipeApp() {
  const [cards, setCards] = useState<Card[]>(DEMO_CARDS);
  const [swipeHistory, setSwipeHistory] = useState<SwipeResult[]>([]);

  const handleSwipe = (result: SwipeResult) => {
    console.log('Swiped:', result);
    
    // Track swipe history
    setSwipeHistory(prev => [...prev, result]);
    
    // Here you would typically:
    // - Save to database
    // - Update user matches
    // - Send notifications
    // - Analytics tracking
    
    if (result.direction === "right") {
      // Handle LIKE
      console.log(`Liked ${result.cardId}!`);
    } else {
      // Handle NOPE
      console.log(`Passed on ${result.cardId}`);
    }
  };

  const handleStackEmpty = () => {
    console.log('All cards swiped!');
    
    // Here you would typically:
    // - Load more cards from API
    // - Show completion message
    // - Redirect to matches page
  };

  const handleReset = () => {
    setCards(DEMO_CARDS);
    setSwipeHistory([]);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 border-b">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1 className="text-2xl font-bold">SuperSwipe</h1>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Swipe Cards */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md h-full max-h-[700px]">
          <SwipeCardStack
            cards={cards}
            onSwipe={handleSwipe}
            onStackEmpty={handleStackEmpty}
          />
        </div>
      </main>

      {/* Swipe History */}
      {swipeHistory.length > 0 && (
        <div className="p-4 border-t">
          <div className="max-w-md mx-auto">
            <p className="text-sm text-muted-foreground mb-2">Recent swipes:</p>
            <div className="flex gap-2 flex-wrap">
              {swipeHistory.slice(-5).reverse().map((result, index) => {
                const card = DEMO_CARDS.find(c => c.id === result.cardId);
                return (
                  <div
                    key={`${result.cardId}-${index}`}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      result.direction === "right"
                        ? "bg-green-500/10 text-green-600 border border-green-500/20"
                        : "bg-red-500/10 text-red-600 border border-red-500/20"
                    }`}
                  >
                    {card?.name} - {result.direction === "right" ? "❤️" : "✕"}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ADVANCED EXAMPLES
// ============================================================================

// Example 1: Load cards from API
async function loadCardsFromAPI() {
  const response = await fetch('/api/cards');
  const data = await response.json();
  return data.cards;
}

// Example 2: Save swipe to database
async function saveSwipe(result: SwipeResult) {
  await fetch('/api/swipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result)
  });
}

// Example 3: Infinite scroll - load more cards when empty
function InfiniteSwipeApp() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMoreCards = async () => {
    setLoading(true);
    const newCards = await loadCardsFromAPI();
    setCards(prev => [...prev, ...newCards]);
    setLoading(false);
  };

  return (
    <SwipeCardStack
      cards={cards}
      onSwipe={saveSwipe}
      onStackEmpty={loadMoreCards}
    />
  );
}

// Example 4: Custom card data structure
interface ProductCard extends Card {
  price: number;
  category: string;
  inStock: boolean;
}

const productCards: ProductCard[] = [
  {
    id: "prod-1",
    name: "Amazing Gadget",
    imageUrl: "/product1.jpg",
    bio: "The best gadget you'll ever own",
    price: 99.99,
    category: "Electronics",
    inStock: true
  }
];
