import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LocalStorageService } from "@/lib/local-storage";
import { apiRequest } from "@/lib/queryClient";
import type { Property } from "@shared/schema";

export default function Profile() {
  const [likedCount, setLikedCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-user text-white text-2xl"></i>
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

      <BottomNavigation />
    </div>
  );
}