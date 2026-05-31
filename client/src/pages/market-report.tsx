import { useState, useEffect } from 'react';
import { useSearch } from 'wouter';
import { ArrowLeft, CheckCircle, MapPin, School, FileText, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';

interface ReportData {
  address: string;
  city: string;
  generatedAt: string;
  linz: {
    verified: boolean;
    titleNumber: string;
    titleType: string;
    titleStatus: string;
    legalDescription: string;
  };
  nearbySchools: any[];
  nearbyMarket: any[];
  manualChecklist: string[];
}

export default function MarketReport() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const params = new URLSearchParams(search);
  const address = params.get('address');
  const city = params.get('city');

  useEffect(() => {
    if (!address || !city) return;

    fetch(`/api/market/report?address=${encodeURIComponent(address)}&city=${encodeURIComponent(city)}`)
      .then(res => res.json())
      .then(data => {
        setReport(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching report:', err);
        setLoading(false);
      });
  }, [address, city]);

  if (loading) {
    return (
      <div className="max-w-sm mx-auto h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 dark:text-gray-300">Generating report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-sm mx-auto h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">Report not found</p>
          <button
            onClick={() => setLocation('/')}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation('/')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">{report.address}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">{report.city}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 pb-8">
        {/* LINZ Title Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3 mb-4">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Land Title Information</h2>
          </div>

          <div className="space-y-3">
            {report.linz.verified && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium text-sm">
                <CheckCircle className="w-4 h-4" />
                Verified with LINZ
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Title Number</label>
              <p className="text-sm text-gray-900 dark:text-white font-mono font-bold">{report.linz.titleNumber}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Type</label>
                <p className="text-sm text-gray-900 dark:text-white font-semibold">{report.linz.titleType}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Status</label>
                <p className="text-sm text-gray-900 dark:text-white font-semibold">{report.linz.titleStatus}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Nearby Schools */}
        {report.nearbySchools && report.nearbySchools.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3 mb-4">
              <School className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nearby Schools</h2>
            </div>
            <div className="space-y-2">
              {report.nearbySchools.map((school, idx) => (
                <div key={idx} className="text-sm text-gray-700 dark:text-gray-300 pb-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <p className="font-semibold text-gray-900 dark:text-white">{school.name}</p>
                  {school.distance && <p className="text-xs text-gray-600 dark:text-gray-400">{school.distance}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DIY Checklist */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">DIY Buyer Checklist</h2>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">Things to do before making an offer:</p>
          <div className="space-y-3">
            {report.manualChecklist.map((item, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-300">{idx + 1}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Generated Info */}
        <div className="text-xs text-gray-600 dark:text-gray-400 text-center pb-4">
          <p>Report generated {new Date(report.generatedAt).toLocaleDateString()}</p>
          <p>Data from Land Information New Zealand</p>
        </div>
      </div>
    </div>
  );
}
