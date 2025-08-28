import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SwipeContainer from "@/components/swipe-container";
import ActionButtons from "@/components/action-buttons";
import BottomNavigation from "@/components/bottom-navigation";
import PropertyDetailsModal from "@/components/modals/property-details-modal";
import AIBrainPopup from "@/components/ai-brain-popup";
import { Property } from "@shared/schema";

export default function Home() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showPropertyDetails, setShowPropertyDetails] = useState(false);
  const [showAIBrain, setShowAIBrain] = useState(false);
  const [swipeCount, setSwipeCount] = useState(0);
  const [isSwipingDisabled, setIsSwipingDisabled] = useState(false);
  const swipeContainerRef = useRef<any>(null);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["/api/properties"],
    queryFn: async () => {
      const response = await fetch("/api/properties?userId=demo-user");
      return response.json();
    },
  });

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    setShowPropertyDetails(true);
  };

  const handleSwipe = () => setSwipeCount((prev) => prev + 1);

  const handleSwipeAction = () => {
    setIsSwipingDisabled(true);
    setTimeout(() => setIsSwipingDisabled(false), 600); // debouncing buttons
  };

  const handleReject = () => swipeContainerRef.current?.handleSwipe("left", "dislike");
  const handleLike = () => swipeContainerRef.current?.handleSwipe("right", "like");
  const handleSuperLike = () => swipeContainerRef.current?.handleSwipe("up", "super_like");

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="max-w-sm mx-auto h-screen relative overflow-hidden">
      <SwipeContainer
        ref={swipeContainerRef}
        properties={properties}
        onPropertySelect={handlePropertySelect}
        onSwipe={handleSwipe}
        onSwipeAction={handleSwipeAction}
      />

      <div className="fixed bottom-16 left-1/2 transform -translate-x-1/2 z-50">
        <ActionButtons
          onReject={handleReject}
          onLike={handleLike}
          onSuperLike={handleSuperLike}
          disabled={isSwipingDisabled}
          onLikeEffect={() => swipeContainerRef.current?.setHeartTrigger(true)}
        />
      </div>

      {showPropertyDetails && selectedProperty && (
        <PropertyDetailsModal
          property={selectedProperty}
          isOpen={showPropertyDetails}
          onClose={() => setShowPropertyDetails(false)}
        />
      )}

      {showAIBrain && <AIBrainPopup onClick={() => setShowAIBrain(false)} />}
      <BottomNavigation />
    </div>
  );
}
