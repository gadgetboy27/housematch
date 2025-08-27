import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface PropertyTypeDropdownProps {
  currentType: string;
  onTypeChange: (type: string) => void;
}

const propertyTypes = [
  { value: "all", label: "All Properties" },
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "rental", label: "Rental" },
  { value: "lease", label: "Lease" },
  { value: "farm", label: "Farm" },
  { value: "batch", label: "Batch" },
  { value: "other", label: "Other" }
];

const propertyTypeColors = {
  residential: "border-blue-500 bg-blue-50 text-blue-700",
  rental: "border-green-500 bg-green-50 text-green-700", 
  commercial: "border-orange-500 bg-orange-50 text-orange-700",
  lease: "border-purple-500 bg-purple-50 text-purple-700",
  farm: "border-yellow-500 bg-yellow-50 text-yellow-700",
  batch: "border-pink-500 bg-pink-50 text-pink-700",
  other: "border-gray-500 bg-gray-50 text-gray-700",
  all: "border-indigo-500 bg-indigo-50 text-indigo-700"
};

export default function PropertyTypeDropdown({ currentType, onTypeChange }: PropertyTypeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Fetch all properties to count by type
  const { data: allProperties = [] } = useQuery({
    queryKey: ["/api/properties", "all"],
    queryFn: async () => {
      const response = await fetch("/api/properties?userId=demo-user");
      return response.json();
    }
  });

  // Count properties by type
  const propertyCounts = allProperties.reduce((counts: Record<string, number>, property: any) => {
    const type = property.propertyType || "other";
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});

  const totalProperties = allProperties.length;
  
  const currentTypeData = propertyTypes.find(type => type.value === currentType) || propertyTypes[0];
  const typeColor = propertyTypeColors[currentType as keyof typeof propertyTypeColors] || propertyTypeColors.all;

  const handleTypeSelect = (type: string) => {
    onTypeChange(type);
    setIsOpen(false);
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      {/* Dropdown Button */}
      <button
        onClick={handleButtonClick}
        className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm bg-white/90 border ${typeColor} flex items-center gap-1 hover:bg-white/95 transition-all duration-200`}
        data-testid="button-property-type-dropdown"
      >
        <span>
          {currentTypeData.label}
          {currentType === "all" ? ` (${totalProperties})` : ` (${propertyCounts[currentType] || 0})`}
        </span>
        <ChevronDown 
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full left-0 mt-1 w-48 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-white/20 z-20 overflow-hidden">
            {propertyTypes.map((type) => {
              const isSelected = type.value === currentType;
              const itemColor = propertyTypeColors[type.value as keyof typeof propertyTypeColors] || propertyTypeColors.all;
              const count = type.value === "all" ? totalProperties : (propertyCounts[type.value] || 0);
              
              return (
                <button
                  key={type.value}
                  onClick={() => handleTypeSelect(type.value)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-white/80 transition-colors duration-150 ${
                    isSelected ? `${itemColor} font-medium` : 'text-gray-700'
                  }`}
                  data-testid={`option-property-type-${type.value}`}
                >
                  <div className="flex justify-between items-center">
                    <span>{type.label}</span>
                    <span className="text-xs text-gray-500">({count})</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}