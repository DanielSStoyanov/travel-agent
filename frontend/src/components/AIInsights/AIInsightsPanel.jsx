import { Sparkles, TrendingUp, Clock, AlertTriangle, Lightbulb } from 'lucide-react';

// Helper to safely render values that might be objects or strings
function safeRender(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    // Handle {min, max} price range objects
    if (value.min !== undefined && value.max !== undefined) {
      return `$${value.min} - $${value.max}`;
    }
    // Try to stringify other objects
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export default function AIInsightsPanel({ insights, summary }) {
  if (!insights) return null;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="card bg-gradient-to-br from-primary-50 to-indigo-50 border-primary-100">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">AI Summary</h3>
            <p className="text-sm text-gray-700">{safeRender(summary)}</p>
          </div>
        </div>
      </div>

      {/* Price Analysis */}
      {insights.priceAnalysis && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <h4 className="font-medium text-gray-900">Price Analysis</h4>
          </div>
          <p className="text-sm text-gray-600">{safeRender(insights.priceAnalysis)}</p>
        </div>
      )}

      {/* Timing Advice */}
      {insights.timingAdvice && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-blue-600" />
            <h4 className="font-medium text-gray-900">Timing Advice</h4>
          </div>
          <p className="text-sm text-gray-600">{safeRender(insights.timingAdvice)}</p>
        </div>
      )}

      {/* Warnings */}
      {Array.isArray(insights.warnings) && insights.warnings.length > 0 && (
        <div className="card border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <h4 className="font-medium text-yellow-800">Things to Consider</h4>
          </div>
          <ul className="text-sm text-yellow-700 space-y-1">
            {insights.warnings.map((warning, i) => (
              <li key={i}>{safeRender(warning)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Alternative Suggestions */}
      {insights.alternativeSuggestions && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-purple-600" />
            <h4 className="font-medium text-gray-900">Worth Considering</h4>
          </div>
          <p className="text-sm text-gray-600">{safeRender(insights.alternativeSuggestions)}</p>
        </div>
      )}
    </div>
  );
}
