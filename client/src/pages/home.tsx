import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import SwipeContainer from "@/components/swipe-container";
import BottomNavigation from "@/components/bottom-navigation";
import PropertyDetailsModal from "@/components/modals/property-details-modal";
import AISuggestionsModal from "@/components/modals/ai-suggestions-modal";
import AIBrainPopup from "@/components/ai-brain-popup";
import { Property } from "@shared/schema";

export default function Home() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showPropertyDetails, setShowPropertyDetails] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [showAIBrain, setShowAIBrain] = useState(false);
  const [swipeCount, setSwipeCount] = useState(0);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["/api/properties"],
  });

  useEffect(() => {
    if (swipeCount >= 12) {
      setShowAIBrain(true);
    }
  }, [swipeCount]);

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    setShowPropertyDetails(true);
  };

  const handleSwipe = () => {
    setSwipeCount(prev => prev + 1);
  };

  const handleAIBrainClick = () => {
    setShowAIBrain(false);
    setShowAISuggestions(true);
  };

  if (isLoading) {
    return (
      <div className="max-w-sm mx-auto min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-purple-700 relative overflow-hidden">
      {/* Header */}
      <header className="relative z-50 bg-white/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-home text-white text-sm"></i>
            </div>
            <h1 className="text-lg font-bold text-secondary">PropertySwipe</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              className="w-8 h-8 bg-muted rounded-full flex items-center justify-center"
              data-testid="button-notifications"
            >
              <i className="fas fa-bell text-muted-foreground text-sm"></i>
            </button>
            <button 
              className="w-8 h-8 bg-muted rounded-full flex items-center justify-center"
              data-testid="button-profile"
            >
              <i className="fas fa-user text-muted-foreground text-sm"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Main Swiping Area */}
      <div className="relative h-[calc(100vh-140px)] overflow-hidden">
        <SwipeContainer 
          properties={properties}
          onPropertySelect={handlePropertySelect}
          onSwipe={handleSwipe}
        />
      </div>

      {/* AI Brain Popup */}
      {showAIBrain && (
        <AIBrainPopup onClick={handleAIBrainClick} />
      )}

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Modals */}
      {showPropertyDetails && selectedProperty && (
        <PropertyDetailsModal
          property={selectedProperty}
          isOpen={showPropertyDetails}
          onClose={() => setShowPropertyDetails(false)}
        />
      )}

      {showAISuggestions && (
        <AISuggestionsModal
          isOpen={showAISuggestions}
          onClose={() => setShowAISuggestions(false)}
        />
      )}
    </div>
  );
}
