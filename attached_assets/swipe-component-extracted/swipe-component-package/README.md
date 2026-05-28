# 🔥 Tinder-Style Swipe Component Package

**The smoothest, most polished swipe card component** - Ready to drop into any React app!

## 📦 What's Included

- `SwipeCard.tsx` - Complete swipe component (264 lines, self-contained)
- `RecentSwipes.tsx` - Swipe history component (4 variants included!)
- `COMPLETE-EXAMPLE.tsx` - Full working example with all components
- `types.ts` - TypeScript type definitions
- `optional-styles.css` - Optional styling for exact look
- `INTEGRATION-GUIDE.md` - AI Agent integration instructions

## 🚀 Quick Integration (3 Steps)

### Step 1: Install Dependencies

```bash
npm install framer-motion lucide-react
```

### Step 2: Copy Files

Copy `SwipeCard.tsx` to your components folder.

**Option A:** Use the types already in the file (they're at the top!)

**Option B:** Copy `types.ts` to your types/schema folder and update the import in `SwipeCard.tsx`:

```tsx
// Change this:
// export interface Card { ... }

// To this:
import { Card, SwipeDirection, SwipeResult } from './types';
```

### Step 3: Use It!

```tsx
import { useState } from 'react';
import { SwipeCardStack } from './components/SwipeCard';
import { RecentSwipes } from './components/RecentSwipes';

const cards = [
  {
    id: "1",
    name: "Amazing Product",
    imageUrl: "/image.jpg",
    bio: "This is awesome!"
  }
];

function App() {
  const [swipeHistory, setSwipeHistory] = useState([]);

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 p-4">
        <SwipeCardStack
          cards={cards}
          onSwipe={(result) => {
            setSwipeHistory(prev => [...prev, result]);
            // Save to database, etc.
          }}
          onStackEmpty={() => console.log("All done!")}
        />
      </div>
      
      <RecentSwipes swipeHistory={swipeHistory} cards={cards} />
    </div>
  );
}
```

## 🎨 Styling (Optional)

The component works with **any** Tailwind setup. For the exact Tinder look, add these CSS variables:

```css
/* In your index.css or global styles */
:root {
  --primary: 340 82% 52%;           /* Pink/coral */
  --primary-foreground: 0 0% 100%;  /* White text */
  --destructive: 0 84% 60%;         /* Red for NOPE */
  --card: 0 0% 100%;                /* White cards */
  --foreground: 0 0% 12%;           /* Dark text */
  --muted-foreground: 0 0% 45%;     /* Subtle text */
}

.dark {
  --card: 0 0% 10%;                 /* Dark cards */
  --foreground: 0 0% 98%;           /* Light text */
}

/* Optional: Hover/Active elevation effects */
.hover-elevate {
  transition: background-color 0.2s;
}
.hover-elevate:hover {
  background-color: rgba(0, 0, 0, 0.03);
}
.dark .hover-elevate:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.active-elevate-2:active {
  background-color: rgba(0, 0, 0, 0.08);
}
.dark .active-elevate-2:active {
  background-color: rgba(255, 255, 255, 0.1);
}
```

## ✨ Features

✅ **60fps Animations** - Hardware-accelerated transforms
✅ **Spring Physics** - Natural, smooth movement
✅ **Gesture Detection** - Swipe with touch or mouse
✅ **Velocity Tracking** - Fast flicks count as swipes
✅ **Visual Feedback** - LIKE/NOPE overlays fade in
✅ **Card Stack** - Next cards visible underneath with depth
✅ **Button Controls** - Programmatic swipes with same animations
✅ **Dark Mode** - Full theme support
✅ **TypeScript** - Fully typed
✅ **Responsive** - Works on mobile and desktop

## 🎯 Component API

### SwipeCardStack Props

| Prop | Type | Description |
|------|------|-------------|
| `cards` | `Card[]` | Array of card data to display |
| `onSwipe?` | `(result: SwipeResult) => void` | Callback when card is swiped |
| `onStackEmpty?` | `() => void` | Callback when all cards swiped |

### Card Interface

```typescript
interface Card {
  id: string;           // Unique identifier
  name: string;         // Main title
  age?: number;         // Optional age/number
  bio?: string;         // Optional description
  imageUrl: string;     // Image URL
}
```

### SwipeResult Interface

```typescript
interface SwipeResult {
  cardId: string;       // ID of swiped card
  direction: SwipeDirection; // "left" | "right" | "up" | "down"
}
```

## 🔧 Customization

### Change Swipe Threshold

In `SwipeCard.tsx`, line 60:

```tsx
const threshold = 100; // Change to 150 for harder swipes
const velocity = 500;  // Change to 800 for faster flicks required
```

### Change Colors/Text

Replace `LIKE` and `NOPE` text or colors in lines 136-148:

```tsx
// Change "LIKE" to "YES" or "MATCH"
<span className="text-6xl font-black text-green-500">
  MATCH
</span>

// Change colors from green-500 to blue-500
className="border-4 border-blue-500 px-6 py-3"
```

### Remove Buttons

Delete lines 240-260 to remove the Like/Nope buttons (swipe gestures will still work).

## 🎬 How It Works

1. **Render Stack** - Shows 3 cards at once (top + 2 preview)
2. **Drag Detection** - Framer Motion tracks finger/mouse
3. **Rotation** - Card rotates -30° to +30° during drag
4. **Threshold** - 100px or 500px/s velocity triggers swipe
5. **Exit Animation** - Card flies off screen smoothly
6. **Next Card** - Stack advances, next card scales up

## 🐛 Troubleshooting

**Cards not swiping?**
- Ensure Tailwind is configured
- Check that images load properly
- Verify cards array has data

**Animations laggy?**
- Check for console errors
- Ensure GPU acceleration is enabled
- Reduce number of visible cards (line 209)

**Types not working?**
- Update imports to match your file structure
- Ensure TypeScript is configured

## 📱 Demo Data

```tsx
const demoCards = [
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
  }
];
```

## 🎨 Recent Swipes Component Variants

This package includes **4 different variants** of the Recent Swipes component:

### 1. `RecentSwipes` (Default)
Full-width bar with padding and border at bottom of screen.

```tsx
<RecentSwipes swipeHistory={history} cards={cards} maxVisible={5} />
```

### 2. `RecentSwipesCompact`
Minimal version with no border/padding. Great for sidebars.

```tsx
<RecentSwipesCompact swipeHistory={history} cards={cards} />
```

### 3. `RecentSwipesList`
Vertical list with thumbnails. Perfect for a history page.

```tsx
<RecentSwipesList swipeHistory={history} cards={cards} maxVisible={10} />
```

### 4. `SwipeStats`
Shows statistics: Likes, Passes, and Like Rate percentage.

```tsx
<SwipeStats swipeHistory={history} />
```

**Mix and match!** Use multiple variants together for a complete UI.

## 📄 License

Free to use in any project! Built with ❤️ and Framer Motion.

---

**Need help?** The AI agent can integrate this into your app in seconds! Just paste this whole folder. 🚀
