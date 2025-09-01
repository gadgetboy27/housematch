import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { insertPropertySchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/bottom-navigation";
import { Badge } from "@/components/ui/badge";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ObjectUploader } from "@/components/ObjectUploader";
import { AuthModal } from "@/components/auth-modal";
import type { UploadResult } from "@uppy/core";
import { z } from "zod";

const propertyTypeOptions = [
  { value: "residential", label: "Residential", icon: "fa-home", color: "border-blue-200 bg-blue-50 text-blue-700" },
  { value: "rental", label: "Rental", icon: "fa-key", color: "border-green-200 bg-green-50 text-green-700" },
  { value: "commercial", label: "Commercial", icon: "fa-building", color: "border-orange-200 bg-orange-50 text-orange-700" },
  { value: "lease", label: "Lease", icon: "fa-handshake", color: "border-purple-200 bg-purple-50 text-purple-700" },
  { value: "farm", label: "Farm", icon: "fa-tractor", color: "border-yellow-200 bg-yellow-50 text-yellow-700" },
  { value: "batch", label: "Batch", icon: "fa-mountain", color: "border-pink-200 bg-pink-50 text-pink-700" },
  { value: "land", label: "Land", icon: "fa-globe", color: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "apartment", label: "Apartment", icon: "fa-building-columns", color: "border-cyan-200 bg-cyan-50 text-cyan-700" },
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
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [validationStatus, setValidationStatus] = useState<{
    isValidating: boolean;
    isValid: boolean;
    message: string;
    details?: any;
  }>({ isValidating: false, isValid: false, message: '' });
  
  const [fieldValidation, setFieldValidation] = useState({
    lotNumber: { verified: false, loading: false, message: "" },
    address: { verified: false, loading: false, message: "" },
    certificateOfTitle: { verified: false, loading: false, message: "" }
  });

  // Authentication state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null);
  
  const [, setLocation] = useLocation();
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
        return null; // User not authenticated
      }
    },
    retry: false,
  });

  // Update current user when query data changes
  useEffect(() => {
    if (user && !currentUser) {
      setCurrentUser(user);
    }
  }, [user, currentUser]);

  // Create form schema that accepts strings and transforms to correct types
  const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    address: z.string().min(1, "Address is required"),
    suburb: z.string().min(1, "Suburb is required"),
    price: z.string().optional(), // Optional now
    propertyType: z.string().min(1, "Property type is required"),
    bedrooms: z.string().transform(val => parseInt(val) || 0).optional(),
    bathrooms: z.string().transform(val => parseInt(val) || 0).optional(),
    floorArea: z.string().transform(val => parseInt(val) || 0).optional(),
    landArea: z.string().transform(val => parseInt(val) || 0).optional(),
    carSpaces: z.string().transform(val => parseInt(val) || 0).optional(),
    parkingType: z.string().optional(), // New parking dropdown
    lotNumber: z.string().min(1, "Council Lot Number is required for security verification"),
    certificateOfTitle: z.string().min(1, "Certificate of Title is required for security verification"),
    hideCertificateOfTitle: z.boolean().default(false),
    zoning: z.string().optional(),
    yearBuilt: z.string().transform(val => parseInt(val) || new Date().getFullYear()).optional(),
    imageUrl: z.string().min(1, "At least one image is required"), // Images now required
    description: z.string().optional(),
    isLinzValidated: z.boolean().default(false),
    selfDeclaration: z.boolean().refine((val) => val === true, {
      message: "You must confirm the accuracy of the property details",
    }),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      address: "",
      suburb: "",
      price: "",
      propertyType: "", // Start empty to force selection
      bedrooms: "3",
      bathrooms: "2",
      floorArea: "120",
      landArea: "400",
      carSpaces: "1",
      parkingType: "", // New parking field
      lotNumber: "",
      certificateOfTitle: "",
      hideCertificateOfTitle: false,
      zoning: "Residential",
      yearBuilt: new Date().getFullYear().toString(),
      imageUrl: "",
      description: "",
      isLinzValidated: false,
      selfDeclaration: false,
    },
  });

  // Sync selectedPropertyType with form
  useEffect(() => {
    if (selectedPropertyType) {
      form.setValue("propertyType", selectedPropertyType);
    }
  }, [selectedPropertyType, form]);

  // Sync uploadedImages with form
  useEffect(() => {
    if (uploadedImages.length > 0) {
      form.setValue("imageUrl", uploadedImages[0]);
    }
  }, [uploadedImages, form]);

  // Check if all required fields are filled
  const watchedFields = form.watch();
  const isFormComplete = useMemo(() => {
    const requiredFields = ['title', 'address', 'suburb', 'propertyType', 'lotNumber', 'certificateOfTitle'];
    const hasRequiredFields = requiredFields.every(field => {
      const fieldValue = (watchedFields as any)[field];
      return fieldValue && fieldValue.toString().trim() !== '';
    });
    const hasImages = uploadedImages.length > 0;
    const hasDeclaration = watchedFields.selfDeclaration === true;
    
    return hasRequiredFields && hasImages && hasDeclaration;
  }, [watchedFields, uploadedImages]);

  // Helper function to get required field status
  const getRequiredFieldStatus = (fieldName: string, value: any) => {
    const requiredFields = ['title', 'address', 'suburb', 'propertyType', 'lotNumber', 'certificateOfTitle'];
    const isRequired = requiredFields.includes(fieldName);
    const isEmpty = !value || value.toString().trim() === '';
    return {
      isRequired,
      hasError: isRequired && isEmpty,
    };
  };

  const createPropertyMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("🔍 MUTATION STARTED - sending to API");
      console.log("🔍 API data payload:", data);
      // Use real authentication - no more demo headers
      const response = await apiRequest("POST", "/api/properties", data);
      console.log("🔍 API response status:", response.status);
      const result = await response.json();
      console.log("🔍 API response data:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("🔍 MUTATION SUCCESS:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Success",
        description: "Property added successfully!",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      console.log("🔍 MUTATION ERROR:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add property",
        variant: "destructive",
      });
    },
  });

  // Individual field validation functions
  const validateLotNumber = async (lotNumber: string) => {
    if (!lotNumber.trim()) {
      setFieldValidation(prev => ({
        ...prev,
        lotNumber: { verified: false, loading: false, message: "" }
      }));
      return;
    }

    setFieldValidation(prev => ({
      ...prev,
      lotNumber: { verified: false, loading: true, message: "Validating..." }
    }));

    try {
      const response = await fetch('/api/validate-lot-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotNumber })
      });
      const result = await response.json();
      
      setFieldValidation(prev => ({
        ...prev,
        lotNumber: { 
          verified: result.valid, 
          loading: false, 
          message: result.message || (result.valid ? "Verified" : "Not found") 
        }
      }));
    } catch (error) {
      setFieldValidation(prev => ({
        ...prev,
        lotNumber: { verified: false, loading: false, message: "Validation failed" }
      }));
    }
  };

  const validateAddress = async (address: string, suburb: string) => {
    if (!address.trim()) {
      setFieldValidation(prev => ({
        ...prev,
        address: { verified: false, loading: false, message: "" }
      }));
      return;
    }

    setFieldValidation(prev => ({
      ...prev,
      address: { verified: false, loading: true, message: "Validating..." }
    }));

    try {
      const response = await fetch('/api/validate-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, suburb })
      });
      const result = await response.json();
      
      setFieldValidation(prev => ({
        ...prev,
        address: { 
          verified: result.valid, 
          loading: false, 
          message: result.message || (result.valid ? "Valid NZ address" : "Invalid format") 
        }
      }));
    } catch (error) {
      setFieldValidation(prev => ({
        ...prev,
        address: { verified: false, loading: false, message: "Validation failed" }
      }));
    }
  };

  const validateCertificate = async (certificate: string) => {
    if (!certificate.trim()) {
      setFieldValidation(prev => ({
        ...prev,
        certificateOfTitle: { verified: false, loading: false, message: "" }
      }));
      return;
    }

    setFieldValidation(prev => ({
      ...prev,
      certificateOfTitle: { verified: false, loading: true, message: "Validating..." }
    }));

    try {
      const response = await fetch('/api/validate-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificate })
      });
      const result = await response.json();
      
      setFieldValidation(prev => ({
        ...prev,
        certificateOfTitle: { 
          verified: result.valid, 
          loading: false, 
          message: result.message || (result.valid ? "Certificate found" : "Not found") 
        }
      }));
    } catch (error) {
      setFieldValidation(prev => ({
        ...prev,
        certificateOfTitle: { verified: false, loading: false, message: "Validation failed" }
      }));
    }
  };


  const onSubmit = (data: any) => {
    console.log("🔍 FORM SUBMISSION STARTED");
    console.log("🔍 Raw form data:", data);
    console.log("🔍 Selected property type:", selectedPropertyType);
    console.log("🔍 Uploaded images:", uploadedImages);
    console.log("🔍 Validation status:", validationStatus);
    
    // Check if user is authenticated
    if (!currentUser && !user) {
      console.log("🔐 User not authenticated, showing auth modal");
      setPendingSubmitData(data);
      setAuthMode('signup'); // Default to signup for new property creators
      setShowAuthModal(true);
      return;
    }
    console.log("🔍 Form complete status:", isFormComplete);
    console.log("🔍 Form errors:", form.formState.errors);

    // Transform data to match backend schema
    const propertyData = {
      ...data,
      propertyType: selectedPropertyType || data.propertyType,
      imageUrl: uploadedImages.length > 0 ? uploadedImages[0] : data.imageUrl,
      additionalImages: uploadedImages.slice(1), // Store additional images
      // Store validation status and self-declaration
      isLinzValidated: validationStatus.isValid,
      selfDeclaration: data.selfDeclaration,
      // Ensure numeric fields are actually numbers
      bedrooms: parseInt(data.bedrooms) || 0,
      bathrooms: parseInt(data.bathrooms) || 0,
      floorArea: parseInt(data.floorArea) || 0,
      landArea: parseInt(data.landArea) || 0,
      carSpaces: parseInt(data.carSpaces) || 0,
      yearBuilt: parseInt(data.yearBuilt) || new Date().getFullYear(),
      hideCertificateOfTitle: data.hideCertificateOfTitle,
      // Remove parkingType as it's not in schema
      parkingType: undefined,
    };

    console.log("🔍 Transformed property data:", propertyData);
    console.log("🔍 About to call mutation...");
    createPropertyMutation.mutate(propertyData);
  };

  // Handle successful authentication
  const handleAuthSuccess = (user: { id: string; name: string; email: string }) => {
    setCurrentUser(user);
    queryClient.setQueryData(["/api/auth/user"], user);
    
    toast({
      title: "Welcome!",
      description: `Logged in as ${user.name}. Your property will be submitted now.`,
    });

    // If there's pending submit data, submit it now
    if (pendingSubmitData) {
      // Re-run the form validation with the pending data
      setTimeout(() => {
        onSubmit(pendingSubmitData);
        setPendingSubmitData(null);
      }, 100);
    }
  };

  const handleAuthModalClose = () => {
    setShowAuthModal(false);
    setPendingSubmitData(null);
  };

  const toggleAuthMode = () => {
    setAuthMode(prev => prev === 'login' ? 'signup' : 'login');
  };

  // Handle getting upload URL from backend
  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest("POST", "/api/objects/upload", {});
      const data = await response.json();
      return {
        method: "PUT" as const,
        url: data.uploadURL,
      };
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get upload URL",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Handle upload completion
  const handleUploadComplete = async (uploadedUrls: string[]) => {
    // Check for validation errors
    if (uploadedUrls.length === 0 && uploadedImages.length >= 4) {
      toast({
        title: "Photo Limit Reached",
        description: "You can only upload 4 photos maximum. Upgrade to Premium for more photos.",
        variant: "destructive",
      });
      return;
    }
    
    if (uploadedUrls.length === 0) {
      toast({
        title: "Upload Error",
        description: "Files are too large (max 10MB each) or invalid format. Please try smaller image files.",
        variant: "destructive",
      });
      return;
    }

    if (uploadedUrls.length > 0) {
      const newImagePaths: string[] = [];
      
      // Process all uploaded files
      for (const imageURL of uploadedUrls) {
        try {
          // Normalize the path on the backend
          const response = await apiRequest("PUT", "/api/property-images", { imageURL });
          const data = await response.json();
          newImagePaths.push(data.objectPath);
        } catch (error) {
          console.error("Failed to process uploaded image:", error);
        }
      }
      
      if (newImagePaths.length > 0) {
        setUploadedImages(prev => [...prev, ...newImagePaths]);
        toast({
          title: "Success",
          description: `${newImagePaths.length} image${newImagePaths.length > 1 ? 's' : ''} uploaded successfully!`,
        });
      } else {
        toast({
          title: "Error", 
          description: "Failed to process uploaded images",
          variant: "destructive",
        });
      }
    }
  };

  // Handle upload progress
  const handleUploadProgress = (files: any[]) => {
    console.log(`Upload progress: ${files.length} files processed`);
  };

  // Price formatting function
  const formatPrice = (value: string): string => {
    // Remove all non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, '');
    
    // If empty, return empty
    if (!numericValue) return '';
    
    // Convert to number and format with commas
    const number = parseFloat(numericValue);
    if (isNaN(number)) return value;
    
    // Format with commas and add dollar sign
    const formatted = number.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    return formatted;
  };

  // Handle price input change with formatting
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
    const inputValue = e.target.value;
    
    // If user is typing special text like "Tender", "POA", etc., allow it
    if (/^[a-zA-Z\s\/]+$/.test(inputValue)) {
      onChange(inputValue);
      return;
    }
    
    // If contains numbers, format it
    if (/\d/.test(inputValue)) {
      const formatted = formatPrice(inputValue);
      onChange(formatted);
      return;
    }
    
    // Otherwise allow the input as-is
    onChange(inputValue);
  };

  // LINZ Validation Functions
  const validateWithLinz = async (lotNumber: string, address: string, suburb: string) => {
    if (!lotNumber.trim() || !address.trim()) {
      setValidationStatus({ isValidating: false, isValid: false, message: '' });
      return;
    }

    setValidationStatus({ isValidating: true, isValid: false, message: 'Validating with LINZ records...' });
    
    try {
      const response = await apiRequest('POST', '/api/validate-property', {
        lotNumber: lotNumber.trim(),
        address: address.trim(), 
        suburb: suburb.trim()
      });
      const result = await response.json();
      
      setValidationStatus({
        isValidating: false,
        isValid: result.valid,
        message: result.message,
        details: result.details
      });
      
      // Update form validation status
      form.setValue('isLinzValidated', result.valid);
      
    } catch (error) {
      console.error('LINZ validation error:', error);
      setValidationStatus({
        isValidating: false,
        isValid: false,
        message: 'Validation service temporarily unavailable',
      });
    }
  };
  
  // Watch for changes in lot number, address, and suburb
  const watchedLotNumber = form.watch('lotNumber');
  const watchedAddress = form.watch('address');
  const watchedSuburb = form.watch('suburb');
  
  // Debounce validation when key fields change
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (watchedLotNumber && watchedAddress && watchedSuburb) {
        validateWithLinz(watchedLotNumber, watchedAddress, watchedSuburb);
      }
    }, 1000); // 1 second debounce
    
    return () => clearTimeout(timer);
  }, [watchedLotNumber, watchedAddress, watchedSuburb]);

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
            <Card className={form.formState.errors.propertyType ? 'border-red-500 border-2' : ''}>
              <CardHeader>
                <CardTitle className={`text-base ${form.formState.errors.propertyType ? 'text-red-600' : ''}`}>
                  Property Type
                  {form.formState.errors.propertyType && <span className="text-red-500 ml-1">*</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {form.formState.errors.propertyType && (
                  <div className="text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1 mb-3">
                    {form.formState.errors.propertyType.message}
                  </div>
                )}
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
                          className={form.formState.errors.title ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
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
                  render={({ field }) => {
                    const fieldStatus = getRequiredFieldStatus('address', field.value);
                    
                    return (
                      <FormItem>
                        <FormLabel className={fieldStatus.hasError ? "text-red-600" : ""}>
                          Address {fieldStatus.isRequired && <span className="text-red-500">*</span>}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="123 Example Street, Auckland" 
                            {...field}
                            className={`${fieldStatus.hasError ? 'border-red-500 focus:ring-red-500' : ''} ${form.formState.errors.address ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                            data-testid="input-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
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
                          placeholder="$1,250,000 or $650/week or POA" 
                          {...field}
                          onChange={(e) => handlePriceChange(e, field.onChange)}
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="carSpaces"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parking Spaces</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-car-spaces">
                              <SelectValue placeholder="0" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[0, 1, 2, 3, 4, 5, 6].map(num => (
                              <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="parkingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parking Type</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-parking-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="garage">Garage</SelectItem>
                            <SelectItem value="covered">Covered</SelectItem>
                            <SelectItem value="carport">Carport</SelectItem>
                            <SelectItem value="driveway">Driveway</SelectItem>
                            <SelectItem value="street">Street Parking</SelectItem>
                            <SelectItem value="none">No Parking</SelectItem>
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
                  render={({ field }) => {
                    const fieldStatus = getRequiredFieldStatus('lotNumber', field.value);
                    
                    return (
                      <FormItem>
                        <FormLabel className={`flex items-center space-x-1 ${fieldStatus.hasError ? "text-red-600" : ""}`}>
                          <span>Council Lot Number</span>
                          <span className="text-red-500 text-xs">*</span>
                          <span className="text-xs text-muted-foreground">(Must match official records)</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="PT LOT 15 DP 123456" 
                            {...field}
                            className={`${fieldStatus.hasError ? 'border-red-500 focus:ring-red-500' : ''} ${form.formState.errors.lotNumber ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                            data-testid="input-lot-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="certificateOfTitle"
                  render={({ field }) => {
                    const fieldStatus = getRequiredFieldStatus('certificateOfTitle', field.value);
                    
                    return (
                      <FormItem>
                        <FormLabel className={`flex items-center space-x-1 ${fieldStatus.hasError ? "text-red-600" : ""}`}>
                          <span>Certificate of Title</span>
                          <span className="text-red-500 text-xs">*</span>
                          <span className="text-xs text-muted-foreground">(Must match official records)</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="CT 456789/123" 
                            {...field}
                            className={fieldStatus.hasError ? 'border-red-500 focus:ring-red-500' : ''}
                            data-testid="input-certificate-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="hideCertificateOfTitle"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                          data-testid="checkbox-hide-certificate"
                        />
                      </FormControl>
                      <div className="flex-1">
                        <FormLabel className="text-sm font-medium text-blue-800 mb-0 cursor-pointer">
                          Hide Certificate of Title from public display
                        </FormLabel>
                        <p className="text-xs text-blue-600 mt-1">
                          Certificate will still be saved for security verification but won't be visible to other users
                        </p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Important Notice */}
                <div className="p-4 rounded-lg border bg-amber-50 border-amber-200">
                  <div className="flex items-start space-x-3">
                    <div className="text-amber-600 text-lg">⚠️</div>
                    <div className="flex-1">
                      <div className="font-medium text-amber-800 text-sm mb-1">
                        Property Information Accuracy
                      </div>
                      <div className="text-xs text-amber-700">
                        Please ensure all property details are accurate and match official records. 
                        Incorrect information may cause issues for potential buyers and could affect the listing.
                      </div>
                    </div>
                  </div>
                </div>

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
                <div>
                  <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block ${form.formState.errors.imageUrl ? 'text-red-600' : ''}`}>
                    Property Image
                    {form.formState.errors.imageUrl && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {form.formState.errors.imageUrl && (
                    <div className="text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1 mb-3">
                      {form.formState.errors.imageUrl.message}
                    </div>
                  )}
                  <ObjectUploader
                    maxNumberOfFiles={4}
                    maxFileSize={10485760} // 10MB
                    allowedFileTypes={['image/*']}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleUploadComplete}
                    onUploadProgress={handleUploadProgress}
                    buttonClassName={`w-full ${form.formState.errors.imageUrl ? 'bg-red-50 border-2 border-dashed border-red-500 text-red-600' : 'bg-primary/10 border-2 border-dashed border-primary/30 text-primary'} hover:bg-primary/20 h-24 flex flex-col items-center justify-center space-y-2`}
                  >
                    <div className="flex flex-col items-center space-y-1">
                      <i className="fas fa-camera text-xl"></i>
                      <span className="font-medium">Upload Property Images</span>
                      <span className="text-xs text-muted-foreground">Camera, Gallery, or Files (up to 4)</span>
                    </div>
                  </ObjectUploader>
                  
                  {/* Show uploaded images preview */}
                  {uploadedImages.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="text-sm font-medium text-green-700">
                        ✅ {uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''} ready for upload
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {uploadedImages.map((imagePath, index) => (
                          <div key={index} className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 text-xs font-medium">
                            #{index + 1}
                          </div>
                        ))}
                      </div>
                      {uploadedImages.length >= 4 && (
                        <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded-md">
                          💎 Want more than 4 photos? Premium coming soon!
                        </div>
                      )}
                    </div>
                  )}
                </div>

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

            {/* Self-Declaration Card */}
            <Card className={form.formState.errors.selfDeclaration ? 'border-red-500 border-2' : ''}>
              <CardContent className="p-4">
                <FormField
                  control={form.control}
                  name="selfDeclaration"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-3">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className={`w-4 h-4 mt-1 text-primary focus:ring-primary border-gray-300 rounded ${form.formState.errors.selfDeclaration ? 'border-red-500 focus:ring-red-500' : ''}`}
                          data-testid="checkbox-self-declaration"
                        />
                      </FormControl>
                      <div className="flex-1">
                        <FormLabel className="text-sm font-medium text-foreground cursor-pointer">
                          Property Information Declaration
                        </FormLabel>
                        <p className="text-xs text-muted-foreground mt-1">
                          I declare that the property information provided is accurate to the best of my knowledge. 
                          I understand that providing false information may result in legal consequences.
                        </p>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button 
              type="submit" 
              className="w-full bg-primary text-primary-foreground h-12 font-semibold hover:bg-primary/90"
              disabled={createPropertyMutation.isPending}
              data-testid="button-submit-property"
              onClick={async (e) => {
                console.log("🔍 VALIDATION BUTTON CLICKED!");
                
                // Force validation of all fields
                const isValid = await form.trigger();
                
                console.log("🔍 Form validation result:", isValid);
                console.log("🔍 Form errors:", form.formState.errors);
                
                if (!isValid) {
                  // Scroll to first error field
                  const firstErrorField = Object.keys(form.formState.errors)[0];
                  if (firstErrorField) {
                    const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
                    if (errorElement) {
                      errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      // Add visual flash to highlight the field
                      errorElement.focus();
                    }
                  }
                  
                  toast({
                    title: "Please complete required fields",
                    description: "Some fields need your attention. Check the highlighted areas above.",
                    variant: "destructive",
                  });
                  
                  // Prevent form submission
                  e.preventDefault();
                  return;
                }
                
                console.log("🔍 Validation passed - form will submit");
              }}
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

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        onSuccess={handleAuthSuccess}
        mode={authMode}
        onToggleMode={toggleAuthMode}
      />

      <BottomNavigation />
    </div>
  );
}
