import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function Profile() {
  return (
    <div className="max-w-sm mx-auto min-h-screen bg-white relative">
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-user text-white text-sm"></i>
          </div>
          <h1 className="text-lg font-bold text-secondary">Profile</h1>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 pb-20 space-y-6">
        
        {/* User Info */}
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-user text-white text-2xl"></i>
            </div>
            <h2 className="text-xl font-bold text-secondary mb-1" data-testid="text-user-name">
              Demo User
            </h2>
            <p className="text-muted-foreground text-sm" data-testid="text-user-email">
              demo@propertyswipe.co.nz
            </p>
            <Button variant="outline" className="mt-4" data-testid="button-edit-profile">
              Edit Profile
            </Button>
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
                <div className="text-2xl font-bold text-primary" data-testid="text-stat-swipes">
                  156
                </div>
                <div className="text-xs text-muted-foreground">Swipes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500" data-testid="text-stat-liked">
                  23
                </div>
                <div className="text-xs text-muted-foreground">Liked</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-500" data-testid="text-stat-saved">
                  8
                </div>
                <div className="text-xs text-muted-foreground">Saved</div>
              </div>
            </div>
          </CardContent>
        </Card>

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
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              data-testid="button-market-reports"
            >
              <i className="fas fa-chart-line mr-3"></i>
              Market Reports
            </Button>
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-muted-foreground"
              data-testid="button-help-center"
            >
              <i className="fas fa-question-circle mr-3"></i>
              Help Center
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start text-muted-foreground"
              data-testid="button-contact-us"
            >
              <i className="fas fa-envelope mr-3"></i>
              Contact Us
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start text-muted-foreground"
              data-testid="button-privacy-policy"
            >
              <i className="fas fa-shield-alt mr-3"></i>
              Privacy Policy
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button 
          variant="destructive" 
          className="w-full"
          data-testid="button-sign-out"
        >
          <i className="fas fa-sign-out-alt mr-2"></i>
          Sign Out
        </Button>
      </div>

      <BottomNavigation />
    </div>
  );
}
