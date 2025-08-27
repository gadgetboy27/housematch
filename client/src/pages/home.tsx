import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import SwipeContainer from "@/components/swipe-container";
import ActionButtons from "@/components/action-buttons";
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
  const [isSwipingDisabled, setIsSwipingDisabled] = useState(false);
  const swipeContainerRef = useRef<any>(null);

  const [selectedPropertyType, setSelectedPropertyType] = useState<string>("all");
  
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["/api/properties", selectedPropertyType],
    queryFn: async () => {
      const url = selectedPropertyType === "all" 
        ? "/api/properties?userId=demo-user"
        : `/api/properties?type=${selectedPropertyType}&userId=demo-user`;
      const response = await fetch(url);
      return response.json();
    }
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

  const handleSwipeAction = (direction: "left" | "right" | "up", action: string) => {
    // This can be used for additional logic when buttons are pressed
    setIsSwipingDisabled(true);
    setTimeout(() => {
      setIsSwipingDisabled(false);
    }, 600);
  };

  const handlePropertyTypeFilter = (type: string) => {
    setSelectedPropertyType(type);
  };

  const handleReject = () => {
    if (swipeContainerRef.current?.handleSwipe) {
      swipeContainerRef.current.handleSwipe("left", "dislike");
    }
  };

  const handleLike = () => {
    if (swipeContainerRef.current?.handleSwipe) {
      swipeContainerRef.current.handleSwipe("right", "like");
    }
  };

  const handleSuperLike = () => {
    if (swipeContainerRef.current?.handleSwipe) {
      swipeContainerRef.current.handleSwipe("up", "super_like");
    }
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
    <div className="max-w-sm mx-auto h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-purple-700 relative overflow-hidden">
      {/* Main Swiping Area - Full height */}
      <div className="relative h-full overflow-hidden">
        <SwipeContainer 
          ref={swipeContainerRef}
          properties={properties}
          onPropertySelect={handlePropertySelect}
          onSwipe={handleSwipe}
          onSwipeAction={handleSwipeAction}
        />
      </div>
      
      {/* Floating Action Buttons - Independent and Overlapping Both Areas */}
      <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50">
        <ActionButtons
          onReject={handleReject}
          onLike={handleLike}
          onSuperLike={handleSuperLike}
          disabled={isSwipingDisabled}
        />
      </div>

      {/* Smooth Gradient Transition for Better Blending */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white/95 via-white/60 via-white/30 to-transparent backdrop-blur-sm"></div>

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
