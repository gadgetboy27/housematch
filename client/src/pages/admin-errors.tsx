import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';
import { useState } from 'react';

export default function AdminErrors() {
  const [selectedError, setSelectedError] = useState<string | null>(null);

  // Fetch all errors
  const { data: errors, isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/errors'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch selected error details
  const { data: errorDetails } = useQuery<any>({
    queryKey: ['/api/admin/errors', selectedError],
    enabled: !!selectedError,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">Loading errors...</div>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'auto-fixable':
        return <CheckCircle className="w-4 h-4" />;
      case 'needs-review':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              🤖 AI Error Monitor
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Automated error analysis and fix suggestions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              <Zap className="w-3 h-3 mr-1" />
              {errors?.length || 0} errors tracked
            </Badge>
          </div>
        </div>

        {/* Error List */}
        <div className="grid gap-4">
          {!errors || errors.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-2xl font-bold mb-2">No Errors! 🎉</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Your application is running smoothly.
                </p>
              </CardContent>
            </Card>
          ) : (
            errors.map((error: any) => (
              <Card
                key={error.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedError(error.id)}
                data-testid={`error-card-${error.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getSeverityColor(error.severity)}>
                          {error.severity || 'unknown'}
                        </Badge>
                        {error.category && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getCategoryIcon(error.category)}
                            {error.category}
                          </Badge>
                        )}
                        <Badge variant="outline">{error.level}</Badge>
                      </div>
                      <CardTitle className="text-lg mb-2">
                        {error.message}
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {error.culprit || 'Unknown location'}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div>First: {new Date(error.firstSeen).toLocaleString()}</div>
                      <div>Last: {new Date(error.lastSeen).toLocaleString()}</div>
                      <div className="font-bold mt-1">
                        {error.eventCount} occurrence{error.eventCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {selectedError === error.id && errorDetails && (
                  <CardContent className="border-t pt-4">
                    {errorDetails.analysis ? (
                      <div className="space-y-4">
                        {/* AI Analysis */}
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            AI Analysis
                          </h4>
                          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <div className="text-sm text-gray-500">Business Impact</div>
                                <div className="font-semibold">
                                  {errorDetails.analysis.businessImpact || 'Unknown'}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-500">Affected Users</div>
                                <div className="font-semibold">
                                  {errorDetails.analysis.affectedUsers || 'Unknown'}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-500">Fix Type</div>
                                <div className="font-semibold">
                                  {errorDetails.analysis.fixType || 'Unknown'}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-500">Estimated Fix Time</div>
                                <div className="font-semibold">
                                  {errorDetails.analysis.estimatedFixTime || 'Unknown'} minutes
                                </div>
                              </div>
                            </div>
                            
                            {errorDetails.analysis.rootCause && (
                              <div className="mb-4">
                                <div className="text-sm text-gray-500 mb-1">Root Cause</div>
                                <div className="text-sm">{errorDetails.analysis.rootCause}</div>
                              </div>
                            )}
                            
                            {errorDetails.analysis.suggestedFix && (
                              <div className="mb-4">
                                <div className="text-sm text-gray-500 mb-1">Suggested Fix</div>
                                <div className="text-sm whitespace-pre-wrap">
                                  {errorDetails.analysis.suggestedFix}
                                </div>
                              </div>
                            )}
                            
                            {errorDetails.analysis.testSuggestions && (
                              <div>
                                <div className="text-sm text-gray-500 mb-1">Test Suggestions</div>
                                <div className="text-sm">{errorDetails.analysis.testSuggestions}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Full AI Response */}
                        <details>
                          <summary className="cursor-pointer font-semibold mb-2">
                            Full AI Analysis
                          </summary>
                          <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-xs overflow-auto max-h-96">
                            {errorDetails.analysis.analysis}
                          </pre>
                        </details>

                        {/* Stack Trace */}
                        <details>
                          <summary className="cursor-pointer font-semibold mb-2">
                            Stack Trace
                          </summary>
                          <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-xs overflow-auto max-h-96">
                            {JSON.stringify(errorDetails.error.stackTrace, null, 2)}
                          </pre>
                        </details>

                        {/* View in Sentry */}
                        {errorDetails.error.url && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => window.open(errorDetails.error.url, '_blank')}
                            data-testid="button-view-in-sentry"
                          >
                            View in Sentry →
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="w-12 h-12 mx-auto mb-2" />
                        <p>AI analysis pending...</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
