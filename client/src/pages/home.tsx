import SwipeContainer from "../components/swipe-container";
import { Property } from "@shared/schema";

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
    imageUrl: "https://picsum.photos/600/400?1",
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
    imageUrl: "https://picsum.photos/600/400?2",
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
  const handlePropertySelect = (property: Property) => {
    console.log(`Selected property: ${property.title}`);
  };

  const handleSwipe = () => {
    console.log('Property swiped');
  };

  const handleSwipeAction = (direction: "left" | "right" | "up", action: string) => {
    console.log(`Swiped ${direction} with action ${action}`);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <SwipeContainer 
        properties={mockProperties} 
        onPropertySelect={handlePropertySelect}
        onSwipe={handleSwipe}
        onSwipeAction={handleSwipeAction}
      />
    </div>
  );
}
