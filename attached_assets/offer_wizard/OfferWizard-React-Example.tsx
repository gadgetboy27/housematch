// HouseMatch Offer Wizard - React Component Example
// This is a complete example showing how to build the wizard frontend

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// ============================================================================
// TYPE IMPORTS (from offer-wizard-types.ts)
// ============================================================================

interface WizardStep1Data {
  propertyId: string;
  offerPrice: number;
  depositAmount: number;
  settlementDate: string;
}

interface WizardStep2Data {
  hasSolicitor: boolean;
  solicitorName?: string;
  solicitorFirm?: string;
  solicitorEmail?: string;
  solicitorPhone?: string;
  solicitorAddress?: string;
}

interface WizardStep3Data {
  conditions: Array<{
    conditionType: string;
    description: string;
    daysToSatisfy: number;
  }>;
}

interface WizardStep4Data {
  included: string[];
  excluded: string[];
}

// ============================================================================
// API SERVICE
// ============================================================================

class OfferAPI {
  static baseURL = '/api';

  static async createOffer(data: WizardStep1Data) {
    const response = await fetch(`${this.baseURL}/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  static async saveBuyerDetails(offerId: string, data: WizardStep2Data) {
    const response = await fetch(`${this.baseURL}/offers/${offerId}/buyer-details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  static async saveConditions(offerId: string, data: WizardStep3Data) {
    const response = await fetch(`${this.baseURL}/offers/${offerId}/conditions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  static async saveChattels(offerId: string, data: WizardStep4Data) {
    const response = await fetch(`${this.baseURL}/offers/${offerId}/chattels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  static async submitOffer(offerId: string) {
    const response = await fetch(`${this.baseURL}/offers/${offerId}/submit`, {
      method: 'POST',
    });
    return response.json();
  }

  static async getOffer(offerId: string) {
    const response = await fetch(`${this.baseURL}/offers/${offerId}`);
    return response.json();
  }

  static async getStandardChattels() {
    const response = await fetch(`${this.baseURL}/standard-chattels`);
    return response.json();
  }
}

// ============================================================================
// MAIN WIZARD COMPONENT
// ============================================================================

export default function OfferWizard({ propertyId, listingPrice }: { propertyId: string; listingPrice: number }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wizard data state
  const [step1Data, setStep1Data] = useState<WizardStep1Data>({
    propertyId,
    offerPrice: listingPrice,
    depositAmount: listingPrice * 0.1,
    settlementDate: '',
  });

  const [step2Data, setStep2Data] = useState<WizardStep2Data>({
    hasSolicitor: false,
  });

  const [step3Data, setStep3Data] = useState<WizardStep3Data>({
    conditions: [],
  });

  const [step4Data, setStep4Data] = useState<WizardStep4Data>({
    included: [],
    excluded: [],
  });

  // Progress indicator
  const steps = [
    { number: 1, title: 'Offer Details', icon: '💰' },
    { number: 2, title: 'Your Information', icon: '👤' },
    { number: 3, title: 'Conditions', icon: '📋' },
    { number: 4, title: 'Chattels', icon: '🏠' },
    { number: 5, title: 'Review & Submit', icon: '✅' },
  ];

  const nextStep = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (currentStep === 1) {
        // Create offer
        const result = await OfferAPI.createOffer(step1Data);
        if (result.success) {
          setOfferId(result.offer.id);
          setCurrentStep(2);
        } else {
          setError(result.error);
        }
      } else if (currentStep === 2) {
        // Save buyer details
        await OfferAPI.saveBuyerDetails(offerId!, step2Data);
        setCurrentStep(3);
      } else if (currentStep === 3) {
        // Save conditions
        await OfferAPI.saveConditions(offerId!, step3Data);
        setCurrentStep(4);
      } else if (currentStep === 4) {
        // Save chattels
        await OfferAPI.saveChattels(offerId!, step4Data);
        setCurrentStep(5);
      } else if (currentStep === 5) {
        // Submit offer
        const result = await OfferAPI.submitOffer(offerId!);
        if (result.success) {
          router.push(`/offers/${offerId}/success`);
        }
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col items-center flex-1">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                  step.number === currentStep
                    ? 'bg-blue-600 text-white'
                    : step.number < currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step.number < currentStep ? '✓' : step.icon}
              </div>
              <div className="text-sm mt-2 text-center">{step.title}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-gray-200 h-2 rounded-full">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        {currentStep === 1 && <Step1PropertyDetails data={step1Data} onChange={setStep1Data} listingPrice={listingPrice} />}
        {currentStep === 2 && <Step2BuyerInfo data={step2Data} onChange={setStep2Data} />}
        {currentStep === 3 && <Step3Conditions data={step3Data} onChange={setStep3Data} />}
        {currentStep === 4 && <Step4Chattels data={step4Data} onChange={setStep4Data} />}
        {currentStep === 5 && (
          <Step5Review step1={step1Data} step2={step2Data} step3={step3Data} step4={step4Data} />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50"
        >
          ← Previous
        </button>
        <button
          onClick={nextStep}
          disabled={isLoading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : currentStep === 5 ? 'Submit Offer 🚀' : 'Next →'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// STEP 1: PROPERTY DETAILS
// ============================================================================

function Step1PropertyDetails({
  data,
  onChange,
  listingPrice,
}: {
  data: WizardStep1Data;
  onChange: (data: WizardStep1Data) => void;
  listingPrice: number;
}) {
  const handlePriceChange = (price: number) => {
    onChange({
      ...data,
      offerPrice: price,
      depositAmount: price * 0.1, // Auto-calculate 10% deposit
    });
  };

  // Calculate minimum settlement date (30 days from now)
  const minSettlementDate = new Date();
  minSettlementDate.setDate(minSettlementDate.getDate() + 30);
  const minDate = minSettlementDate.toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Make Your Offer</h2>

      {/* Offer Price */}
      <div>
        <label className="block text-sm font-medium mb-2">Your Offer Price</label>
        <div className="relative">
          <span className="absolute left-3 top-3 text-gray-500">$</span>
          <input
            type="number"
            value={data.offerPrice}
            onChange={(e) => handlePriceChange(Number(e.target.value))}
            className="w-full pl-8 pr-4 py-3 border rounded-lg text-xl"
            step="1000"
          />
        </div>
        <p className="text-sm text-gray-500 mt-1">Listing price: ${listingPrice.toLocaleString()}</p>
      </div>

      {/* Deposit */}
      <div>
        <label className="block text-sm font-medium mb-2">Deposit Amount (typically 10%)</label>
        <div className="relative">
          <span className="absolute left-3 top-3 text-gray-500">$</span>
          <input
            type="number"
            value={data.depositAmount}
            onChange={(e) => onChange({ ...data, depositAmount: Number(e.target.value) })}
            className="w-full pl-8 pr-4 py-3 border rounded-lg"
            step="1000"
          />
        </div>
        <p className="text-sm text-gray-500 mt-1">
          10% of your offer: ${(data.offerPrice * 0.1).toLocaleString()}
        </p>
      </div>

      {/* Settlement Date */}
      <div>
        <label className="block text-sm font-medium mb-2">Preferred Settlement Date</label>
        <input
          type="date"
          value={data.settlementDate}
          onChange={(e) => onChange({ ...data, settlementDate: e.target.value })}
          min={minDate}
          className="w-full px-4 py-3 border rounded-lg"
        />
        <p className="text-sm text-gray-500 mt-1">Settlement typically occurs 30-90 days after offer acceptance</p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> Your offer should reflect the property's value, local market conditions, and any
          repairs needed. Consider getting a pre-purchase inspection before making your final offer.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// STEP 2: BUYER INFO
// ============================================================================

function Step2BuyerInfo({
  data,
  onChange,
}: {
  data: WizardStep2Data;
  onChange: (data: WizardStep2Data) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Your Legal Representative</h2>

      {/* Solicitor Checkbox */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <p className="text-sm text-yellow-800">
          ⚠️ <strong>Important:</strong> We strongly recommend engaging a solicitor or conveyancer for property
          purchases. They'll ensure all legal requirements are met and protect your interests.
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="hasSolicitor"
          checked={data.hasSolicitor}
          onChange={(e) => onChange({ ...data, hasSolicitor: e.target.checked })}
          className="w-5 h-5"
        />
        <label htmlFor="hasSolicitor" className="font-medium">
          I have a solicitor or conveyancer
        </label>
      </div>

      {/* Solicitor Details (conditional) */}
      {data.hasSolicitor ? (
        <div className="space-y-4 pl-7">
          <input
            type="text"
            placeholder="Solicitor's Name"
            value={data.solicitorName || ''}
            onChange={(e) => onChange({ ...data, solicitorName: e.target.value })}
            className="w-full px-4 py-3 border rounded-lg"
          />
          <input
            type="text"
            placeholder="Law Firm Name"
            value={data.solicitorFirm || ''}
            onChange={(e) => onChange({ ...data, solicitorFirm: e.target.value })}
            className="w-full px-4 py-3 border rounded-lg"
          />
          <input
            type="email"
            placeholder="Solicitor's Email"
            value={data.solicitorEmail || ''}
            onChange={(e) => onChange({ ...data, solicitorEmail: e.target.value })}
            className="w-full px-4 py-3 border rounded-lg"
          />
          <input
            type="tel"
            placeholder="Solicitor's Phone"
            value={data.solicitorPhone || ''}
            onChange={(e) => onChange({ ...data, solicitorPhone: e.target.value })}
            className="w-full px-4 py-3 border rounded-lg"
          />
          <textarea
            placeholder="Solicitor's Address"
            value={data.solicitorAddress || ''}
            onChange={(e) => onChange({ ...data, solicitorAddress: e.target.value })}
            className="w-full px-4 py-3 border rounded-lg"
            rows={3}
          />
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-sm text-blue-800 mb-3">
            <strong>Need a solicitor?</strong> We partner with trusted conveyancers who specialize in property law.
          </p>
          <button className="text-sm text-blue-600 hover:underline">View recommended solicitors →</button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STEP 3: CONDITIONS
// ============================================================================

function Step3Conditions({
  data,
  onChange,
}: {
  data: WizardStep3Data;
  onChange: (data: WizardStep3Data) => void;
}) {
  const standardConditions = [
    {
      type: 'finance',
      label: 'Finance Approval',
      description: 'Subject to buyer obtaining finance approval',
      defaultDays: 10,
      recommended: true,
    },
    {
      type: 'lim_report',
      label: 'LIM Report',
      description: 'Subject to buyer being satisfied with LIM report',
      defaultDays: 10,
      recommended: true,
    },
    {
      type: 'building_inspection',
      label: 'Building Inspection',
      description: 'Subject to buyer being satisfied with building inspection',
      defaultDays: 10,
      recommended: true,
    },
    {
      type: 'title_search',
      label: 'Title Search',
      description: 'Subject to buyer being satisfied with title search',
      defaultDays: 5,
      recommended: false,
    },
    {
      type: 'valuation',
      label: 'Valuation',
      description: 'Subject to property valuing at offer price',
      defaultDays: 10,
      recommended: false,
    },
  ];

  const toggleCondition = (condition: typeof standardConditions[0]) => {
    const exists = data.conditions.find((c) => c.conditionType === condition.type);
    if (exists) {
      // Remove
      onChange({
        conditions: data.conditions.filter((c) => c.conditionType !== condition.type),
      });
    } else {
      // Add
      onChange({
        conditions: [
          ...data.conditions,
          {
            conditionType: condition.type,
            description: condition.description,
            daysToSatisfy: condition.defaultDays,
          },
        ],
      });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Offer Conditions</h2>

      <p className="text-gray-600">
        Select conditions that must be satisfied before your offer becomes unconditional. These protect you by allowing
        you to withdraw if conditions aren't met.
      </p>

      <div className="space-y-3">
        {standardConditions.map((condition) => {
          const isSelected = data.conditions.find((c) => c.conditionType === condition.type);

          return (
            <div
              key={condition.type}
              className={`border rounded-lg p-4 cursor-pointer ${
                isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => toggleCondition(condition)}
            >
              <div className="flex items-start space-x-3">
                <input type="checkbox" checked={!!isSelected} readOnly className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <strong>{condition.label}</strong>
                    {condition.recommended && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Recommended</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{condition.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Typical timeframe: {condition.defaultDays} working days
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {data.conditions.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Warning:</strong> Making an unconditional offer means you're committed regardless of property
            condition or finance. We recommend including at least finance and inspection conditions.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STEP 4: CHATTELS
// ============================================================================

function Step4Chattels({ data, onChange }: { data: WizardStep4Data; onChange: (data: WizardStep4Data) => void }) {
  const [standardChattels, setStandardChattels] = useState<Record<string, any[]>>({});

  useEffect(() => {
    OfferAPI.getStandardChattels().then((result) => {
      if (result.success) {
        setStandardChattels(result.chattels);
        // Pre-select typical items
        const defaultIncluded = Object.values(result.chattels)
          .flat()
          .filter((c: any) => c.typically_included)
          .map((c: any) => c.description);
        onChange({ ...data, included: defaultIncluded });
      }
    });
  }, []);

  const toggleChattel = (description: string, list: 'included' | 'excluded') => {
    if (list === 'included') {
      if (data.included.includes(description)) {
        onChange({ ...data, included: data.included.filter((i) => i !== description) });
      } else {
        onChange({ ...data, included: [...data.included, description] });
      }
    } else {
      if (data.excluded.includes(description)) {
        onChange({ ...data, excluded: data.excluded.filter((i) => i !== description) });
      } else {
        onChange({ ...data, excluded: [...data.excluded, description] });
      }
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">What's Included?</h2>

      <p className="text-gray-600">
        Select which items are included or excluded in the sale. Chattels are items that aren't permanently fixed to
        the property.
      </p>

      <div className="grid grid-cols-2 gap-6">
        {/* Included */}
        <div>
          <h3 className="font-bold text-lg mb-3 text-green-700">✓ Included in Sale</h3>
          <div className="space-y-2">
            {Object.entries(standardChattels).map(([category, items]) => (
              <div key={category}>
                <p className="text-sm font-medium text-gray-500 mb-1">{category}</p>
                {items
                  .filter((item: any) => item.typically_included)
                  .map((item: any) => (
                    <label key={item.id} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={data.included.includes(item.description)}
                        onChange={() => toggleChattel(item.description, 'included')}
                      />
                      <span>{item.description}</span>
                    </label>
                  ))}
              </div>
            ))}
          </div>
        </div>

        {/* Excluded */}
        <div>
          <h3 className="font-bold text-lg mb-3 text-red-700">✗ Not Included</h3>
          <div className="space-y-2">
            {Object.entries(standardChattels).map(([category, items]) => (
              <div key={category}>
                {items.some((item: any) => !item.typically_included) && (
                  <>
                    <p className="text-sm font-medium text-gray-500 mb-1">{category}</p>
                    {items
                      .filter((item: any) => !item.typically_included)
                      .map((item: any) => (
                        <label key={item.id} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={data.excluded.includes(item.description)}
                            onChange={() => toggleChattel(item.description, 'excluded')}
                          />
                          <span>{item.description}</span>
                        </label>
                      ))}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STEP 5: REVIEW
// ============================================================================

function Step5Review({
  step1,
  step2,
  step3,
  step4,
}: {
  step1: WizardStep1Data;
  step2: WizardStep2Data;
  step3: WizardStep3Data;
  step4: WizardStep4Data;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Review Your Offer</h2>

      {/* Offer Summary */}
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Offer Price</p>
            <p className="text-2xl font-bold">${step1.offerPrice.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Deposit</p>
            <p className="text-2xl font-bold">${step1.depositAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Settlement Date</p>
            <p className="text-lg font-semibold">{new Date(step1.settlementDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Conditions</p>
            <p className="text-lg font-semibold">{step3.conditions.length} conditions</p>
          </div>
        </div>
      </div>

      {/* Solicitor Info */}
      {step2.hasSolicitor && (
        <div className="border rounded-lg p-4">
          <h3 className="font-bold mb-2">Your Solicitor</h3>
          <p>{step2.solicitorName}</p>
          <p className="text-sm text-gray-600">{step2.solicitorFirm}</p>
          <p className="text-sm text-gray-600">{step2.solicitorEmail}</p>
        </div>
      )}

      {/* Conditions */}
      <div className="border rounded-lg p-4">
        <h3 className="font-bold mb-2">Conditions ({step3.conditions.length})</h3>
        <ul className="space-y-2">
          {step3.conditions.map((condition, idx) => (
            <li key={idx} className="text-sm">
              • {condition.description} ({condition.daysToSatisfy} days)
            </li>
          ))}
        </ul>
      </div>

      {/* Chattels */}
      <div className="border rounded-lg p-4">
        <h3 className="font-bold mb-2">Chattels</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-green-700 mb-1">Included ({step4.included.length})</p>
            <ul className="text-sm space-y-1">
              {step4.included.map((item, idx) => (
                <li key={idx}>✓ {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-red-700 mb-1">Excluded ({step4.excluded.length})</p>
            <ul className="text-sm space-y-1">
              {step4.excluded.map((item, idx) => (
                <li key={idx}>✗ {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Cost Notice */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <p className="text-sm text-yellow-800">
          💰 <strong>ADLS Form Cost:</strong> $136.85 will be charged for the legal Agreement for Sale & Purchase
          document.
        </p>
      </div>

      {/* Legal Disclaimer */}
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
        <h3 className="font-bold mb-2">⚠️ Important Legal Notice</h3>
        <p className="text-sm text-gray-700 mb-3">
          By submitting this offer, you acknowledge that:
        </p>
        <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
          <li>This is a legally binding offer to purchase the property</li>
          <li>You have consulted (or will consult) a solicitor or conveyancer</li>
          <li>You understand the conditions and can meet the settlement date</li>
          <li>You have the financial means to complete the purchase</li>
        </ul>
      </div>
    </div>
  );
}
