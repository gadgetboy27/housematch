import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GoogleAnalytics } from "@/components/Analytics";
import { FacebookPixel } from "@/components/FacebookPixel";
import { Footer } from "@/components/Footer";
import { RequireAuth, RequireAdmin, RequirePartnerAuth } from "@/components/route-guards";
import Home from "@/pages/home";
import Liked from "@/pages/liked";
import AddProperty from "@/pages/add-property";
import EditProperty from "@/pages/edit-property";
import Reports from "@/pages/reports";
import ServiceSubmission from "@/pages/service-submission";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";
import { ResetPassword } from "@/pages/reset-password";
import PricingPage from "@/pages/pricing-page";
import PublicInfo from "@/pages/public-info";
import PaymentSuccess from "@/pages/payment-success";
import MyOffers from "@/pages/my-offers";
import Premium from "@/pages/premium";
import HelpPage from "@/pages/help";
import AdminErrors from "@/pages/admin-errors";
import AdminPartners from "@/pages/admin-partners";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminSetup from "@/pages/admin-setup";
import PartnerLogin from "@/pages/partner-login";
import PartnerDashboard from "@/pages/partner-dashboard";
import PartnerOrders from "@/pages/partner-orders";
import PartnerProfile from "@/pages/partner-profile";
import PartnerSignup from "@/pages/partner-signup";
import ScoutPage from "@/pages/scout";
import MarketReport from "@/pages/market-report";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/property/:id" component={Home} />
      <Route path="/market-report" component={MarketReport} />
      <Route path="/reports" component={Reports} />
      <Route path="/service-submission" component={ServiceSubmission} />
      <Route path="/partner/signup" component={PartnerSignup} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/premium" component={Premium} />
      <Route path="/subscription" component={Premium} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/info" component={PublicInfo} />
      <Route path="/help" component={HelpPage} />
      <Route path="/support" component={HelpPage} />
      <Route path="/admin/setup" component={AdminSetup} />
      
      {/* Customer Protected Routes - Require Authentication */}
      <Route path="/liked">
        {() => (
          <RequireAuth>
            <Liked />
          </RequireAuth>
        )}
      </Route>
      <Route path="/add-property">
        {() => (
          <RequireAuth>
            <AddProperty />
          </RequireAuth>
        )}
      </Route>
      <Route path="/add">
        {() => (
          <RequireAuth>
            <AddProperty />
          </RequireAuth>
        )}
      </Route>
      <Route path="/edit-property/:id">
        {() => (
          <RequireAuth>
            <EditProperty />
          </RequireAuth>
        )}
      </Route>
      <Route path="/profile">
        {() => (
          <RequireAuth>
            <Profile />
          </RequireAuth>
        )}
      </Route>
      <Route path="/my-offers">
        {() => (
          <RequireAuth>
            <MyOffers />
          </RequireAuth>
        )}
      </Route>
      <Route path="/scout">
        {() => (
          <RequireAuth>
            <ScoutPage />
          </RequireAuth>
        )}
      </Route>
      <Route path="/payment-success">
        {() => (
          <RequireAuth>
            <PaymentSuccess />
          </RequireAuth>
        )}
      </Route>
      <Route path="/subscription/success">
        {() => (
          <RequireAuth>
            <PaymentSuccess />
          </RequireAuth>
        )}
      </Route>
      
      {/* Admin Protected Routes - Require Admin Access */}
      <Route path="/admin">
        {() => (
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        )}
      </Route>
      <Route path="/admin/dashboard">
        {() => (
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        )}
      </Route>
      <Route path="/admin/errors">
        {() => (
          <RequireAdmin>
            <AdminErrors />
          </RequireAdmin>
        )}
      </Route>
      <Route path="/admin/partners">
        {() => (
          <RequireAdmin>
            <AdminPartners />
          </RequireAdmin>
        )}
      </Route>
      
      {/* Partner Portal Routes */}
      <Route path="/partner/login" component={PartnerLogin} />
      <Route path="/partner/dashboard">
        {() => (
          <RequirePartnerAuth>
            <PartnerDashboard />
          </RequirePartnerAuth>
        )}
      </Route>
      <Route path="/partner/orders">
        {() => (
          <RequirePartnerAuth>
            <PartnerOrders />
          </RequirePartnerAuth>
        )}
      </Route>
      <Route path="/partner/profile">
        {() => (
          <RequirePartnerAuth>
            <PartnerProfile />
          </RequirePartnerAuth>
        )}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    const detectDynamicIsland = () => {
      // Check if we're on iOS
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      if (isIOS) {
        // Get the safe area inset top value
        const topInset = parseInt(
          getComputedStyle(document.documentElement)
            .getPropertyValue('--safe-area-inset-top')
            .replace('px', '')
        ) || 0;
        
        // Dynamic Island devices have significantly higher top inset (≥50px)
        // Regular notch is ~44px, no notch is 0px
        const isDynamicIsland = topInset >= 50;
        
        // Set data attribute on html element for CSS targeting
        document.documentElement.toggleAttribute('data-di', isDynamicIsland);
      }
    };

    // Run detection on mount
    detectDynamicIsland();
    
    // Re-run on orientation changes to ensure accuracy
    const handleOrientationChange = () => {
      // Small delay to allow CSS env() values to update
      setTimeout(detectDynamicIsland, 100);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  const [location] = useLocation();
  
  // Don't show footer on home page - user wants only images
  const showFooter = location !== "/" && !location.startsWith("/property/");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex flex-col min-h-screen">
          <GoogleAnalytics />
          <FacebookPixel />
          <Toaster />
          <div className="flex-1">
            <Router />
          </div>
          {showFooter && <Footer />}
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
