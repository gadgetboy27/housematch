import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import AllData from "@/pages/all-data";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/liked" component={Liked} />
      <Route path="/add-property" component={AddProperty} />
      <Route path="/add" component={AddProperty} />
      <Route path="/edit-property/:id" component={EditProperty} />
      <Route path="/reports" component={Reports} />
      <Route path="/service-submission" component={ServiceSubmission} />
      <Route path="/profile" component={Profile} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/all-data" component={AllData} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
