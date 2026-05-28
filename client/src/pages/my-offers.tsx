import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { FileText, Home, Clock, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import { OfferWizard } from '@/components/OfferWizard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function MyOffers() {
  const [, navigate] = useLocation();
  const [resumePropertyId, setResumePropertyId] = useState<string | null>(null);
  const [viewingPdf, setViewingPdf] = useState<{ url: string; type: string; property: string; price: string } | null>(null);

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
  });

  // Fetch user's combined offers (Express Interest + Official ADLS)
  const { data: combinedOffersData, isLoading } = useQuery<{
    success: boolean;
    offers: any[];
    summary?: {
      total: number;
      expressInterest: number;
      makeOffer: number;
    };
  }>({
    queryKey: ['/api/user/offers'],
    enabled: !!user,
  });

  const offers = combinedOffersData?.offers || [];

  // Fetch properties for each offer (to show property details)
  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ['/api/properties'],
  });

  const getPropertyForOffer = (propertyId: string) => {
    return properties.find((p: any) => p.id === propertyId);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { icon: any; className: string; label: string }> = {
      draft: { icon: Clock, className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', label: 'Draft' },
      pending: { icon: AlertCircle, className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'Pending' },
      submitted: { icon: CheckCircle, className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Submitted' },
      accepted: { icon: CheckCircle, className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Accepted' },
      rejected: { icon: XCircle, className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Rejected' },
      conditional: { icon: FileText, className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', label: 'Conditional' },
      unconditional: { icon: CheckCircle, className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Unconditional' },
      withdrawn: { icon: XCircle, className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', label: 'Withdrawn' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">Loading your offers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="mb-4"
            data-testid="button-back-home"
          >
            ← Back to Properties
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-8 h-8" />
            My Property Offers
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View and manage all your property purchase offers
          </p>
        </div>

        {/* Summary Stats */}
        {combinedOffersData?.summary && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-blue-600">{combinedOffersData.summary.total}</div>
                <div className="text-sm text-gray-600 mt-1">Total Offers</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-purple-600">{combinedOffersData.summary.expressInterest}</div>
                <div className="text-sm text-gray-600 mt-1">Express Interest</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-green-600">{combinedOffersData.summary.makeOffer}</div>
                <div className="text-sm text-gray-600 mt-1">Official Offers</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Offers List */}
        {offers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No offers yet</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You haven't made any property offers yet
              </p>
              <Button onClick={() => navigate('/')} data-testid="button-browse-properties">
                Browse Properties
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {offers.map((offer: any) => {
              const property = getPropertyForOffer(offer.propertyId);
              const isExpressInterest = offer.type === 'express_interest';

              return (
                <Card key={offer.id} className="hover:shadow-lg transition-shadow" data-testid={`offer-card-${offer.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 flex-wrap">
                          <Home className="w-5 h-5" />
                          {property?.address || offer.propertyAddress || 'Property Details Unavailable'}
                          <Badge className={isExpressInterest 
                            ? "bg-purple-100 border border-purple-400 text-purple-800 text-xs"
                            : "bg-green-100 border border-green-400 text-green-800 text-xs"
                          }>
                            <FileText className="w-3 h-3 mr-1" />
                            {isExpressInterest ? 'Express Interest' : 'Official Offer'}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {property?.suburb && `${property.suburb} • `}
                          {isExpressInterest ? 'Non-binding' : 'ADLS-Compliant'} • ID: {offer.id.slice(0, 8)}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(offer.status)}
                        <span className="text-sm text-gray-500">
                          {offer.submittedAt || offer.createdAt
                            ? format(new Date(offer.submittedAt || offer.createdAt), 'dd MMM yyyy')
                            : 'Draft'}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isExpressInterest ? (
                      <>
                        {/* Express Interest Details */}
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mb-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Offer Price</p>
                              <p className="font-semibold text-lg">{offer.offerPrice}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Settlement</p>
                              <p className="font-semibold">{offer.settlementPeriod || 'Not specified'}</p>
                            </div>
                          </div>
                          <p className="text-xs text-purple-700 dark:text-purple-300 mt-3">
                            📧 PDF emailed to buyer and seller • Saved in your profile
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {offer.pdfUrl && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setViewingPdf({
                                url: offer.pdfUrl,
                                type: 'Express Interest',
                                property: property?.address || offer.propertyAddress || 'Property',
                                price: offer.offerPrice
                              })}
                              data-testid={`button-view-pdf-${offer.id}`}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View PDF
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/')}
                            data-testid={`button-view-property-${offer.id}`}
                          >
                            View Property
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Official Offer Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Offer Price</p>
                            <p className="font-semibold text-lg">{offer.offerPrice}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Deposit</p>
                            <p className="font-semibold">{offer.depositAmount}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Settlement Date</p>
                            <p className="font-semibold">
                              {offer.settlementDate ? format(new Date(offer.settlementDate), 'dd MMM yyyy') : 'TBD'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Wizard Step</p>
                            <p className="font-semibold">
                              {offer.wizardCompleted ? 'Completed ✓' : `Step ${offer.wizardStep}/5`}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 border-t pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/')}
                            data-testid={`button-view-property-${offer.id}`}
                          >
                            View Property
                          </Button>
                          {!offer.wizardCompleted && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setResumePropertyId(offer.propertyId)}
                              data-testid={`button-continue-offer-${offer.id}`}
                            >
                              Resume Offer (Step {offer.wizardStep}/5)
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Resume Offer Wizard */}
      {resumePropertyId && (
        <OfferWizard
          propertyId={resumePropertyId}
          onClose={() => setResumePropertyId(null)}
        />
      )}

      {/* PDF Viewer Modal */}
      {viewingPdf && (
        <Dialog open={!!viewingPdf} onOpenChange={() => setViewingPdf(null)}>
          <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 overflow-hidden" data-testid="modal-pdf-viewer">
            <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    {viewingPdf.type} Form
                  </DialogTitle>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Property:</strong> {viewingPdf.property}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Offer Price:</strong> {viewingPdf.price}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                      📧 This PDF was emailed to both buyer and seller upon submission
                    </p>
                  </div>
                </div>
              </div>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900">
              <iframe
                src={viewingPdf.url}
                className="w-full h-full border-0"
                title="Offer PDF Document"
                data-testid="iframe-pdf-viewer"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
