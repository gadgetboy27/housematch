import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Building2, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Property } from "@shared/schema";

const serviceOrderFormSchema = z.object({
  propertyId: z.string().min(1, "Please select a property"),
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerEmail: z.string().email("Please enter a valid email"),
  customerPhone: z.string().min(7, "Please enter a valid phone number"),
  notes: z.string().optional(),
});

type ServiceOrderFormData = z.infer<typeof serviceOrderFormSchema>;

interface ServiceInfo {
  title: string;
  serviceType: 'building_inspection' | 'meth_testing';
  description: string;
  price: string;
  turnaround: string;
  icon: React.ReactNode;
  includes: string[];
  provider: string;
  compliance?: string[];
}

interface ServiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceInfo: ServiceInfo;
}

export function ServiceOrderModal({ isOpen, onClose, serviceInfo }: ServiceOrderModalProps) {
  const { toast } = useToast();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Get current user
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/user", {
          credentials: 'include',
        });
        if (!response.ok) return null;
        return response.json();
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user's liked properties
  const { data: likedProperties = [], isLoading: loadingProperties } = useQuery<Property[]>({
    queryKey: user?.id ? [`/api/users/${user.id}/liked-properties`] : [],
    enabled: isOpen && !!user?.id,
  });

  const form = useForm<ServiceOrderFormData>({
    resolver: zodResolver(serviceOrderFormSchema),
    defaultValues: {
      propertyId: "",
      customerName: user?.name || "",
      customerEmail: user?.email || "",
      customerPhone: "",
      notes: "",
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: ServiceOrderFormData) => {
      const property = likedProperties.find(p => p.id === data.propertyId);
      // Parse price safely: remove all currency symbols, commas, and spaces, then convert to cents
      const priceString = serviceInfo.price.replace(/[$,\s]/g, '');
      const priceCents = Math.round(parseFloat(priceString) * 100);
      
      return apiRequest('POST', '/api/service-orders', {
        serviceType: serviceInfo.serviceType,
        serviceName: serviceInfo.title,
        propertyId: data.propertyId,
        propertyAddress: property?.address || '',
        propertyFloorArea: property?.floorArea || null,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        notes: data.notes || '',
        priceCents,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-orders'] });
      toast({
        title: "Order Submitted!",
        description: `Your ${serviceInfo.title} order has been received. We'll contact you shortly to coordinate with ${serviceInfo.provider}.`,
      });
      form.reset();
      setSelectedProperty(null);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Order Failed",
        description: error.message || "Failed to submit order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ServiceOrderFormData) => {
    createOrderMutation.mutate(data);
  };

  const handlePropertyChange = (propertyId: string) => {
    const property = likedProperties.find(p => p.id === propertyId);
    setSelectedProperty(property || null);
    form.setValue('propertyId', propertyId);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setSelectedProperty(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid={`modal-${serviceInfo.serviceType}-order`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            {serviceInfo.icon}
            {serviceInfo.title}
          </DialogTitle>
          <DialogDescription>
            {serviceInfo.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Service Info Card */}
          <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Price</p>
                  <p className="text-2xl font-bold text-orange-600">{serviceInfo.price}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Turnaround</p>
                  <p className="text-xl font-semibold">{serviceInfo.turnaround}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Provider</p>
                  <p className="text-xl font-semibold">{serviceInfo.provider}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What's Included */}
          <div>
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              What's Included
            </h3>
            <Card>
              <CardContent className="p-4">
                <ul className="grid md:grid-cols-2 gap-2 text-sm text-gray-600">
                  {serviceInfo.includes.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Compliance Standards */}
          {serviceInfo.compliance && serviceInfo.compliance.length > 0 && (
            <Card className="border-l-4 border-l-blue-600">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  Compliance Standards
                </h4>
                <p className="text-sm text-gray-600">
                  {serviceInfo.compliance.join(' • ')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Order Form */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Place Your Order
            </h3>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Property Selection */}
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Property *</FormLabel>
                      <Select
                        onValueChange={handlePropertyChange}
                        value={field.value}
                        disabled={loadingProperties}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-property">
                            <SelectValue placeholder={loadingProperties ? "Loading properties..." : "Choose from your liked properties"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {likedProperties.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No liked properties found
                            </SelectItem>
                          ) : (
                            likedProperties.map((property) => (
                              <SelectItem key={property.id} value={property.id}>
                                {property.address} - {property.suburb}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select a property from your liked properties
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Property Details Display */}
                {selectedProperty && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Property Details</h4>
                      <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-700">
                        <div><strong>Address:</strong> {selectedProperty.address}</div>
                        <div><strong>Suburb:</strong> {selectedProperty.suburb}</div>
                        {selectedProperty.floorArea && (
                          <div><strong>Floor Area:</strong> {selectedProperty.floorArea}m²</div>
                        )}
                        {selectedProperty.propertyType && (
                          <div><strong>Type:</strong> {selectedProperty.propertyType}</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Contact Details */}
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} data-testid="input-customer-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="021 123 4567" {...field} data-testid="input-customer-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="john.smith@example.com" type="email" {...field} data-testid="input-customer-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special requests or additional information..."
                          className="resize-none"
                          rows={3}
                          {...field}
                          data-testid="textarea-notes"
                        />
                      </FormControl>
                      <FormDescription>
                        Let us know if you have any special requirements
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={createOrderMutation.isPending}
                    data-testid="button-cancel-order"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createOrderMutation.isPending || likedProperties.length === 0}
                    data-testid="button-submit-order"
                  >
                    {createOrderMutation.isPending ? "Submitting..." : `Submit Order - ${serviceInfo.price}`}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
