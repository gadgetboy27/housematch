import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Mail, Phone, MapPin, BadgeCheck, Clock, XCircle, DollarSign, AlertCircle } from "lucide-react";

export default function PartnerProfile() {
  const { data: authStatus } = useQuery({
    queryKey: ["/partner/auth/status"],
  });

  const partner = authStatus?.user;

  if (!partner) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const getVerificationIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <BadgeCheck className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getVerificationText = (status: string) => {
    switch (status) {
      case 'verified':
        return { title: 'Verified Partner', desc: 'Your account is approved and active', variant: 'success' as const };
      case 'rejected':
        return { title: 'Verification Rejected', desc: partner.verificationNotes || 'Contact support for details', variant: 'destructive' as const };
      default:
        return { title: 'Pending Verification', desc: 'Your application is under review', variant: 'warning' as const };
    }
  };

  const verificationInfo = getVerificationText(partner.verificationStatus || 'pending');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-profile-title">
            Partner Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your business information and verification status
          </p>
        </div>

        {/* Verification Status */}
        <Card className={
          partner.verificationStatus === 'verified' ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950' :
          partner.verificationStatus === 'rejected' ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950' :
          'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950'
        } data-testid="card-verification-status">
          <CardHeader>
            <div className="flex items-center gap-3">
              {getVerificationIcon(partner.verificationStatus || 'pending')}
              <div>
                <CardTitle>{verificationInfo.title}</CardTitle>
                <CardDescription className={
                  partner.verificationStatus === 'verified' ? 'text-green-800 dark:text-green-200' :
                  partner.verificationStatus === 'rejected' ? 'text-red-800 dark:text-red-200' :
                  'text-yellow-800 dark:text-yellow-200'
                }>
                  {verificationInfo.desc}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          {partner.verificationStatus === 'verified' && partner.verifiedAt && (
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Verified on {new Date(partner.verifiedAt).toLocaleDateString()}
              </p>
            </CardContent>
          )}
        </Card>

        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Your registered business details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Company Name</p>
                  <p className="text-gray-900 dark:text-white" data-testid="text-company-name">{partner.companyName || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</p>
                  <p className="text-gray-900 dark:text-white" data-testid="text-email">{partner.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</p>
                  <p className="text-gray-900 dark:text-white">{partner.phone || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Business Address</p>
                  <p className="text-gray-900 dark:text-white">{partner.businessAddress || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Service Types</p>
              <div className="flex flex-wrap gap-2">
                {partner.serviceTypes?.map((service: string) => (
                  <Badge key={service} variant="secondary" data-testid={`badge-service-${service}`}>
                    {service.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Regions Served</p>
              <div className="flex flex-wrap gap-2">
                {partner.regions?.map((region: string) => (
                  <Badge key={region} variant="outline" data-testid={`badge-region-${region}`}>
                    {region}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Information
            </CardTitle>
            <CardDescription>Bank details for receiving payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {partner.bankAccountName || partner.bankAccountNumber ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Name</p>
                  <p className="text-gray-900 dark:text-white" data-testid="text-bank-account-name">
                    {partner.bankAccountName || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Number</p>
                  <p className="text-gray-900 dark:text-white font-mono" data-testid="text-bank-account-number">
                    {partner.bankAccountNumber || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Commission Rate</p>
                  <p className="text-gray-900 dark:text-white">
                    {partner.commissionRate || '10'}% per transaction
                  </p>
                </div>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No payment information on file. Contact admin to add your bank details for receiving payments.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>Your service history and ratings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-total-jobs-completed">
                  {partner.totalJobsCompleted || 0}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Average Rating</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-partner-rating">
                  {partner.averageRating ? parseFloat(partner.averageRating).toFixed(1) : 'N/A'}
                  {partner.averageRating && <span className="text-sm text-gray-500"> / 5.0</span>}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Earnings</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-partner-earnings">
                  ${((partner.totalEarnings || 0) / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
