import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, Mail } from "lucide-react";
import { Link } from "wouter";

const SUPPORT_EMAIL = "support@housematch.co.nz";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Card className="w-full max-w-md mx-4 shadow-lg">
        <CardContent className="pt-6 pb-8">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              404 - Page Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Sorry, the page you're looking for doesn't exist or has been moved.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Link href="/" className="flex-1">
                <Button className="w-full" variant="default" data-testid="button-home">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </Link>
              <Link href="/help" className="flex-1">
                <Button className="w-full" variant="outline" data-testid="button-help">
                  <Mail className="h-4 w-4 mr-2" />
                  Get Help
                </Button>
              </Link>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 w-full">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Something wrong? Contact support:
              </p>
              <a 
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                data-testid="link-support-email-404"
              >
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
