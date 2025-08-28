import SwipeContainer from "../components/swipe-container";
import ActionButtons from "../components/action-buttons";
import { Property } from "@shared/schema";
import { useRef } from "react";

const mockProperties: Property[] = [
  {
    id: "1",
    title: "Modern Family Home",
    address: "123 Main Street",
    suburb: "Auckland",
    price: "$950,000",
    bedrooms: 4,
    bathrooms: 2,
    carSpaces: 2,
    floorArea: 180,
    landArea: 400,
    propertyType: "residential",
    imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2075&q=80",
    additionalImages: [],
    lotNumber: null,
    certificateOfTitle: null,
    zoning: null,
    yearBuilt: null,
    description: null,
    views: 0,
    likes: 0,
    saves: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    title: "City Apartment",
    address: "456 Queen Street",
    suburb: "Wellington",
    price: "$720,000",
    bedrooms: 2,
    bathrooms: 1,
    carSpaces: 1,
    floorArea: 80,
    landArea: null,
    propertyType: "residential",
    imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2053&q=80",
    additionalImages: [],
    lotNumber: null,
    certificateOfTitle: null,
    zoning: null,
    yearBuilt: null,
    description: null,
    views: 0,
    likes: 0,
    saves: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function Home() {
  const swipeRef = useRef<{ handleSwipe: (direction: "left" | "right" | "up", action: string) => void; setHeartTrigger: (val: boolean) => void }>(null);

  const handlePropertySelect = (property: Property) => {
    console.log(`Selected property: ${property.title}`);
  };

  const handleSwipe = () => {
    console.log('Property swiped');
  };

  const handleSwipeAction = (direction: "left" | "right" | "up", action: string) => {
    console.log(`Swiped ${direction} with action ${action}`);
  };

  const handleReject = () => {
    swipeRef.current?.handleSwipe("left", "dislike");
  };

  const handleLike = () => {
    swipeRef.current?.handleSwipe("right", "like");
  };

  const handleSuperLike = () => {
    swipeRef.current?.handleSwipe("up", "super_like");
  };

  const handleLikeEffect = () => {
    swipeRef.current?.setHeartTrigger(true);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 pb-24">
      {/* Swipe Container */}
      <div className="absolute inset-0 flex items-center justify-center px-3 pb-20">
        <div className="relative w-full max-w-lg h-[650px]">
          <SwipeContainer 
            ref={swipeRef}
            properties={mockProperties} 
            onPropertySelect={handlePropertySelect}
            onSwipe={handleSwipe}
            onSwipeAction={handleSwipeAction}
          />
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-30">
        <ActionButtons
          onReject={handleReject}
          onLike={handleLike}
          onSuperLike={handleSuperLike}
          onLikeEffect={handleLikeEffect}
        />
      </div>
    </div>
  );
}
