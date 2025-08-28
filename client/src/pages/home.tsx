import SwipeContainer from "../components/swipe-container";
import ActionButtons from "../components/action-buttons";
import PropertyTypeDropdown from "../components/property-type-dropdown";
import { Property } from "@shared/schema";
import { useRef, useState, useMemo } from "react";

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
    propertyType: "rental",
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
  {
    id: "3",
    title: "Commercial Office Space",
    address: "789 Business Boulevard",
    suburb: "Auckland CBD",
    price: "$1,200,000",
    bedrooms: null,
    bathrooms: 2,
    carSpaces: 5,
    floorArea: 300,
    landArea: null,
    propertyType: "commercial",
    imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
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
    id: "4",
    title: "Retail Space for Lease",
    address: "321 High Street",
    suburb: "Wellington Central",
    price: "$4,500/month",
    bedrooms: null,
    bathrooms: 1,
    carSpaces: 2,
    floorArea: 120,
    landArea: null,
    propertyType: "lease",
    imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
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
  const [selectedPropertyType, setSelectedPropertyType] = useState("all");

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

  const handlePropertyList = () => {
    // Property type dropdown is handled by the component itself
  };

  const handlePropertyTypeChange = (type: string) => {
    setSelectedPropertyType(type);
  };

  // Filter properties based on selected type
  const filteredProperties = useMemo(() => {
    if (selectedPropertyType === "all") {
      return mockProperties;
    }
    return mockProperties.filter(property => property.propertyType === selectedPropertyType);
  }, [selectedPropertyType]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 pb-24">
      {/* Swipe Container */}
      <div className="fixed bottom-36 left-1/2 transform -translate-x-1/2 w-full max-w-lg px-3 z-20">
        <div className="relative w-full h-[580px]">
          <SwipeContainer 
            ref={swipeRef}
            properties={filteredProperties} 
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
          onPropertyList={handlePropertyList}
          onLikeEffect={handleLikeEffect}
        />
      </div>

      {/* Property Type Filter - positioned at top */}
      <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-30">
        <PropertyTypeDropdown
          currentType={selectedPropertyType}
          onTypeChange={handlePropertyTypeChange}
        />
      </div>
    </div>
  );
}
