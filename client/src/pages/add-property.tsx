import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { insertPropertySchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/bottom-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { z } from "zod";

const propertyTypeOptions = [
  { value: "residential", label: "Residential", icon: "fa-home", color: "border-blue-200 bg-blue-50 text-blue-700" },
  { value: "rental", label: "Rental", icon: "fa-key", color: "border-green-200 bg-green-50 text-green-700" },
  { value: "commercial", label: "Commercial", icon: "fa-building", color: "border-orange-200 bg-orange-50 text-orange-700" },
  { value: "lease", label: "Lease", icon: "fa-handshake", color: "border-purple-200 bg-purple-50 text-purple-700" },
];

const zoningOptions = [
  "Residential",
  "Residential Mixed Use",
  "Commercial",
  "Industrial",
  "Rural",
];

export default function AddProperty() {
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(insertPropertySchema.extend({
      floorArea: z.string().transform(val => parseInt(val) || 0),
      landArea: z.string().transform(val => parseInt(val) || 0),
      bedrooms: z.string().transform(val => parseInt(val) || 0),
      bathrooms: z.string().transform(val => parseInt(val) || 0),
      yearBuilt: z.string().transform(val => parseInt(val) || 0),
    })),
    defaultValues: {
      title: "",
      address: "",
      suburb: "",
      price: "",
      propertyType: "residential",
      bedrooms: "3",
      bathrooms: "2",
      floorArea: "120",
      landArea: "400",
      lotNumber: "",
      certificateOfTitle: "",
      zoning: "Residential",
      yearBuilt: new Date().getFullYear().toString(),
      imageUrl: "",
      description: "",
    },
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/properties", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Success",
        description: "Property added successfully!",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add property",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createPropertyMutation.mutate({
      ...data,
      propertyType: selectedPropertyType || data.propertyType,
    });
  };

  return (
    <div className="max-w-sm mx-auto min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 relative">
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-plus text-white text-sm"></i>
            </div>
            <h1 className="text-lg font-bold text-secondary">Add Property</h1>
          </div>
          <button 
            onClick={() => setLocation("/")}
            className="w-8 h-8 bg-muted rounded-full flex items-center justify-center"
            data-testid="button-close"
          >
            <i className="fas fa-times text-muted-foreground text-sm"></i>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 pb-20 space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Property Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Property Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {propertyTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedPropertyType(option.value)}
                      className={`p-3 rounded-lg border-2 font-medium text-center transition-colors ${
                        selectedPropertyType === option.value
                          ? option.color
                          : "border-border bg-white text-muted-foreground hover:border-primary/30"
                      }`}
                      data-testid={`button-property-type-${option.value}`}
                    >
                      <i className={`fas ${option.icon} mb-1 block`}></i>
                      {option.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Basic Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Modern Family Home" 
                          {...field}
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="123 Queen Street, Auckland Central" 
                          {...field}
                          data-testid="input-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="suburb"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suburb</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ponsonby" 
                          {...field}
                          data-testid="input-suburb"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="$1,250,000 or $650/week" 
                          {...field}
                          data-testid="input-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bedrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bedrooms</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-bedrooms">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map(num => (
                              <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                            ))}
                            <SelectItem value="6">5+</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bathrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bathrooms</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-bathrooms">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[1, 2, 3, 4].map(num => (
                              <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                            ))}
                            <SelectItem value="5">4+</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* NZ Property Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">NZ Property Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="lotNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Council Lot Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Lot 15 DP 456789" 
                          {...field}
                          data-testid="input-lot-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="certificateOfTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certificate of Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="CT 456789/123" 
                          {...field}
                          data-testid="input-certificate-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="floorArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Floor Area (m²)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="180" 
                            {...field}
                            data-testid="input-floor-area"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="landArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Land Area (m²)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="450" 
                            {...field}
                            data-testid="input-land-area"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="zoning"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zoning</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-zoning">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {zoningOptions.map(zone => (
                            <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yearBuilt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year Built</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="2018" 
                          {...field}
                          data-testid="input-year-built"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Additional Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Additional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/image.jpg" 
                          {...field}
                          data-testid="input-image-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Stunning modern family home..." 
                          rows={3}
                          {...field}
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button 
              type="submit" 
              className="w-full bg-primary text-primary-foreground h-12 font-semibold"
              disabled={createPropertyMutation.isPending}
              data-testid="button-submit-property"
            >
              {createPropertyMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Adding Property...
                </>
              ) : (
                "Add Property Listing"
              )}
            </Button>
          </form>
        </Form>
      </div>

      <BottomNavigation />
    </div>
  );
}
