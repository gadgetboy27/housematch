// ============================================================================
// SWIPE COMPONENT PACKAGE - Main Export File
// ============================================================================
// Import everything you need from one place!

// Main Components
export { SwipeCard, SwipeCardStack } from './SwipeCard';

// Recent Swipes Components (4 variants)
export { 
  RecentSwipes,           // Default: Full-width bar with border
  RecentSwipesCompact,    // Compact: Minimal version
  RecentSwipesList,       // List: Vertical with thumbnails
  SwipeStats              // Stats: Likes/Passes/Rate
} from './RecentSwipes';

// Types
export type { 
  Card, 
  SwipeDirection, 
  SwipeResult 
} from './SwipeCard';

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*

// Import main components:
import { SwipeCardStack, RecentSwipes } from './swipe-component-package';

// Import specific variant:
import { SwipeCardStack, RecentSwipesCompact, SwipeStats } from './swipe-component-package';

// Import types:
import { Card, SwipeResult } from './swipe-component-package';

// Use in your app:
const [history, setHistory] = useState<SwipeResult[]>([]);

<SwipeCardStack
  cards={cards}
  onSwipe={(result) => setHistory(prev => [...prev, result])}
/>

<RecentSwipes swipeHistory={history} cards={cards} />

*/
