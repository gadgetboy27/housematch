import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import SwipeContainer from "@/components/swipe-container";
import ActionButtons from "@/components/action-buttons";
import BottomNavigation from "@/components/bottom-navigation";
import AISuggestionsModal from "@/components/modals/ai-suggestions-modal";
import AIBrainPopup from "@/components/ai-brain-popup";
import { Property } from "@shared/schema";

export default function Home() {
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [showAIBrain, setShowAIBrain] = useState(false);
  const [swipeCount, setSwipeCount] = useState(0);
  const [isSwipingDisabled, setIsSwipingDisabled] = useState(false);
  const swipeRef = useRef<any>(null);
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>("all");

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["/api/properties", selectedPropertyType],
    queryFn: async () => {
      const url = selectedPropertyType === "all" 
        ? "/api/properties?userId=demo-user"
        : `/api/properties?type=${selectedPropertyType}&userId=demo-user`;
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
  const handleSuperLike = () => swipeRef.current?.handleSwipe("up", "super_like");
  const handleBack = () => swipeRef.current?.handleBack();

  const handleAIBrainClick = () => {
    setShowAIBrain(false);
    setShowAISuggestions(true);
  };

  if (isLoading) return (
    <div className="max-w-sm mx-auto min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-sm mx-auto h-screen bg-gradient-to-br from-blue-500 via-grey-500 to-grey-700 relative overflow-hidden">
      <div className="relative h-[calc(100vh-60px)] overflow-hidden">
        <SwipeContainer
          ref={swipeRef}
          properties={properties}
          onSwipe={handleSwipe}
          onSwipeAction={handleSwipeAction}
          onPropertyTypeFilter={handlePropertyTypeFilter}
        />
      </div>

      <div className="fixed bottom-[63px] left-1/2 transform -translate-x-1/2 z-50">
        <ActionButtons
          onReject={handleReject}
          onLike={handleLike}
          onSuperLike={handleSuperLike}
          onBack={handleBack}
          disabled={isSwipingDisabled}
          onLikeEffect={() => swipeRef.current?.setHeartTrigger(true)}
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white/95 via-white/60 via-white/30 to-transparent backdrop-blur-sm"></div>

      {showAIBrain && <AIBrainPopup onClick={handleAIBrainClick} />}
      <BottomNavigation />


      {showAISuggestions && <AISuggestionsModal isOpen={showAISuggestions} onClose={() => setShowAISuggestions(false)} />}
    </div>
  );
}
