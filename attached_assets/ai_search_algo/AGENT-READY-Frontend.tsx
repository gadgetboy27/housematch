// ============================================
// 🚀 SwipeRight NZ - AI Property Search Frontend
// ============================================
//
// FILE STRUCTURE:
// 1. IMPORTS & CONFIGURATION
// 2. COMPONENT STATE & HOOKS
// 3. API INTEGRATION (Calls your backend)
// 4. 🎨 UI CUSTOMIZATION SECTIONS
// 5. RENDER LOGIC
//
// WHAT TO CUSTOMIZE:
// - Look for 🎨 markers for UI/UX changes
// - All API calls go to YOUR backend (not Claude directly)
// - Your backend handles all AI and proprietary logic
// - This component just displays results beautifully
//
// ============================================

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { sanitizeText } from "@/lib/sanitize";
import { handleMutationError } from "@/lib/errorHandler";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Search, 
  MapPin, 
  Bed, 
  Bath, 
  DollarSign, 
  Loader2,
  TrendingUp,
  Brain,
  FileText,
  Building,
  ArrowRight,
  Target,
  Star,
  Zap
} from "lucide-react";
import { formatPrice } from "@shared/reportConfig";

// ============================================
// SECTION 1: TYPE DEFINITIONS
// ============================================

interface AISearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PropertyResult {
  id: number;
  title: string;
  address: string;
  suburb: string;
  bedrooms: number;
  bathrooms: number;
  priceCents: number;
  imageUrl: string;
  propertyType?: string;
  
  // Your proprietary match scores (from backend)
  matchScore: number;
  baseMatchScore: number;
  lifestyleScore: number;
  valueScore: number;
  preferenceScore: number;
  confidence: number;
  matchReasons: string[];
  
  // Cross-sell recommendations
  recommendedReports?: ReportRecommendation[];
}

interface ReportRecommendation {
  type: string;
  name: string;
  price: number; // in cents
  reason: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  savings?: string | null;
}

// ============================================
// SECTION 2: MAIN COMPONENT
// ============================================

