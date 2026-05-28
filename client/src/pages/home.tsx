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

  // Check if user is logged in
  const { data: user } = useQuery<{ id: string; name: string; email: string; isAdmin?: boolean } | null>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch specific property if coming from search results
  const { data: propertyFromUrl, isLoading: isPropertyLoading } = useQuery({
    queryKey: ["/api/properties", propertyIdFromUrl],
    enabled: !!propertyIdFromUrl,
  });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["/api/properties", selectedPropertyType],
    queryFn: async () => {
      const url = selectedPropertyType === "all" 
        ? "/api/properties"
        : `/api/properties?type=${selectedPropertyType}`;
      const res = await fetch(url);
      return res.json();
    }
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

        {/* Admin Button - Only show when logged in as admin */}
        {user?.isAdmin && (
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={() => setLocation('/admin')}
              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg hover:from-red-700 hover:to-red-800 hover:scale-105 transition-all duration-200 flex items-center gap-2"
              data-testid="button-header-admin"
            >
              <i className="fas fa-shield-alt"></i>
              Admin
            </button>
          </div>
        )}

        {/* OLD: <div className="relative h-[calc(100vh-60px)] overflow-hidden"> */}
        <div className="relative overflow-hidden" style={{ height: 'calc(100vh - 80px - env(safe-area-inset-bottom))' }}>
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

      {showAIBrain && (<AIBrainPopup onClick={handleAIBrainClick} /> as unknown as JSX.Element)}
      <BottomNavigation />

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
