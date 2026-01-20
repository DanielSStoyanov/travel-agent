import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchForm from './components/SearchForm/SearchForm';
import ResultsPanel from './components/Results/ResultsPanel';
import AIInsightsPanel from './components/AIInsights/AIInsightsPanel';
import { Plane, Sparkles } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const [searchParams, setSearchParams] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Plane className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">TravelAI Planner</h1>
              <p className="text-sm text-gray-500">AI-powered travel recommendations</p>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Search Form */}
          <section className="mb-8">
            <SearchForm
              onSearch={setSearchParams}
              onResults={setRecommendations}
              setIsLoading={setIsLoading}
            />
          </section>

          {/* Loading State */}
          {isLoading && (
            <div className="card flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">
                  <Sparkles className="inline w-4 h-4 mr-2" />
                  AI is analyzing your travel options...
                </p>
                <p className="text-sm text-gray-400 mt-2">This may take 15-30 seconds</p>
              </div>
            </div>
          )}

          {/* Results */}
          {!isLoading && recommendations && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ResultsPanel recommendations={recommendations} />
              </div>
              <div>
                <AIInsightsPanel insights={recommendations.insights} summary={recommendations.summary} />
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !recommendations && (
            <div className="card text-center py-16">
              <Plane className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Start Your Travel Search
              </h2>
              <p className="text-gray-500 max-w-md mx-auto">
                Enter your travel details above and our AI will find the best
                flight and hotel combinations for you.
              </p>
            </div>
          )}
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;