export function AIPropertySearch({ open, onOpenChange }: AISearchProps) {
  
  // ────────────────────────────────────────
  // Component State
  // ────────────────────────────────────────
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<PropertyResult | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Get user info for personalization
  const { data: user } = useQuery({
    queryKey: ["/api/user"],
    enabled: open,
  });

  // ────────────────────────────────────────
  // API Integration - Calls YOUR Backend
  // ────────────────────────────────────────
  // All AI logic and proprietary scoring happens on your server
  // This just sends the query and receives scored results
  
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const startTime = Date.now();
      
      // Call YOUR backend API (not Claude directly)
      const response = await apiRequest("POST", "/api/ai/search-properties", { query });
      const data = await response.json();
      
      console.log(`Search completed in ${Date.now() - startTime}ms`);
      console.log('Results:', data);
      
      return data;
    },
    onSuccess: (data) => {
      if (data.properties.length === 0) {
        toast({
          title: "No matches found",
          description: "Try adjusting your search criteria",
        });
      } else {
        // 🎨 CUSTOMIZE: Success message
        toast({
          title: `Found ${data.properties.length} properties`,
          description: `Showing top matches based on your preferences`,
        });
      }
    },
    onError: (error: Error) => {
      console.error("Search error:", error);
      handleMutationError(error, "Search Failed");
    },
  });

  // ────────────────────────────────────────
  // Event Handlers
  // ────────────────────────────────────────
  
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Enter a search query",
        description: "Describe what you're looking for",
        variant: "destructive",
      });
      return;
    }
    
    // 🎨 CUSTOMIZE: Add analytics tracking here
    // trackEvent('ai_search_initiated', { query: searchQuery });
    
    searchMutation.mutate(searchQuery);
  };

  const handlePropertyClick = (property: PropertyResult) => {
    setSelectedProperty(property);
    
    // 🎨 CUSTOMIZE: Track property view
    // trackEvent('ai_search_property_clicked', { propertyId: property.id, matchScore: property.matchScore });
  };

  const handleViewProperty = (propertyId: number) => {
    onOpenChange(false);
    setLocation(`/property/${propertyId}`);
    
    // 🎨 CUSTOMIZE: Track conversion
    // trackEvent('ai_search_to_property_page', { propertyId });
  };

  const handleReportClick = (property: PropertyResult, reportType: string) => {
    // Track report recommendation click
    apiRequest("POST", "/api/reports/recommendation-track", {
      propertyId: property.id,
      reportType,
      action: 'clicked',
      matchScore: property.matchScore,
    }).catch(console.error);
    
    // Navigate to report purchase
    onOpenChange(false);
    setLocation(`/property/${property.id}?report=${reportType}`);
    
    // 🎨 CUSTOMIZE: Track cross-sell conversion
    // trackEvent('cross_sell_clicked', { propertyId: property.id, reportType, matchScore: property.matchScore });
  };

  // ────────────────────────────────────────
  // 🎨 UI HELPER FUNCTIONS - CUSTOMIZE THESE!
  // ────────────────────────────────────────
  
  // ┌─────────────────────────────────────────────────────┐
  // │ 🎨 CUSTOMIZE: Match score color scheme              │
  // └─────────────────────────────────────────────────────┘
  const getMatchScoreColor = (score: number): string => {
    // Your brand colors here!
    if (score >= 80) return "bg-gradient-to-r from-green-500 to-emerald-500";
    if (score >= 60) return "bg-gradient-to-r from-blue-500 to-cyan-500";
    if (score >= 40) return "bg-gradient-to-r from-yellow-500 to-orange-500";
    return "bg-gradient-to-r from-gray-400 to-gray-500";
  };

  // ┌─────────────────────────────────────────────────────┐
  // │ 🎨 CUSTOMIZE: Match score labels                    │
  // └─────────────────────────────────────────────────────┘
  const getMatchScoreLabel = (score: number): string => {
    if (score >= 90) return "Perfect Match!";
    if (score >= 80) return "Excellent Match";
    if (score >= 70) return "Great Match";
    if (score >= 60) return "Good Match";
    if (score >= 50) return "Fair Match";
    return "Possible Match";
  };

  // ┌─────────────────────────────────────────────────────┐
  // │ 🎨 CUSTOMIZE: Match score emoji/icon                │
  // └─────────────────────────────────────────────────────┘
  const getMatchScoreIcon = (score: number) => {
    if (score >= 80) return <Star className="fill-current" size={16} />;
    if (score >= 60) return <Zap size={16} />;
    return <Target size={16} />;
  };

  // ┌─────────────────────────────────────────────────────┐
  // │ 🎨 CUSTOMIZE: Example search queries                │
  // │ Update these to match your target market            │
  // └─────────────────────────────────────────────────────┘
  const exampleQueries = [
    "4 bedroom family home in Wellington",
    "Modern apartment under $600k",
    "Investment property with good rental yield",
    "House near good schools in Auckland",
    "Beach property with sea views",
  ];

  // ============================================
  // SECTION 3: RENDER - MAIN SEARCH INTERFACE
  // ============================================

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          
          {/* ────────────────────────────────── */}
          {/* Header Section */}
          {/* ────────────────────────────────── */}
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {/* 🎨 CUSTOMIZE: Your brand colors/logo */}
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Sparkles className="text-white" size={20} />
              </div>
              AI Property Search
            </SheetTitle>
            <SheetDescription>
              {/* 🎨 CUSTOMIZE: Tagline */}
              Describe what you're looking for in natural language
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            
            {/* ────────────────────────────────── */}
            {/* Learning Status Indicator (Optional) */}
            {/* ────────────────────────────────── */}
            {user && searchMutation.data?.userLearningStatus && (
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* 🎨 CUSTOMIZE: Learning indicator design */}
                    <div className="p-2 bg-purple-500 rounded-full">
                      <Brain className="text-white" size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">AI is learning your preferences</p>
                      <p className="text-xs text-muted-foreground">
                        {searchMutation.data.userLearningStatus.totalSwipes} properties analyzed • 
                        {Math.round(searchMutation.data.userLearningStatus.confidence * 100)}% confidence
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      <TrendingUp size={12} className="mr-1" />
                      Getting smarter
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ────────────────────────────────── */}
            {/* Search Input */}
            {/* ────────────────────────────────── */}
            <div className="space-y-3">
              <div className="relative">
                {/* 🎨 CUSTOMIZE: Input styling, placeholder text */}
                <Input
                  placeholder="e.g., 3 bedroom family home in Auckland under $800k with garden"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="pr-10 h-12 text-base"
                  data-testid="input-ai-search"
                />
                <Search className="absolute right-3 top-3.5 text-muted-foreground" size={20} />
              </div>

              {/* 🎨 CUSTOMIZE: Button colors, text, loading state */}
              <Button
                onClick={handleSearch}
                disabled={searchMutation.isPending}
                className="w-full h-12 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                data-testid="button-search"
              >
                {searchMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={18} />
                    Searching with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2" size={18} />
                    Search with AI
                  </>
                )}
              </Button>
            </div>

            {/* ────────────────────────────────── */}
            {/* Example Queries */}
            {/* ────────────────────────────────── */}
            <div className="space-y-2">
              {/* 🎨 CUSTOMIZE: Examples text */}
              <p className="text-xs text-muted-foreground font-medium">Try these examples:</p>
              <div className="flex flex-wrap gap-2">
                {exampleQueries.map((example) => (
                  <Badge
                    key={example}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setSearchQuery(example)}
                    data-testid={`badge-example-${example.split(' ')[0]}`}
                  >
                    {example}
                  </Badge>
                ))}
              </div>
            </div>

            {/* ────────────────────────────────── */}
            {/* Search Results Section */}
            {/* ────────────────────────────────── */}
            {searchMutation.data && (
              <div className="mt-6 space-y-4">
                
                {/* Results Header */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">
                    {searchMutation.data.properties?.length || 0} Properties Found
                  </h3>
                  {searchMutation.data.criteria && (
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles size={12} className="mr-1" />
                      AI Matched
                    </Badge>
                  )}
                </div>

                {/* ────────────────────────────────── */}
                {/* Display Extracted Criteria */}
                {/* ────────────────────────────────── */}
                {searchMutation.data.criteria && (
                  <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Target size={14} className="text-purple-600" />
                        {/* 🎨 CUSTOMIZE: Criteria display styling */}
                        <p className="text-xs font-medium text-purple-900 dark:text-purple-100">
                          What we understood from your search:
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {searchMutation.data.criteria.bedrooms && (
                          <Badge variant="outline" className="text-xs">
                            <Bed size={12} className="mr-1" />
                            {searchMutation.data.criteria.bedrooms}+ bed
                          </Badge>
                        )}
                        {searchMutation.data.criteria.bathrooms && (
                          <Badge variant="outline" className="text-xs">
                            <Bath size={12} className="mr-1" />
                            {searchMutation.data.criteria.bathrooms}+ bath
                          </Badge>
                        )}
                        {searchMutation.data.criteria.suburbs?.map((suburb: string) => (
                          <Badge key={suburb} variant="outline" className="text-xs">
                            <MapPin size={12} className="mr-1" />
                            {sanitizeText(suburb)}
                          </Badge>
                        ))}
                        {searchMutation.data.criteria.maxPrice && (
                          <Badge variant="outline" className="text-xs">
                            <DollarSign size={12} className="mr-1" />
                            Under {formatPrice(searchMutation.data.criteria.maxPrice)}
                          </Badge>
                        )}
                        {searchMutation.data.criteria.lifestyle && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {searchMutation.data.criteria.lifestyle}
                          </Badge>
                        )}
                        {searchMutation.data.criteria.priorities?.map((priority: string) => (
                          <Badge key={priority} variant="secondary" className="text-xs capitalize">
                            {priority}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ────────────────────────────────── */}
                {/* Property Results Cards */}
                {/* ────────────────────────────────── */}
                <div className="space-y-3">
                  {searchMutation.data.properties?.map((property: PropertyResult) => (
                    <Card
                      key={property.id}
                      className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-purple-300"
                      onClick={() => handlePropertyClick(property)}
                      data-testid={`card-property-${property.id}`}
                    >
                      <CardContent className="p-4">
                        
                        {/* ┌────────────────────────────────┐ */}
                        {/* │ 🎨 CUSTOMIZE: Match Score Badge│ */}
                        {/* └────────────────────────────────┘ */}
                        <div className="flex items-center justify-between mb-3">
                          <Badge className={`${getMatchScoreColor(property.matchScore)} text-white font-semibold flex items-center gap-1`}>
                            {getMatchScoreIcon(property.matchScore)}
                            {property.matchScore}% • {getMatchScoreLabel(property.matchScore)}
                          </Badge>
                          
                          {/* Show if learned from user behavior */}
                          {property.preferenceScore > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Brain size={10} className="mr-1" />
                              Learned preference
                            </Badge>
                          )}
                        </div>

                        {/* ┌────────────────────────────────┐ */}
                        {/* │ 🎨 CUSTOMIZE: Property Card    │ */}
                        {/* └────────────────────────────────┘ */}
                        <div className="flex gap-4">
                          <img
                            src={property.imageUrl}
                            alt={property.title}
                            className="w-28 h-28 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold text-base mb-1">{property.title}</h4>
                            <p className="text-xs text-muted-foreground mb-2 flex items-center">
                              <MapPin size={12} className="mr-1" />
                              {property.address}
                            </p>
                            
                            <div className="flex items-center gap-4 mb-2">
                              <span className="text-xs flex items-center">
                                <Bed size={14} className="mr-1" /> {property.bedrooms}
                              </span>
                              <span className="text-xs flex items-center">
                                <Bath size={14} className="mr-1" /> {property.bathrooms}
                              </span>
                              <span className="text-sm font-bold text-primary">
                                {formatPrice(property.priceCents)}
                              </span>
                            </div>

                            {/* ┌────────────────────────────────┐ */}
                            {/* │ 🎨 CUSTOMIZE: Match Reasons    │ */}
                            {/* └────────────────────────────────┘ */}
                            {property.matchReasons.length > 0 && (
                              <div className="space-y-1">
                                {property.matchReasons.slice(0, 2).map((reason, idx) => (
                                  <p key={idx} className="text-xs text-purple-700 dark:text-purple-300 flex items-start">
                                    <Sparkles size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                                    {reason}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ┌────────────────────────────────┐ */}
                        {/* │ 🎨 CUSTOMIZE: Score Breakdown  │ */}
                        {/* └────────────────────────────────┘ */}
                        <div className="mt-3 pt-3 border-t">
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div>
                              <p className="text-xs text-muted-foreground">Criteria</p>
                              <p className="text-sm font-semibold">{property.baseMatchScore}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Lifestyle</p>
                              <p className="text-sm font-semibold">{property.lifestyleScore}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Value</p>
                              <p className="text-sm font-semibold">{property.valueScore}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Personal</p>
                              <p className="text-sm font-semibold">{property.preferenceScore}</p>
                            </div>
                          </div>
                        </div>

                        {/* ┌─────────────────────────────────────┐ */}
                        {/* │ 🎨 CUSTOMIZE: Cross-sell Reports    │ */}
                        {/* │ This is YOUR revenue opportunity!   │ */}
                        {/* └─────────────────────────────────────┘ */}
                        {property.recommendedReports && property.recommendedReports.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Recommended for this property:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {property.recommendedReports.map((report) => (
                                <Button
                                  key={report.type}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReportClick(property, report.type);
                                  }}
                                >
                                  {report.icon === 'FileText' && <FileText size={12} className="mr-1" />}
                                  {report.icon === 'Building' && <Building size={12} className="mr-1" />}
                                  {report.icon === 'TrendingUp' && <TrendingUp size={12} className="mr-1" />}
                                  {report.name} - {formatPrice(report.price)}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ┌────────────────────────────────┐ */}
                        {/* │ 🎨 CUSTOMIZE: CTA Button       │ */}
                        {/* └────────────────────────────────┘ */}
                        <Button
                          className="w-full mt-3"
                          variant="default"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProperty(property.id);
                          }}
                        >
                          View Property Details
                          <ArrowRight size={16} className="ml-2" />
                        </Button>
                        
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Search Performance (Optional - can hide in production) */}
                {searchMutation.data.searchDurationMs && (
                  <p className="text-xs text-muted-foreground text-center">
                    Search completed in {searchMutation.data.searchDurationMs}ms
                    {searchMutation.data.aiParsingDurationMs && 
                      ` (AI parsing: ${searchMutation.data.aiParsingDurationMs}ms)`
                    }
                  </p>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ────────────────────────────────── */}
      {/* Property Detail Modal (Optional) */}
      {/* ────────────────────────────────── */}
      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          open={!!selectedProperty}
          onClose={() => setSelectedProperty(null)}
          onViewFull={() => handleViewProperty(selectedProperty.id)}
        />
      )}
    </>
  );
}

// ============================================
// SECTION 4: PROPERTY DETAIL MODAL
// ============================================
// 🎨 CUSTOMIZE: This entire component

interface PropertyDetailModalProps {
  property: PropertyResult;
  open: boolean;
  onClose: () => void;
  onViewFull: () => void;
}

function PropertyDetailModal({ 
  property, 
  open, 
  onClose, 
  onViewFull 
}: PropertyDetailModalProps) {
  
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Property Quick View</SheetTitle>
          <SheetDescription>
            {property.matchScore}% Match • {property.suburb}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* 🎨 CUSTOMIZE: Image display, gallery, etc */}
          <img
            src={property.imageUrl}
            alt={property.title}
            className="w-full h-64 object-cover rounded-lg"
          />

          {/* 🎨 CUSTOMIZE: Property info layout */}
          <div>
            <h3 className="font-semibold text-lg">{property.title}</h3>
            <p className="text-sm text-muted-foreground">{property.address}</p>
            <p className="text-2xl font-bold text-primary mt-2">
              {formatPrice(property.priceCents)}
            </p>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Bed size={20} />
              <span>{property.bedrooms} Bedrooms</span>
            </div>
            <div className="flex items-center gap-2">
              <Bath size={20} />
              <span>{property.bathrooms} Bathrooms</span>
            </div>
          </div>

          {/* 🎨 CUSTOMIZE: Match explanation card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Why this is a {property.matchScore}% match</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {property.matchReasons.map((reason, idx) => (
                  <li key={idx} className="text-sm flex items-start">
                    <Sparkles size={14} className="mr-2 mt-0.5 text-purple-500 flex-shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* 🎨 CUSTOMIZE: CTA button */}
          <Button onClick={onViewFull} className="w-full" size="lg">
            View Full Details
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================
// 📊 INTEGRATION SUMMARY FOR AI AGENT
// ============================================
//
// HOW THIS WORKS:
// 1. User types natural language query
// 2. Query sent to YOUR backend (/api/ai/search-properties)
// 3. YOUR backend uses Claude to parse query
// 4. YOUR backend runs proprietary search & scoring
// 5. Results returned with match scores & reasons
// 6. This component displays results beautifully
//
// WHAT TO CUSTOMIZE:
// 🎨 All UI/UX (colors, layouts, text)
// 🎨 Example queries
// 🎨 Match score display
// 🎨 Report recommendations UI
// 🎨 Analytics tracking calls
//
// WHAT NOT TO CHANGE:
// ✅ API endpoints (they match your backend)
// ✅ Data types (they match backend responses)
// ✅ Core search flow logic
//
// YOUR PROPRIETARY ALGORITHM:
// 🔒 All scoring happens in backend
// 🔒 This component never sees the algorithm
// 🔒 Just displays results from YOUR server
//
// ============================================
