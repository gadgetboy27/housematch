import { motion, AnimatePresence } from "framer-motion";
import { Property } from "@shared/schema";
import { MapPin, Bed, Bath, Car, Ruler, X } from "lucide-react";

interface PropertyDropdownProps {
  properties: Property[];
  isOpen: boolean;
  onClose: () => void;
  onPropertySelect: (property: Property) => void;
}

export default function PropertyDropdown({ properties, isOpen, onClose, onPropertySelect }: PropertyDropdownProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Dropdown */}
          <motion.div
            className="fixed inset-x-4 top-16 bottom-32 bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 z-50 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <h2 className="text-2xl font-bold text-gray-900">Properties</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                data-testid="button-close-dropdown"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Property List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {properties.map((property, index) => (
                <motion.div
                  key={property.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/30 cursor-pointer hover:bg-white/90 transition-all"
                  onClick={() => {
                    onPropertySelect(property);
                    onClose();
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  data-testid={`property-item-${property.id}`}
                >
                  <div className="flex space-x-4">
                    {/* Property Image */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                      <img
                        src={property.imageUrl || "https://picsum.photos/600/400"}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Property Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{property.title}</h3>
                      
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <MapPin className="w-3 h-3 mr-1" />
                        {property.suburb}
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-gray-500 mt-2">
                        <span className="flex items-center">
                          <Bed className="w-3 h-3 mr-1" /> {property.bedrooms}
                        </span>
                        <span className="flex items-center">
                          <Bath className="w-3 h-3 mr-1" /> {property.bathrooms}
                        </span>
                        <span className="flex items-center">
                          <Car className="w-3 h-3 mr-1" /> {property.carSpaces || 0}
                        </span>
                        <span className="flex items-center">
                          <Ruler className="w-3 h-3 mr-1" /> {property.floorArea || 0}m²
                        </span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex-shrink-0">
                      <div className="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                        {property.price}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {properties.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No properties available</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}