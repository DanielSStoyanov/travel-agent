import { useState } from 'react';
import { Award, ChevronRight, Plane, Hotel } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function ResultsPanel({ recommendations }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!recommendations?.recommendations?.length) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500">No recommendations found. Try adjusting your search criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recommendation Cards */}
      <div className="space-y-3">
        {recommendations.recommendations.map((rec, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedIndex(idx)}
            className={`card cursor-pointer transition-all ${
              selectedIndex === idx
                ? 'ring-2 ring-primary-500 shadow-md'
                : 'hover:shadow-md'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Rank Badge */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                idx === 1 ? 'bg-gray-100 text-gray-600' :
                idx === 2 ? 'bg-orange-100 text-orange-700' :
                'bg-gray-50 text-gray-500'
              }`}>
                {idx === 0 ? <Award className="w-5 h-5" /> : `#${idx + 1}`}
              </div>

              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {rec.bestFor || 'Recommended Option'}
                  </h3>
                  <div className="text-lg font-bold text-primary-600">
                    ${rec.totalPrice?.toFixed(0) || 'N/A'}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {/* Flight Info */}
                  {rec.flight && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Plane className="w-4 h-4 text-gray-400" />
                      <span>
                        {rec.flight.validatingCarrier} •
                        {rec.flight.outbound.stops === 0 ? ' Direct' : ` ${rec.flight.outbound.stops} stop(s)`}
                      </span>
                    </div>
                  )}

                  {/* Hotel Info */}
                  {rec.hotel && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Hotel className="w-4 h-4 text-gray-400" />
                      <span className="truncate">
                        {rec.hotel.name}
                        {rec.hotel.rating && (
                          <span className="ml-1 text-yellow-500">
                            {'★'.repeat(parseInt(rec.hotel.rating))}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Pros/Cons Preview */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {rec.pros?.slice(0, 2).map((pro, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
                      {pro}
                    </span>
                  ))}
                </div>
              </div>

              <ChevronRight className={`w-5 h-5 transition-transform ${
                selectedIndex === idx ? 'text-primary-500 rotate-90' : 'text-gray-300'
              }`} />
            </div>

            {/* Expanded Details */}
            {selectedIndex === idx && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-gray-600 mb-4">{rec.reasoning}</p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Flight Details */}
                  {rec.flight && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <Plane className="w-4 h-4" /> Flight Details
                      </h4>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-gray-500">Outbound:</span>{' '}
                          {format(parseISO(rec.flight.outbound.departure.time), 'MMM d, HH:mm')}
                        </p>
                        <p>
                          <span className="text-gray-500">Duration:</span>{' '}
                          {rec.flight.outbound.duration}
                        </p>
                        <p>
                          <span className="text-gray-500">Price:</span>{' '}
                          ${rec.flight.price.total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Hotel Details */}
                  {rec.hotel && rec.hotel.offers?.[0] && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <Hotel className="w-4 h-4" /> Hotel Details
                      </h4>
                      <div className="text-sm space-y-1">
                        <p className="font-medium">{rec.hotel.name}</p>
                        <p>
                          <span className="text-gray-500">Room:</span>{' '}
                          {rec.hotel.offers[0].roomType || 'Standard'}
                        </p>
                        <p>
                          <span className="text-gray-500">Price:</span>{' '}
                          ${rec.hotel.offers[0].price.total.toFixed(2)} total
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pros and Cons */}
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <h4 className="font-medium text-green-700 mb-2">Advantages</h4>
                    <ul className="text-sm space-y-1">
                      {rec.pros?.map((pro, i) => (
                        <li key={i} className="text-gray-600">{pro}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">Considerations</h4>
                    <ul className="text-sm space-y-1">
                      {rec.cons?.map((con, i) => (
                        <li key={i} className="text-gray-600">{con}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Meta Info */}
      <div className="text-xs text-gray-400 text-center">
        Analyzed {recommendations.meta?.flightsAnalyzed} flights and {recommendations.meta?.hotelsAnalyzed} hotels
        {recommendations.meta?.webSearchesUsed > 0 && ` • Enhanced with ${recommendations.meta.webSearchesUsed} web searches`}
      </div>
    </div>
  );
}
