# 🚀 AI Agent Integration Guide

**For AI Agents:** This guide helps you quickly integrate the swipe component into a new app.

## 📋 Quick Checklist

- [ ] Install: `npm install framer-motion lucide-react`
- [ ] Copy `SwipeCard.tsx` to `src/components/`
- [ ] Add types from `types.ts` to schema
- [ ] (Optional) Add styles from `optional-styles.css`
- [ ] Import and use `<SwipeCardStack />`

## 🤖 AI Agent Instructions

When the user says "add swipe component" or "make it a superswipe app":

### 1. Install Dependencies
```bash
npm install framer-motion lucide-react
```

### 2. Copy Main Component
Place `SwipeCard.tsx` in the appropriate components directory:
- React apps: `src/components/SwipeCard.tsx`
- Next.js: `components/SwipeCard.tsx`
- Other: User's preferred location

### 3. Handle Type Imports

**Option A** (Standalone): Types are already in SwipeCard.tsx - no changes needed!

**Option B** (With existing schema):
1. Copy types from `types.ts` to user's schema file
2. Update import in `SwipeCard.tsx`:
   ```tsx
   import { Card, SwipeDirection, SwipeResult } from '@/lib/schema';
   ```

### 4. Optional Styling
If user wants the exact Tinder look, copy relevant CSS variables from `optional-styles.css` to their `index.css` or `globals.css`.

### 5. Usage Pattern
```tsx
import { SwipeCardStack } from '@/components/SwipeCard';

const cards = [
  { id: "1", name: "Item", imageUrl: "/img.jpg", bio: "Description" }
];

<SwipeCardStack
  cards={cards}
  onSwipe={(result) => console.log(result)}
  onStackEmpty={() => console.log("Done!")}
/>
```

## 📁 File Mapping

| Package File | Destination | Required? |
|-------------|-------------|-----------|
| `SwipeCard.tsx` | `src/components/` | ✅ Yes |
| `types.ts` | `src/lib/schema.ts` | ⚠️ If using existing schema |
| `optional-styles.css` | `src/index.css` | ❌ Optional |
| `example-usage.tsx` | Reference only | 📚 Example |

## ⚙️ Configuration

### Tailwind (Required)
Ensure Tailwind is configured. The component uses these utilities:
- Layout: `absolute`, `relative`, `flex`, `w-full`, `h-full`
- Spacing: `p-*`, `m-*`, `gap-*`
- Colors: `bg-*`, `text-*`, `border-*`
- Effects: `rounded-*`, `shadow-*`, `opacity-*`

### Dark Mode (Optional)
If app has dark mode, component automatically adapts with:
- `dark:bg-card`
- `dark:text-foreground`
- Color variables from CSS

## 🔧 Customization Hooks

### Change Swipe Threshold
```tsx
// In SwipeCard.tsx, line ~60
const threshold = 100; // pixels
const velocity = 500;  // px/s
```

### Change Button Appearance
```tsx
// In SwipeCardStack, lines ~240-260
// Modify colors, sizes, icons
<motion.button className="...">
  <Heart className="h-8 w-8 text-green-500" />
</motion.button>
```

### Change Overlay Text
```tsx
// In SwipeCard, lines ~136-148
<span>LIKE</span>  // Change to "MATCH", "YES", etc.
<span>NOPE</span>  // Change to "PASS", "NO", etc.
```

## 🎯 Common Integration Patterns

### Pattern 1: E-commerce Product Swiper
```tsx
const products = await fetchProducts();
const cards = products.map(p => ({
  id: p.id,
  name: p.name,
  imageUrl: p.image,
  bio: `$${p.price} - ${p.description}`
}));
```

### Pattern 2: Dating/Social App
```tsx
const profiles = await fetchProfiles();
const cards = profiles.map(p => ({
  id: p.id,
  name: p.name,
  age: p.age,
  imageUrl: p.photo,
  bio: p.bio
}));
```

### Pattern 3: Recipe/Food App
```tsx
const recipes = await fetchRecipes();
const cards = recipes.map(r => ({
  id: r.id,
  name: r.title,
  imageUrl: r.thumbnail,
  bio: `${r.cookTime} min - ${r.difficulty}`
}));
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Import errors | Update path aliases in tsconfig.json |
| Styling broken | Ensure Tailwind processes the component file |
| Types not working | Copy types to schema, update import path |
| Animations laggy | Check GPU acceleration, reduce card count |
| Dark mode broken | Add CSS variables from optional-styles.css |

## ✅ Testing Checklist

After integration, verify:
- [ ] Cards render correctly
- [ ] Swipe gestures work (left/right)
- [ ] Buttons trigger swipes
- [ ] onSwipe callback fires
- [ ] onStackEmpty fires when done
- [ ] Dark mode works (if applicable)
- [ ] Mobile/touch works
- [ ] Images load properly

## 📚 Resources

- `README.md` - User documentation
- `example-usage.tsx` - Complete usage examples
- `types.ts` - Type definitions reference
- `optional-styles.css` - Styling reference

## 🎉 Done!

The component is now integrated! It's production-ready with:
- ✅ Hardware-accelerated 60fps animations
- ✅ Touch and mouse support
- ✅ TypeScript types
- ✅ Dark mode support
- ✅ Responsive design

**Next Steps:**
1. Connect to real data source
2. Implement swipe persistence (database)
3. Add analytics tracking
4. Customize appearance to match brand
