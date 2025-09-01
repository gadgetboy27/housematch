import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BottomNavigation from "@/components/bottom-navigation";
import type { Property } from "@shared/schema";

export default function EditProperty() {
  const [, params] = useRoute("/edit-property/:id");
  const propertyId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is authenticated
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/auth/user");
        return response.json();
      } catch (error) {
        return null;
      }
    },
    retry: false,
  });

  // Fetch property data
  const { data: property, isLoading } = useQuery({
    queryKey: ["/api/properties", propertyId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/properties/${propertyId}`);
      return response.json();
    },
    enabled: !!propertyId,
  });

  const [formData, setFormData] = useState({
    title: "",
    address: "",
    suburb: "",
    price: "",
    description: "",
    propertyType: "",
    lotNumber: "",
    certificateOfTitle: "",
    zoning: "",
    yearBuilt: new Date().getFullYear(),
    bedrooms: 0,
    bathrooms: 0,
    floorArea: 0,
    landArea: 0,
    carSpaces: 0,
    imageUrl: "",
    hideCertificateOfTitle: false,
    isLinzValidated: false,
    selfDeclaration: true,
  });

  // Populate form when property loads
  useEffect(() => {
    if (property) {
      setFormData({
        title: property.title || "",
        address: property.address || "",
        suburb: property.suburb || "",
        price: property.price || "",
        description: property.description || "",
        propertyType: property.propertyType || "",
        lotNumber: property.lotNumber || "",
        certificateOfTitle: property.certificateOfTitle || "",
        zoning: property.zoning || "",
        yearBuilt: property.yearBuilt || new Date().getFullYear(),
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        floorArea: property.floorArea || 0,
        landArea: property.landArea || 0,
        carSpaces: property.carSpaces || 0,
        imageUrl: property.imageUrl || "",
        hideCertificateOfTitle: property.hideCertificateOfTitle || false,
        isLinzValidated: property.isLinzValidated || false,
        selfDeclaration: true,
      });
    }
  }, [property]);

  // Update property mutation
  const updatePropertyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/properties/${propertyId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Property Updated",
        description: "Your property has been updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/properties`] });
      // Navigate back to profile
      window.location.href = "/profile";
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update property",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePropertyMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-sm mx-auto pt-20 text-center">
          <h2 className="text-xl font-semibold mb-4">Login Required</h2>
          <p className="text-gray-600 mb-6">You need to be logged in to edit properties.</p>
          <Button onClick={() => window.location.href = "/profile"}>Go to Login</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Loading property...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-sm mx-auto pt-20 text-center">
          <h2 className="text-xl font-semibold mb-4">Property Not Found</h2>
          <p className="text-gray-600 mb-6">This property doesn't exist or you don't have permission to edit it.</p>
          <Button onClick={() => window.location.href = "/profile"}>Back to Profile</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-sm mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = "/profile"}
            className="text-purple-600"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back
          </Button>
          <h1 className="text-lg font-semibold">Edit Property</h1>
          <div className="w-16"></div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Property Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Enter property title"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Address</label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Property address"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Suburb</label>
                <Input
                  value={formData.suburb}
                  onChange={(e) => handleInputChange("suburb", e.target.value)}
                  placeholder="Suburb"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Price</label>
                <Input
                  value={formData.price}
                  onChange={(e) => handleInputChange("price", e.target.value)}
                  placeholder="$500,000"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Property Type *</label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => handleInputChange("propertyType", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Select property type</option>
                  <option value="residential">Residential</option>
                  <option value="rental">Rental</option>
                  <option value="commercial">Commercial</option>
                  <option value="lease">Lease</option>
                  <option value="batch">Batch/Section</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Council Lot Number *</label>
                <Input
                  value={formData.lotNumber}
                  onChange={(e) => handleInputChange("lotNumber", e.target.value)}
                  placeholder="PT 123 DP 4567"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Certificate of Title *</label>
                <Input
                  value={formData.certificateOfTitle}
                  onChange={(e) => handleInputChange("certificateOfTitle", e.target.value)}
                  placeholder="CT 12345/678"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Zoning</label>
                <Input
                  value={formData.zoning}
                  onChange={(e) => handleInputChange("zoning", e.target.value)}
                  placeholder="Residential Mixed Use"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Year Built</label>
                <Input
                  type="number"
                  value={formData.yearBuilt}
                  onChange={(e) => handleInputChange("yearBuilt", parseInt(e.target.value) || new Date().getFullYear())}
                  min="1800"
                  max={new Date().getFullYear() + 5}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Bedrooms</label>
                  <select
                    value={formData.bedrooms}
                    onChange={(e) => handleInputChange("bedrooms", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="0">0 (Land/Commercial)</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6+</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Bathrooms</label>
                  <select
                    value={formData.bathrooms}
                    onChange={(e) => handleInputChange("bathrooms", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="0">0 (Land/Commercial)</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5+</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Floor Area (m²)</label>
                  <Input
                    type="number"
                    value={formData.floorArea}
                    onChange={(e) => handleInputChange("floorArea", parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Land Area (m²)</label>
                  <Input
                    type="number"
                    value={formData.landArea}
                    onChange={(e) => handleInputChange("landArea", parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Car Spaces</label>
                <select
                  value={formData.carSpaces}
                  onChange={(e) => handleInputChange("carSpaces", parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="0">0 (No Parking)</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6+</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Property description..."
                  rows={4}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={updatePropertyMutation.isPending}
                data-testid="button-save-property"
              >
                {updatePropertyMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
}