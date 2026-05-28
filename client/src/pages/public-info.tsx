export default function PublicInfo() {
  return (
    <div className="min-h-screen bg-white p-8 max-w-4xl mx-auto">
      <div className="prose prose-lg mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          PropertyInsights Research - New Zealand Property Analysis Platform
        </h1>
        
        <div className="bg-blue-50 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">About Our Platform</h2>
          <p className="text-blue-800">
            PropertyInsights Research provides comprehensive market analysis and research tools 
            for New Zealand residential property buyers. Our platform aggregates property data 
            to deliver actionable insights for informed decision-making.
          </p>
        </div>

        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Core Services</h2>
        
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Market Research</h3>
            <p className="text-gray-700">
              Comprehensive analysis of property market trends, pricing patterns, 
              and demographic insights across New Zealand regions.
            </p>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Data Aggregation</h3>
            <p className="text-gray-700">
              Centralized collection and presentation of property listing data 
              from multiple sources for comparative analysis.
            </p>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Price Analytics</h3>
            <p className="text-gray-700">
              Statistical analysis of property valuations, price trends, and 
              market performance indicators.
            </p>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Location Intelligence</h3>
            <p className="text-gray-700">
              Geographic analysis of property markets including suburb comparisons 
              and regional performance metrics.
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Our Approach</h2>
        <p className="text-gray-700 mb-4">
          PropertyInsights Research focuses on delivering accurate, timely market intelligence 
          to support residential property purchase decisions. Our platform emphasizes data 
          transparency and analytical rigor to help buyers understand market dynamics.
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Data Sources & Compliance</h2>
        <p className="text-gray-700 mb-4">
          We integrate with authorized property listing APIs and public market data sources 
          in full compliance with data usage terms and conditions. All data access is 
          conducted through official channels with appropriate permissions.
        </p>

        <div className="bg-yellow-50 p-6 rounded-lg mb-8">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Research Focus</h3>
          <p className="text-yellow-700">
            This platform is designed for research and analysis purposes, providing 
            data visualization and comparative tools for property market intelligence.
          </p>
        </div>

        <footer className="border-t pt-6 mt-12 text-center text-gray-600">
          <p>PropertyInsights Research Ltd - New Zealand Property Market Analysis</p>
          <p className="text-sm mt-2">For research and educational purposes</p>
        </footer>
      </div>
    </div>
  );
}