import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle, AlertTriangle, Building2, MapPin, Shield } from "lucide-react";

interface LIMInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LIMInfoModal({ isOpen, onClose }: LIMInfoModalProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="modal-lim-info">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <FileText className="w-6 h-6 text-purple-600" />
            What's in a LIM Report?
          </DialogTitle>
          <DialogDescription>
            A Land Information Memorandum (LIM) is an official council document containing all information about a property that's held by the council.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Summary Card */}
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-600 rounded-lg shrink-0">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Essential for Property Purchase</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    A LIM is a critical due diligence document that reveals council-held information about a property. It's required by most lawyers and banks before settlement.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What's Included Section */}
          <div>
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              What's Included in a LIM Report
            </h3>
            
            <div className="grid gap-4">
              {/* Building & Resource Consents */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium mb-2">Building & Resource Consents</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-1">•</span>
                          <span>All building consents issued for the property</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-1">•</span>
                          <span>Code compliance certificates (CCCs)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-1">•</span>
                          <span>Resource consents and land use approvals</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-1">•</span>
                          <span>Outstanding or incomplete building work</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Zoning & District Plan */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium mb-2">Zoning & District Plan Information</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-purple-600 mt-1">•</span>
                          <span>Property zoning classification (residential, commercial, etc.)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-600 mt-1">•</span>
                          <span>District plan rules and restrictions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-600 mt-1">•</span>
                          <span>Height limits, site coverage, and setback requirements</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-600 mt-1">•</span>
                          <span>Heritage or conservation area designations</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Natural Hazards */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium mb-2">Natural Hazards & Risks</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-orange-600 mt-1">•</span>
                          <span>Flooding risk and flood zones</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-600 mt-1">•</span>
                          <span>Earthquake/liquefaction zones (esp. Christchurch, Wellington)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-600 mt-1">•</span>
                          <span>Land instability and slope hazards</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-600 mt-1">•</span>
                          <span>Coastal erosion risks</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Rates & Services */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium mb-2">Rates & Services</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
                          <span>Current rates and any arrears</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
                          <span>Water, wastewater, and stormwater connections</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
                          <span>Utility services availability</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
                          <span>Special charges or targeted rates</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Important Notes */}
          <Card className="border-l-4 border-l-blue-600">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                Important to Know
              </h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">→</span>
                  <span><strong>Standard LIM:</strong> 10 working days delivery</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">→</span>
                  <span><strong>Fast Track LIM:</strong> 3-5 working days (premium pricing)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">→</span>
                  <span><strong>Cancellation fee:</strong> $65 applies if you cancel after ordering</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">→</span>
                  <span><strong>Valid for 3 months:</strong> LIM reports are only valid for 3 months from issue date</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold text-lg mb-2">Ready to Order Your LIM?</h3>
              <p className="text-white/90 text-sm mb-4">
                We handle the entire process - from ordering to delivery. Get your official council LIM report with 30% premium service markup.
              </p>
              <button
                onClick={onClose}
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                data-testid="button-close-lim-info"
              >
                Got it, thanks!
              </button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
