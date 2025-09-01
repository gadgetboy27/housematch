import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { LocalStorageService, UserSession } from "@/lib/local-storage";
import { apiRequest } from "@/lib/queryClient";
import type { Property } from "@shared/schema";

export default function Profile() {
  const [userSession, setUserSession] = useState<UserSession>({ isLoggedIn: false });
  const [likedCount, setLikedCount] = useState(0);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ name: "", email: "", password: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Load user session and liked properties count
    const session = LocalStorageService.getUserSession();
    const likedProperties = LocalStorageService.getLikedProperties();
    setUserSession(session);
    setLikedCount(likedProperties.length);
  }, []);

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoggingIn(true);
    
    try {
      // Simulate login API call (in real app, this would be actual authentication)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create user session
      const session: UserSession = {
        isLoggedIn: true,
        userId: `user_${Date.now()}`,
        email: loginForm.email,
        name: loginForm.email.split('@')[0],
      };

      // Save session
      LocalStorageService.setUserSession(session);
      setUserSession(session);
      
      // Sync liked properties to server
      if (likedCount > 0) {
        setIsSyncing(true);
        try {
          await LocalStorageService.syncLikedPropertiesToServer(session.userId!);
          toast({
            title: "Synced!",
            description: `${likedCount} liked properties synced to your account`,
          });
        } catch (error) {
          console.error("Sync error:", error);
          toast({
            title: "Sync Warning",
            description: "Login successful, but couldn't sync all data",
            variant: "destructive",
          });
        }
        setIsSyncing(false);
      }

      toast({
        title: "Welcome back!",
        description: "Successfully logged in",
      });

      setShowLoginForm(false);
      setLoginForm({ email: "", password: "" });
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignup = async () => {
    if (!signupForm.name || !signupForm.email || !signupForm.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsSigningUp(true);
    
    try {
      // Simulate signup API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create user session
      const session: UserSession = {
        isLoggedIn: true,
        userId: `user_${Date.now()}`,
        email: signupForm.email,
        name: signupForm.name,
      };

      // Save session
      LocalStorageService.setUserSession(session);
      setUserSession(session);
      
      // Sync liked properties to server
      if (likedCount > 0) {
        setIsSyncing(true);
        try {
          await LocalStorageService.syncLikedPropertiesToServer(session.userId!);
          toast({
            title: "Account created & synced!",
            description: `Welcome! ${likedCount} liked properties saved to your account`,
          });
        } catch (error) {
          toast({
            title: "Account created",
            description: "Welcome! Your likes will sync next time.",
          });
        }
        setIsSyncing(false);
      } else {
        toast({
          title: "Account created!",
          description: "Welcome to PropertySwipe NZ",
        });
      }

      setShowSignupForm(false);
      setSignupForm({ name: "", email: "", password: "" });
    } catch (error) {
      toast({
        title: "Signup failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleLogout = () => {
    LocalStorageService.clearUserSession();
    setUserSession({ isLoggedIn: false });
    toast({
      title: "Logged out",
      description: "Your liked properties are still saved locally",
    });
  };

  const handleSyncData = async () => {
    if (!userSession.userId) return;
    
    setIsSyncing(true);
    try {
      await LocalStorageService.syncLikedPropertiesFromServer(userSession.userId);
      const updatedProperties = LocalStorageService.getLikedProperties();
      setLikedCount(updatedProperties.length);
      toast({
        title: "Data synced",
        description: "Your liked properties are up to date",
      });
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "Could not sync data from server",
        variant: "destructive",
      });
    }
    setIsSyncing(false);
  };

  // Fetch user's properties
  const { data: userProperties = [] } = useQuery({
    queryKey: ["/api/users", userSession.userId, "properties"],
    queryFn: async () => {
      if (!userSession.userId) return [];
      const response = await apiRequest("GET", `/api/users/${userSession.userId}/properties`, undefined, {
        'x-user-id': userSession.userId
      });
      return response.json();
    },
    enabled: !!userSession.userId,
  });

  // Delete property mutation
  const deletePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const response = await apiRequest("DELETE", `/api/properties/${propertyId}`, undefined, {
        'x-user-id': userSession.userId!
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userSession.userId, "properties"] });
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
        description: error.message || "Failed to remove property",
        variant: "destructive",
      });
    }
  });

  const handleDeleteProperty = (propertyId: string) => {
    deletePropertyMutation.mutate(propertyId);
  };

  return (
    <div className="max-w-sm mx-auto min-h-screen bg-white relative">
      {/* Gradient transition overlay for smooth blending */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 max-w-sm w-full h-32 bg-gradient-to-t from-white/95 via-white/60 to-transparent pointer-events-none z-40"></div>
      
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <i className="fas fa-user text-white text-sm"></i>
          </div>
          <h1 className="text-lg font-bold text-secondary">Profile</h1>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 pb-20 space-y-6">
        
        {!userSession.isLoggedIn ? (
          <>
            {/* Not Logged In */}
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-user text-purple-500 text-2xl"></i>
                </div>
                <h2 className="text-xl font-bold text-secondary mb-2">
                  Sign In to Save Your Likes
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                  You have {likedCount} properties saved locally. Sign in to sync them across devices.
                </p>
                
                <div className="space-y-3">
                  <Button 
                    onClick={() => setShowLoginForm(true)}
                    className="w-full"
                    data-testid="button-login"
                  >
                    <i className="fas fa-sign-in-alt mr-2"></i>
                    Sign In
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowSignupForm(true)}
                    className="w-full"
                    data-testid="button-signup"
                  >
                    Create Account
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Login Form */}
            {showLoginForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sign In</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    data-testid="input-login-email"
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    data-testid="input-login-password"
                  />
                  <div className="flex space-x-3">
                    <Button 
                      onClick={handleLogin}
                      disabled={isLoggingIn || isSyncing}
                      className="flex-1"
                      data-testid="button-confirm-login"
                    >
                      {isLoggingIn ? "Signing in..." : isSyncing ? "Syncing..." : "Sign In"}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowLoginForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Signup Form */}
            {showSignupForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Create Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Full Name"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                    data-testid="input-signup-name"
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    data-testid="input-signup-email"
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    data-testid="input-signup-password"
                  />
                  <div className="flex space-x-3">
                    <Button 
                      onClick={handleSignup}
                      disabled={isSigningUp || isSyncing}
                      className="flex-1"
                      data-testid="button-confirm-signup"
                    >
                      {isSigningUp ? "Creating..." : isSyncing ? "Syncing..." : "Create Account"}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowSignupForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            {/* Logged In User Info */}
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-user text-white text-2xl"></i>
                </div>
                <h2 className="text-xl font-bold text-secondary mb-1" data-testid="text-user-name">
                  {userSession.name}
                </h2>
                <p className="text-muted-foreground text-sm mb-4" data-testid="text-user-email">
                  {userSession.email}
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
                  <Button variant="outline" className="flex-1" data-testid="button-edit-profile">
                    Edit Profile
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

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-secondary">Push Notifications</div>
                <div className="text-sm text-muted-foreground">Get notified of new properties</div>
              </div>
              <Switch data-testid="switch-notifications" />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-secondary">AI Recommendations</div>
                <div className="text-sm text-muted-foreground">Personalized property suggestions</div>
              </div>
              <Switch defaultChecked data-testid="switch-ai-recommendations" />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-secondary">Email Updates</div>
                <div className="text-sm text-muted-foreground">Weekly market insights</div>
              </div>
              <Switch data-testid="switch-email-updates" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              data-testid="button-search-filters"
            >
              <i className="fas fa-filter mr-3"></i>
              Search Filters
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              data-testid="button-saved-searches"
            >
              <i className="fas fa-bookmark mr-3"></i>
              Saved Searches
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              data-testid="button-price-alerts"
            >
              <i className="fas fa-bell mr-3"></i>
              Price Alerts
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out (only if logged in) */}
        {userSession.isLoggedIn && (
          <Button 
            variant="destructive" 
            onClick={handleLogout}
            className="w-full"
            data-testid="button-sign-out"
          >
            <i className="fas fa-sign-out-alt mr-2"></i>
            Sign Out
          </Button>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <div className="flex items-center mb-4">
              <i className="fas fa-exclamation-triangle text-red-500 text-xl mr-3"></i>
              <h3 className="font-semibold">Remove Property?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This will remove your property from all listings. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button 
                variant="destructive"
                onClick={() => handleDeleteProperty(showDeleteConfirm)}
                disabled={deletePropertyMutation.isPending}
                className="flex-1"
                data-testid="button-confirm-delete"
              >
                {deletePropertyMutation.isPending ? "Removing..." : "Remove"}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1"
                data-testid="button-cancel-delete"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
}