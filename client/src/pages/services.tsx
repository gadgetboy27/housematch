import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ServiceProvider } from "@shared/schema";
import { Briefcase, Phone, Mail, Globe, MapPin, Star, Plus } from "lucide-react";

const serviceCategories = {
  photographer: { label: "Photography", icon: "📸", color: "bg-purple-50 border-purple-200 text-purple-800" },
  lawyer: { label: "Legal Services", icon: "⚖️", color: "bg-blue-50 border-blue-200 text-blue-800" },
  mortgage_broker: { label: "Mortgage Brokers", icon: "🏦", color: "bg-green-50 border-green-200 text-green-800" },
  banker: { label: "Banking", icon: "💰", color: "bg-yellow-50 border-yellow-200 text-yellow-800" },
  inspector: { label: "Building Inspection", icon: "🔍", color: "bg-orange-50 border-orange-200 text-orange-800" },
  surveyor: { label: "Land Surveying", icon: "📏", color: "bg-red-50 border-red-200 text-red-800" },
  other: { label: "Other Services", icon: "🛠️", color: "bg-gray-50 border-gray-200 text-gray-800" }
};

export default function Services() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);

  const { data: serviceProviders = [], isLoading } = useQuery({
    queryKey: ["/api/service-providers", selectedCategory],
    queryFn: async () => {
      const url = selectedCategory === "all" 
        ? "/api/service-providers" 
        : `/api/service-providers?category=${selectedCategory}`;
      const res = await fetch(url);
      return res.json() as Promise<ServiceProvider[]>;
    }
  });

  if (isLoading) return (
    <div className="max-w-sm mx-auto min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-sm mx-auto min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Professional Services</h1>
            <p className="text-sm text-gray-600">Find trusted experts for your property needs</p>
          </div>
          <button
            onClick={() => setShowSubmissionForm(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-purple-700 transition-colors"
            data-testid="button-add-service"
          >
            <Plus className="w-4 h-4" />
            List Service
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === "all" 
                ? "bg-purple-600 text-white" 
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
            data-testid="filter-all-services"
          >
            All Services ({serviceProviders.length})
          </button>
          {Object.entries(serviceCategories).map(([key, category]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                selectedCategory === key 
                  ? "bg-purple-600 text-white" 
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
              data-testid={`filter-${key}`}
            >
              <span>{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Service Providers List */}
      <div className="px-4 space-y-4">
        {serviceProviders.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Services Available</h3>
            <p className="text-gray-500 mb-4">Be the first to list your professional services!</p>
            <button
              onClick={() => setShowSubmissionForm(true)}
              className="bg-purple-600 text-white px-6 py-2 rounded-full font-medium hover:bg-purple-700 transition-colors"
            >
              List Your Service
            </button>
          </div>
        ) : (
          serviceProviders.map((provider) => {
            const category = serviceCategories[provider.category as keyof typeof serviceCategories] || serviceCategories.other;
            return (
              <div key={provider.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200" data-testid={`service-card-${provider.id}`}>
                <div className="flex items-start gap-3">
                  {provider.logoUrl ? (
                    <img src={provider.logoUrl} alt={provider.businessName} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${category.color}`}>
                      {category.icon}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 truncate" data-testid={`business-name-${provider.id}`}>{provider.businessName}</h3>
                        <p className="text-sm text-gray-600">{provider.contactName}</p>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${category.color}`}>
                          <span className="mr-1">{category.icon}</span>
                          {category.label}
                        </div>
                      </div>
                      {provider.featured && (
                        <div className="flex items-center text-yellow-500">
                          <Star className="w-4 h-4 fill-current" />
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">{provider.description}</p>
                    
                    {provider.priceRange && (
                      <p className="text-sm font-medium text-green-600 mt-2">{provider.priceRange}</p>
                    )}
                    
                    {provider.serviceAreas && provider.serviceAreas.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{provider.serviceAreas.join(", ")}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 mt-3">
                      {provider.email && (
                        <a
                          href={`mailto:${provider.email}`}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                          data-testid={`contact-email-${provider.id}`}
                        >
                          <Mail className="w-3 h-3" />
                          Contact
                        </a>
                      )}
                      
                      {provider.phone && (
                        <a
                          href={`tel:${provider.phone}`}
                          className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                          data-testid={`contact-phone-${provider.id}`}
                        >
                          <Phone className="w-3 h-3" />
                          Call
                        </a>
                      )}
                      
                      {provider.websiteUrl && (
                        <a
                          href={provider.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800"
                          data-testid={`website-${provider.id}`}
                        >
                          <Globe className="w-3 h-3" />
                          Website
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Submission Form Modal */}
      {showSubmissionForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">List Your Service</h2>
                <button
                  onClick={() => setShowSubmissionForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="text-sm text-gray-600 mb-6">
                <p>Submit your professional service for review. All listings are manually approved to ensure quality and legitimacy.</p>
              </div>
              
              <div className="space-y-4 text-sm text-gray-700">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">How it works:</h3>
                  <ul className="space-y-1 text-blue-700">
                    <li>1. Submit your business details</li>
                    <li>2. Our team reviews for compliance</li>
                    <li>3. Get approved and start receiving enquiries</li>
                  </ul>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Requirements:</h3>
                  <ul className="space-y-1 text-green-700">
                    <li>• Valid business license (if applicable)</li>
                    <li>• Professional insurance coverage</li>
                    <li>• Legitimate business contact details</li>
                    <li>• Clear description of services offered</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 mb-4">Ready to get started?</p>
                <button
                  onClick={() => {
                    setShowSubmissionForm(false);
                    // TODO: Navigate to actual submission form page
                    alert("Submission form will be available soon. Please contact us directly for now.");
                  }}
                  className="bg-purple-600 text-white px-6 py-3 rounded-full font-medium hover:bg-purple-700 transition-colors"
                  data-testid="button-start-submission"
                >
                  Start Submission Process
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}