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
        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-all duration-300 
                   backdrop-blur-md bg-white/35 border border-white/20 shadow-lg
                   hover:bg-white/45 hover:shadow-xl hover:border-white/30 hover:scale-105
                   active:scale-95 active:bg-white/25
                   before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-r before:from-white/10 before:to-transparent before:pointer-events-none
                   relative overflow-hidden`}
        data-testid="button-property-type-dropdown"
        style={{
          boxShadow: '0 8px 32px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        }}
      >
        <span className="text-white font-semibold drop-shadow-sm">
          {currentTypeData.label}
          {currentType === "all" ? ` (${totalProperties})` : ` (${propertyCounts[currentType] || 0})`}
        </span>
        <ChevronDown 
          className={`w-3 h-3 transition-transform duration-200 text-white drop-shadow-sm ${isOpen ? 'rotate-180' : ''}`} 
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
          <div className="absolute top-full left-0 mt-1 w-48 backdrop-blur-md bg-white/35 rounded-lg shadow-xl border border-white/20 z-20 overflow-hidden"
               style={{
                 boxShadow: '0 16px 64px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
               }}>
            {propertyTypes.map((type) => {
              const isSelected = type.value === currentType;
              const itemColor = propertyTypeColors[type.value as keyof typeof propertyTypeColors] || propertyTypeColors.all;
              const count = type.value === "all" ? totalProperties : (propertyCounts[type.value] || 0);
              
              return (
                <button
                  key={type.value}
                  onClick={() => handleTypeSelect(type.value)}
                  className={`w-full px-4 py-2 text-left text-sm transition-all duration-150 
                             hover:bg-white/25 hover:backdrop-blur-lg
                             ${isSelected ? 'bg-white/20 font-semibold text-white' : 'text-white/90'}
                             border-b border-white/10 last:border-b-0`}
                  data-testid={`option-property-type-${type.value}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="drop-shadow-sm">{type.label}</span>
                    <span className="text-xs text-white/60 drop-shadow-sm">({count})</span>
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