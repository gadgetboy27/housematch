import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LocalStorageService } from "@/lib/local-storage";
import { apiRequest } from "@/lib/queryClient";
import { AuthModal } from "@/components/auth-modal";
import { ProfilePictureSelector } from "@/components/profile-picture-selector";
import DraftViewerModal from "@/components/draft-viewer-modal";
import type { Property } from "@shared/schema";

export default function Profile() {
  const [likedCount, setLikedCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot-password'>('login');
  const [showDraftViewer, setShowDraftViewer] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Render profile picture function
  const renderProfilePicture = (picture: string) => {
    // Check if it's an emoji (contains Unicode emoji characters)
    const isEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(picture);
    
    if (isEmoji) {
      return (
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <span className="text-4xl">{picture}</span>
        </div>
      );
    }

    // Standard avatar - show colored circle with gradient
    const STANDARD_PICTURES = [
      { id: "avatar1", colors: "from-blue-500 to-blue-600", emoji: "🔵" },
      { id: "avatar2", colors: "from-green-500 to-green-600", emoji: "🟢" },
      { id: "avatar3", colors: "from-purple-500 to-purple-600", emoji: "🟣" },
      { id: "avatar4", colors: "from-orange-500 to-orange-600", emoji: "🟠" },
      { id: "avatar5", colors: "from-red-500 to-red-600", emoji: "🔴" },
      { id: "avatar6", colors: "from-sky-400 to-blue-500", emoji: "🌅" },
      { id: "avatar7", colors: "from-blue-400 to-teal-500", emoji: "🌊" },
      { id: "avatar8", colors: "from-green-400 to-emerald-500", emoji: "🌲" },
    ];

    const standardAvatar = STANDARD_PICTURES.find(p => p.id === picture);
    if (standardAvatar) {
      return (
        <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${standardAvatar.colors} flex items-center justify-center`}>
          <span className="text-2xl text-white">{standardAvatar.emoji}</span>
        </div>
      );
    }

    // Default fallback
    return (
      <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
        <i className="fas fa-user text-white text-2xl"></i>
      </div>
    );
  };

  // Check if user is authenticated using real auth system
  const { data: user, isLoading } = useQuery({
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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      setShowAuthModal(true);
    }
  }, [user, isLoading]);

  useEffect(() => {
    // Load liked properties count from localStorage
    const likedProperties = LocalStorageService.getLikedProperties();
    setLikedCount(likedProperties.length);
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      // Clear cached user data
      queryClient.setQueryData(["/api/auth/user"], null);
      toast({
        title: "Logged out",
        description: "See you next time!",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleSyncData = async () => {
    if (!user?.id) return;
    
    setIsSyncing(true);
    try {
      await LocalStorageService.syncLikedPropertiesFromServer(user.id);
      // Refresh liked count after sync
      const updatedLikedProperties = LocalStorageService.getLikedProperties();
      setLikedCount(updatedLikedProperties.length);
      
      toast({
        title: "Data Synced",
        description: "Your liked properties have been synced successfully",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch user's properties using real authenticated user ID
  const { data: userProperties = [] } = useQuery({
    queryKey: ["/api/users", user?.id, "properties"],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest("GET", `/api/users/${user.id}/properties`);
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Delete property mutation
  const deletePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const response = await apiRequest("DELETE", `/api/properties/${propertyId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Property Removed",
        description: "Your property has been removed from listings",
      });
      setShowDeleteConfirm(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete property",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="max-w-sm mx-auto min-h-screen bg-background pb-20">
        <div className="px-4 py-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <i className="fas fa-spinner fa-spin text-3xl text-muted-foreground mb-4"></i>
              <p className="text-muted-foreground">Loading your profile...</p>
            </div>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto min-h-screen bg-background pb-20">
      <div className="px-4 py-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-secondary">My Profile</h1>
          <p className="text-muted-foreground text-sm">Manage your account and properties</p>
        </div>

        {!user ? (
          /* Not Authenticated */
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-user text-white text-2xl"></i>
              </div>
              <h2 className="text-xl font-bold text-secondary mb-2">Welcome to PropertySwipe</h2>
              <p className="text-muted-foreground mb-6">
                Sign in to manage your properties, view your listings, and access saved properties.
              </p>
              <div className="space-y-4">
                <Button 
                  onClick={() => window.location.href = '/add-property'}
                  className="w-full"
                  data-testid="button-get-started"
                >
                  Get Started - Add Property
                </Button>
                <p className="text-xs text-muted-foreground">
                  You can start adding properties immediately. We'll ask you to sign up when you submit.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Authenticated User */}
            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-4 relative">
                  {renderProfilePicture(user.profilePicture || "👤")}
                  <div className="absolute -bottom-1 -right-1">
                    <ProfilePictureSelector 
                      currentProfilePicture={user.profilePicture || "👤"}
                      userId={user.id}
                    />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-secondary mb-1" data-testid="text-user-name">
                  {user.name}
                </h2>
                <p className="text-muted-foreground text-sm mb-4" data-testid="text-user-email">
                  {user.email}
                </p>
                <div className="flex space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={handleSyncData}
                    disabled={isSyncing}
                    className="flex-1" 
                    data-testid="button-sync-data"
                  >
                    <i className={`fas ${isSyncing ? 'fa-spinner fa-spin' : 'fa-sync'} mr-2`}></i>
                    {isSyncing ? 'Syncing...' : 'Sync Data'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleLogout}
                    className="flex-1" 
                    data-testid="button-logout"
                  >
                    <i className="fas fa-sign-out-alt mr-2"></i>
                    Logout
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* My Properties */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-base">My Properties</CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => window.location.href = '/add-property'}
                  data-testid="button-add-property"
                >
                  <i className="fas fa-plus mr-1 text-xs"></i>
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {userProperties.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <i className="fas fa-home text-3xl mb-3 block opacity-20"></i>
                    <p className="text-sm">You haven't listed any properties yet</p>
                    <Button 
                      size="sm" 
                      className="mt-3"
                      onClick={() => window.location.href = '/add-property'}
                    >
                      List Your First Property
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userProperties.map((property: Property) => (
                      <div 
                        key={property.id} 
                        className="border rounded-lg p-3 bg-white"
                      >
                        <div className="flex gap-3">
                          <img 
                            src={property.imageUrl || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=80"}
                            alt={property.title}
                            className="w-20 h-16 rounded object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate" data-testid={`property-title-${property.id}`}>
                              {property.title}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">
                              {property.address}
                            </p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs font-semibold text-green-600">
                                {property.price}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span><i className="fas fa-eye"></i> {property.views || 0}</span>
                                <span><i className="fas fa-heart text-pink-400"></i> {property.likes || 0}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button 
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => window.location.href = `/edit-property/${property.id}`}
                              data-testid={`button-edit-${property.id}`}
                            >
                              <i className="fas fa-edit text-xs text-blue-500"></i>
                            </Button>
                            <Button 
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => setShowDeleteConfirm(property.id)}
                              data-testid={`button-delete-${property.id}`}
                            >
                              <i className="fas fa-trash text-xs text-red-500"></i>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Offers & Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">My Offers & Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <MyOffersAndDocuments 
                  onViewDocument={(draftId) => {
                    setSelectedDraftId(draftId);
                    setShowDraftViewer(true);
                  }}
                />
              </CardContent>
            </Card>

            {/* Received Offers (for sellers) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Offers Received</CardTitle>
              </CardHeader>
              <CardContent>
                <ReceivedOffers />
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-pink-500" data-testid="text-stat-liked">
                      {likedCount}
                    </div>
                    <div className="text-xs text-muted-foreground">Liked</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-500" data-testid="text-stat-properties">
                      {userProperties.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Listed</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-blue-500" data-testid="text-stat-synced">
                      <i className="fas fa-cloud text-base"></i>
                    </div>
                    <div className="text-xs text-muted-foreground">Synced</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle className="text-lg text-center">Delete Property?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  This will remove your property from listings. This action cannot be undone.
                </p>
                <div className="flex space-x-2">
                  <Button 
                    variant="destructive"
                    onClick={() => deletePropertyMutation.mutate(showDeleteConfirm)}
                    disabled={deletePropertyMutation.isPending}
                    className="flex-1"
                    data-testid="button-confirm-delete"
                  >
                    {deletePropertyMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user) => {
          setShowAuthModal(false);
          queryClient.setQueryData(["/api/auth/user"], user);
          toast({
            title: "Welcome!",
            description: `Logged in as ${user.name}`,
          });
        }}
        mode={authMode}
        onToggleMode={() => {
          if (authMode === 'login') {
            setAuthMode('signup');
          } else if (authMode === 'signup') {
            setAuthMode('login');
          } else if (authMode === 'forgot-password') {
            setAuthMode('login');
          }
        }}
        onForgotPassword={() => setAuthMode('forgot-password')}
      />

      {/* Draft Viewer Modal */}
      <DraftViewerModal 
        isOpen={showDraftViewer}
        onClose={() => setShowDraftViewer(false)}
        draftId={selectedDraftId}
      />

      <BottomNavigation />
    </div>
  );
}

// Component to show user's offers and documents
function MyOffersAndDocuments({ onViewDocument }: { onViewDocument: (draftId: string) => void }) {
  const { data: userOffers, isLoading: offersLoading } = useQuery({
    queryKey: ['/api/user/offers'],
    retry: false,
  });

  const { data: userDocuments, isLoading: documentsLoading } = useQuery({
    queryKey: ['/api/user/documents'], 
    retry: false,
  });

  if (offersLoading || documentsLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm">Loading your offers...</span>
      </div>
    );
  }

  const offers = userOffers?.offers || [];
  const documents = userDocuments?.documents || [];

  if (offers.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <i className="fas fa-handshake text-3xl mb-3 block opacity-20"></i>
        <p className="text-sm">You haven't made any offers yet</p>
        <p className="text-xs mt-1">Browse properties and make an offer to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recent Offers */}
      <div>
        <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
          <i className="fas fa-file-contract text-blue-600"></i>
          Recent Offers ({offers.length})
        </h4>
        <div className="space-y-2">
          {offers.slice(0, 3).map((offer: any) => (
            <div key={offer.id} className="border rounded-lg p-3 bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-sm">${parseInt(offer.offerPrice).toLocaleString()}</p>
                  <p className="text-xs text-gray-600">Property ID: {offer.propertyId}</p>
                  <p className="text-xs text-gray-500">{new Date(offer.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    offer.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    offer.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                    offer.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {offer.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Draft Documents */}
      {documents.length > 0 && (
        <div>
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <i className="fas fa-file-pdf text-red-600"></i>
            Legal Documents ({documents.length})
          </h4>
          <div className="space-y-2">
            {documents.slice(0, 3).map((doc: any) => (
              <div key={doc.id} className="border rounded-lg p-3 bg-white">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-sm">Purchase & Sale Agreement</p>
                    <p className="text-xs text-gray-600">Version {doc.version} • {new Date(doc.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      doc.status === 'generated' ? 'bg-blue-100 text-blue-800' :
                      doc.status === 'reviewed' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {doc.status.toUpperCase()}
                    </span>
                    <Button 
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs"
                      onClick={() => onViewDocument(doc.id)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Component to show offers received by seller
function ReceivedOffers() {
  const { data: sellerOffers, isLoading } = useQuery({
    queryKey: ['/api/seller/offers'],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm">Loading received offers...</span>
      </div>
    );
  }

  const offers = sellerOffers?.offers || [];

  if (offers.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <i className="fas fa-inbox text-3xl mb-3 block opacity-20"></i>
        <p className="text-sm">No offers received yet</p>
        <p className="text-xs mt-1">Offers on your properties will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
        <i className="fas fa-envelope text-green-600"></i>
        Received Offers ({offers.length})
      </h4>
      
      <div className="space-y-2">
        {offers.slice(0, 5).map((offer: any) => (
          <div key={offer.id} className="border rounded-lg p-3 bg-white">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">${parseInt(offer.offerPrice).toLocaleString()}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    offer.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    offer.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                    offer.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {offer.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Property:</strong> {offer.propertyAddress}
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Buyer:</strong> {offer.buyerName} • {offer.buyerEmail}
                </p>
                <p className="text-xs text-gray-500">
                  Settlement: {offer.settlementPeriod} • {new Date(offer.createdAt).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className={offer.financeCondition ? 'text-orange-600' : 'text-green-600'}>
                    {offer.financeCondition ? '⚠️ Finance' : '✅ Cash'}
                  </span>
                  <span className={offer.buildingInspectionCondition ? 'text-orange-600' : 'text-green-600'}>
                    {offer.buildingInspectionCondition ? '🔍 Inspection' : '✅ As-is'}
                  </span>
                  <span className={offer.limCondition ? 'text-orange-600' : 'text-green-600'}>
                    {offer.limCondition ? '📋 LIM' : '✅ No LIM'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1 ml-3">
                <Button 
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  onClick={() => window.open(`mailto:${offer.buyerEmail}?subject=Re: Property Offer ${offer.id}`)}
                >
                  Reply
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  onClick={() => window.open(`tel:${offer.buyerPhone}`)}
                >
                  Call
                </Button>
              </div>
            </div>
            
            {offer.additionalComments && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs text-gray-600">
                  <strong>Comments:</strong> {offer.additionalComments}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}