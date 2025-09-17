import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AllData() {
  const { toast } = useToast();
  
  // Check if user is authenticated and is admin
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/auth/user");
        return response.json();
      } catch (error) {
        return null;
      }
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "URL copied to clipboard",
    });
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is admin
  if (!user || !user.user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This page is restricted to administrators only. 
            {!user ? " Please log in to continue." : " Contact an administrator if you need access."}
          </p>
          <Button onClick={() => window.location.href = "/"}>
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const baseUrl = window.location.origin;
  
  const endpointGroups = [
    {
      title: "📊 Dashboard & Overview",
      description: "Key business metrics and overview data",
      endpoints: [
        { url: "/api/admin/overview", description: "Key business metrics" },
        { url: "/api/admin/overview?fromDate=2024-01-01&toDate=2024-12-31", description: "Date-filtered metrics" },
      ]
    },
    {
      title: "💰 Financial Analysis", 
      description: "Profit & loss and financial data",
      endpoints: [
        { url: "/api/admin/pnl", description: "Profit & loss data" },
        { url: "/api/admin/pnl?fromDate=2024-09-01&toDate=2024-09-30", description: "Monthly P&L" },
      ]
    },
    {
      title: "🏠 Property Analytics",
      description: "Property conversion and performance data", 
      endpoints: [
        { url: "/api/admin/properties/funnel", description: "Property conversion funnel" },
        { url: "/api/admin/properties/funnel?fromDate=2024-01-01", description: "Date-filtered funnel" },
      ]
    },
    {
      title: "👥 User Insights",
      description: "User engagement and activity metrics",
      endpoints: [
        { url: "/api/admin/users/engagement", description: "User engagement metrics" },
        { url: "/api/admin/users/engagement?fromDate=2024-01-01&toDate=2024-12-31", description: "User activity over time" },
      ]
    },
    {
      title: "🔍 Service Provider Performance", 
      description: "Provider analytics and performance data",
      endpoints: [
        { url: "/api/admin/providers/performance", description: "Provider analytics" },
        { url: "/api/admin/providers/performance?fromDate=2024-09-01", description: "Recent provider data" },
      ]
    },
    {
      title: "💳 Transaction Analysis",
      description: "Transaction history and financial data",
      endpoints: [
        { url: "/api/admin/transactions", description: "All transactions (paginated)" },
        { url: "/api/admin/transactions?page=1&limit=100", description: "First 100 transactions" },
        { url: "/api/admin/transactions?type=storage&category=upgrade", description: "Filtered by type/category" },
        { url: "/api/admin/transactions?fromDate=2024-09-01&toDate=2024-09-30", description: "Date range transactions" },
      ]
    },
    {
      title: "💸 Operating Costs",
      description: "Business operating costs and expenses",
      endpoints: [
        { url: "/api/admin/costs", description: "All operating costs" },
        { url: "/api/admin/costs?category=hosting&fromDate=2024-09-01", description: "Filtered costs" },
      ]
    },
    {
      title: "📈 Daily Metrics",
      description: "Daily performance and operational metrics", 
      endpoints: [
        { url: "/api/admin/metrics", description: "Daily performance metrics" },
        { url: "/api/admin/metrics?fromDate=2024-09-01&toDate=2024-09-30", description: "Date range metrics" },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="page-title">
            Admin Data Endpoints
          </h1>
          <p className="text-gray-600 dark:text-gray-400" data-testid="page-description">
            Copy and paste these URLs after your website URL to access admin data for analysis and reporting.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {endpointGroups.map((group, groupIndex) => (
            <Card key={groupIndex} className="h-fit" data-testid={`endpoint-group-${groupIndex}`}>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  {group.title}
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {group.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.endpoints.map((endpoint, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800" data-testid={`endpoint-${groupIndex}-${index}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {endpoint.description}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(`${baseUrl}${endpoint.url}`)}
                          data-testid={`copy-btn-${groupIndex}-${index}`}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline" 
                          onClick={() => openInNewTab(`${baseUrl}${endpoint.url}`)}
                          data-testid={`open-btn-${groupIndex}-${index}`}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <code className="text-xs font-mono text-blue-600 dark:text-blue-400 break-all" data-testid={`endpoint-url-${groupIndex}-${index}`}>
                      {baseUrl}{endpoint.url}
                    </code>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            💡 Usage Tips
          </h3>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>• <strong>Copy Button:</strong> Copies the full URL to your clipboard</p>
            <p>• <strong>Open Button:</strong> Opens the endpoint in a new tab</p>
            <p>• <strong>Date Filtering:</strong> Use fromDate=YYYY-MM-DD and toDate=YYYY-MM-DD</p>
            <p>• <strong>Pagination:</strong> Use page=1&limit=100 for paginated results</p>
            <p>• <strong>Filters:</strong> Add specific filters like type=storage or category=upgrade</p>
          </div>
        </div>
      </div>
    </div>
  );
}