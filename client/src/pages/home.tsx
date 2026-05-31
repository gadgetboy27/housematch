import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import SwipeContainer from "@/components/swipe-container";
import ActionButtons from "@/components/action-buttons";
import BottomNavigation from "@/components/bottom-navigation";
import AISuggestionsModal from "@/components/modals/ai-suggestions-modal";
import AIBrainPopup from "@/components/ai-brain-popup";
import { AIPropertySearch } from "@/components/AIPropertySearch";
import { PropertyDetailsDialog } from "@/components/property-details-dialog";
import { HomePageSEO } from "@/components/SEO";
import { AuthModal } from "@/components/auth-modal";
import { usePageTracking, trackPropertyView, trackPropertyLike } from "@/components/Analytics";
import { MarketFeed } from "@/components/MarketFeed";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

export default function Home() {
  // Track homepage view
  usePageTracking('Property Discovery Home', {
    page_category: 'discovery',
    user_type: 'property_browser'
  });

  const { id: propertyIdFromUrl } = useParams();
  const [, setLocation] = useLocation();
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [showAIBrain, setShowAIBrain] = useState(false);
  const [showAISearch, setShowAISearch] = useState(false);
  const [swipeCount, setSwipeCount] = useState(0);
  const [isSwipingDisabled, setIsSwipingDisabled] = useState(false);
  const swipeRef = useRef<any>(null);
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>("all");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot-password'>('signup');
  const [returnToPath, setReturnToPath] = useState<string | null>(null);

  // Market search state — driven by the search Sheet, not visible on main screen
  const [showSearch, setShowSearch] = useState(false);
  const [suburbInput, setSuburbInput] = useState('');
  const [cityInput, setCityInput] = useState('Auckland');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  // Applied filters (only update when user hits Apply)
  const [marketSuburb, setMarketSuburb] = useState<string | null>(null);
  const [marketCity, setMarketCity] = useState('Auckland');

  const handleApplySearch = () => {
    setMarketSuburb(suburbInput.trim() || null);
    setMarketCity(cityInput.trim() || 'Auckland');
    setShowSearch(false);
  };

  const handleClearSearch = () => {
    setSuburbInput('');
    setCityInput('Auckland');
    setPriceMin('');
    setPriceMax('');
    setMarketSuburb(null);
    setMarketCity('Auckland');
  };

  // Check if user is logged in
  const { data: user } = useQuery<{ id: string; name: string; email: string; isAdmin?: boolean } | null>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch specific property if coming from search results
  const { data: propertyFromUrl, isLoading: isPropertyLoading } = useQuery<any>({
    queryKey: ["/api/properties", propertyIdFromUrl],
    enabled: !!propertyIdFromUrl,
  });

  const { data: propertiesUnsorted = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/properties", selectedPropertyType],
    queryFn: async () => {
      const url = selectedPropertyType === "all"
        ? "/api/properties"
        : `/api/properties?type=${selectedPropertyType}`;
      const res = await fetch(url);
      return res.json();
    }
  });

  // Sort properties alphabetically by suburb
  const properties = propertiesUnsorted.sort((a, b) => {
    const suburbA = (a.suburb || '').toLowerCase();
    const suburbB = (b.suburb || '').toLowerCase();
    return suburbA.localeCompare(suburbB);
  });

  useEffect(() => {
    if (swipeCount >= 12) setShowAIBrain(true);
  }, [swipeCount]);

  const handleSwipe = () => setSwipeCount(prev => prev + 1);


  const handleSwipeAction = (_: "left" | "right" | "up", __: string) => {
    setIsSwipingDisabled(true);
    setTimeout(() => setIsSwipingDisabled(false), 600);
  };

  const handlePropertyTypeFilter = (type: string) => setSelectedPropertyType(type);

  const handleReject = () => swipeRef.current?.handleSwipe("left", "dislike");
  const handleLike = () => swipeRef.current?.handleSwipe("right", "like");
  const handleAISearch = () => setShowAISearch(true);
  const handleBack = () => swipeRef.current?.handleBack();

  const handleOpenAuth = (mode: 'login' | 'signup' | 'forgot-password' = 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleAuthSuccess = (user: any) => {
    setShowAuthModal(false);
    
    // Redirect to return path if specified
    if (returnToPath) {
      setLocation(returnToPath);
      setReturnToPath(null); // Clear after use
    }
  };

  const handleAIBrainClick = () => {
    setShowAIBrain(false);
    setShowAISuggestions(true);
  };

  // Check URL params for login trigger
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('showLogin') === 'true' && !user) {
      // Save return path BEFORE cleaning URL
      const returnTo = params.get('returnTo');
      if (returnTo) {
        setReturnToPath(decodeURIComponent(returnTo));
      }
      
      setAuthMode('login');
      setShowAuthModal(true);
      
      // Clean URL after saving return path
      window.history.replaceState({}, '', '/');
    }
  }, [user]);

  if (isLoading) return (
    <div className="max-w-sm mx-auto min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <>
      <HomePageSEO />
      <div className="max-w-sm mx-auto h-screen bg-gradient-to-br from-blue-500 via-grey-500 to-grey-700 relative overflow-hidden">

        {/* Clean top bar: just title + admin button */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/40 to-transparent pointer-events-none">
          <div className="text-white font-bold text-lg drop-shadow-lg">HouseMatch</div>
          {user?.isAdmin && (
            <button
              onClick={() => setLocation('/admin')}
              className="pointer-events-auto bg-gradient-to-r from-red-600 to-red-700 text-white px-3 py-1.5 rounded-full font-semibold text-xs shadow-lg"
              data-testid="button-header-admin"
            >
              <i className="fas fa-shield-alt text-sm"></i>
            </button>
          )}
        </div>

        {/* Main content */}
        <div className="relative overflow-hidden" style={{ height: 'calc(100vh - 70px - env(safe-area-inset-bottom))', marginTop: '50px' }}>
          {marketSuburb || properties.length === 0 ? (
            <MarketFeed suburb={marketSuburb} city={marketCity} />
          ) : (
            <SwipeContainer
              ref={swipeRef}
              properties={properties}
              onSwipe={handleSwipe}
              onSwipeAction={handleSwipeAction}
              onPropertyTypeFilter={handlePropertyTypeFilter}
              selectedPropertyType={selectedPropertyType}
              user={user}
              onOpenAuth={handleOpenAuth}
            />
          )}
        </div>

      {/* OLD: <div className="fixed bottom-[63px] left-1/2 transform -translate-x-1/2 z-50"> */}
      <div className="fixed left-1/2 transform -translate-x-1/2 z-50" style={{ bottom: 'calc(64px + env(safe-area-inset-bottom) + 8px)' }}>
        <ActionButtons
          onReject={handleReject}
          onLike={handleLike}
          onAISearch={handleAISearch}
          onBack={handleBack}
          disabled={isSwipingDisabled}
          onLikeEffect={() => swipeRef.current?.setHeartTrigger(true)}
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white/95 via-white/60 via-white/30 to-transparent pointer-events-none"></div>

      {showAIBrain && <AIBrainPopup onClick={handleAIBrainClick} />}
      <BottomNavigation onSearchClick={() => setShowSearch(true)} />

      {/* AI Search Drawer */}
      <AIPropertySearch open={showAISearch} onOpenChange={setShowAISearch} />

      {/* Property Details from URL (search results or after payment) */}
      {propertyFromUrl && !isPropertyLoading && (
        <PropertyDetailsDialog
          property={propertyFromUrl}
          open={true}
          onOpenChange={(open) => {
            if (!open) setLocation("/");
          }}
          isLoggedIn={!!user}
        />
      )}

      {showAISuggestions && <AISuggestionsModal isOpen={showAISuggestions} onClose={() => setShowAISuggestions(false)} />}

      {/* Market search Sheet — opens from magnify icon, no bar visible on main screen */}
      <Sheet open={showSearch} onOpenChange={setShowSearch}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-h-[90vh] flex flex-col" style={{ paddingBottom: 'max(2rem, env(keyboard-inset-bottom))' }}>
          <SheetHeader className="mb-4 flex-shrink-0">
            <SheetTitle>Search Properties</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto flex-1 pr-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Suburb</label>
              <Input
                value={suburbInput}
                onChange={e => setSuburbInput(e.target.value)}
                placeholder="e.g. Ponsonby, Grey Lynn, Remuera…"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">City</label>
              <select
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga', 'Dunedin', 'Palmerston North'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Min price</label>
                <Input
                  value={priceMin}
                  onChange={e => setPriceMin(e.target.value)}
                  placeholder="$400,000"
                  type="text"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Max price</label>
                <Input
                  value={priceMax}
                  onChange={e => setPriceMax(e.target.value)}
                  placeholder="$1,200,000"
                  type="text"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4 pb-4 border-t border-gray-200 dark:border-gray-700 mt-2 -mx-4 px-4 flex-shrink-0">
              <Button variant="outline" className="flex-1" onClick={handleClearSearch}>Clear</Button>
              <Button className="flex-1" onClick={handleApplySearch}>Apply</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          mode={authMode}
          onToggleMode={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
          onForgotPassword={() => setAuthMode('forgot-password')}
        />
      )}
      </div>
    </>
  );
}

// Export the auth trigger for use by other components
export const useAuthTrigger = () => {
  const [, setLocation] = useLocation();
  const [currentLocation] = useLocation();
  return () => {
    const returnPath = encodeURIComponent(currentLocation);
    setLocation(`/?showLogin=true&returnTo=${returnPath}`);
  };
};
