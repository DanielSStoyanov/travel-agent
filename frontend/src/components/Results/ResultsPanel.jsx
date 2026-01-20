import { useState } from 'react';
import { Award, ChevronRight, Plane, Hotel, Calendar, TrendingDown, Sparkles, ExternalLink, MapPin, Star, Clock } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

// Safe date formatter that handles various formats from different APIs
function safeFormatDate(dateStr, formatStr = 'MMM d') {
  if (!dateStr) return '';
  try {
    // Try parsing as ISO first
    const isoDate = parseISO(dateStr);
    if (isValid(isoDate)) {
      return format(isoDate, formatStr);
    }
    // Try as regular Date
    const date = new Date(dateStr);
    if (isValid(date)) {
      return format(date, formatStr);
    }
    // Return original string if not parseable (e.g., "10:30 AM")
    return dateStr;
  } catch {
    return dateStr;
  }
}

export default function ResultsPanel({ recommendations }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!recommendations?.recommendations?.length) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500">No recommendations found. Try adjusting your search criteria.</p>
      </div>
    );
  }

  const { bestDeal, priceByDate, searchPeriod, meta } = recommendations;

  return (
    <div className="space-y-4">
      {/* Best Deal Banner */}
      {bestDeal && (
        <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-800 mb-1">Best Deal Found!</h3>
              <p className="text-sm text-green-700">
                Cheapest flight on <strong>{bestDeal.date}</strong> at{' '}
                <strong>{bestDeal.price?.currency} {bestDeal.price?.total?.toFixed(0)}</strong>
              </p>
              {searchPeriod && (
                <p className="text-xs text-green-600 mt-1">
                  Searched {searchPeriod.tripDuration}-day trips from {searchPeriod.start} to {searchPeriod.end}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Price by Date Chart (simplified) */}
      {priceByDate && Object.keys(priceByDate).length > 1 && (
        <div className="card">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Price Comparison by Date
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(priceByDate).map(([date, price]) => {
              const isLowest = price === Math.min(...Object.values(priceByDate));
              return (
                <div
                  key={date}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    isLowest
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  <div className="text-xs opacity-75">{safeFormatDate(date, 'MMM d')}</div>
                  <div className="font-semibold">${price.toFixed(0)}</div>
                  {isLowest && <div className="text-xs text-green-600">Best</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

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

                {/* Suggested Dates */}
                {rec.suggestedDates?.departureDate && (
                  <div className="flex items-center gap-2 text-sm text-primary-600 mb-2">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {safeFormatDate(rec.suggestedDates.departureDate, 'MMM d')}
                      {rec.suggestedDates.returnDate && (
                        <> - {safeFormatDate(rec.suggestedDates.returnDate, 'MMM d')}</>
                      )}
                    </span>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {/* Flight Info */}
                  {rec.flight && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Plane className="w-4 h-4 text-gray-400" />
                      <span>
                        {rec.flight.validatingCarrier || rec.flight.outbound?.segments?.[0]?.carrier || 'Flight'} •
                        {rec.flight.outbound?.stops === 0 ? ' Direct' : ` ${rec.flight.outbound?.stops || 0} stop(s)`}
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

                {/* Value Score */}
                {rec.valueScore && (
                  <div className="mt-2 flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-purple-500 h-1.5 rounded-full"
                        style={{ width: `${rec.valueScore}%` }}
                      />
                    </div>
                    <span className="text-xs text-purple-600">{rec.valueScore}/100</span>
                  </div>
                )}

                {/* Pros Preview */}
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
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Plane className="w-4 h-4 text-blue-600" /> Flight Details
                      </h4>

                      {/* Flight Segments */}
                      <div className="space-y-3">
                        {rec.flight.outbound?.segments?.map((segment, segIdx) => (
                          <div key={segIdx} className="flex items-start gap-3 text-sm">
                            {segment.carrierLogo && (
                              <img src={segment.carrierLogo} alt={segment.carrier} className="w-8 h-8 rounded" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {segment.carrier} {segment.flightNumber}
                              </div>
                              <div className="text-gray-600">
                                {segment.departure?.airport} ({segment.departure?.time}) → {segment.arrival?.airport} ({segment.arrival?.time})
                              </div>
                              {segment.durationFormatted && (
                                <div className="text-gray-500 text-xs flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {segment.durationFormatted}
                                </div>
                              )}
                            </div>
                          </div>
                        )) || (
                          <div className="text-sm">
                            <p className="text-gray-600">
                              {rec.flight.outbound?.departure?.airport} → {rec.flight.outbound?.arrival?.airport}
                            </p>
                            {rec.flight.outbound?.departure?.time && (
                              <p className="text-gray-500">Departure: {safeFormatDate(rec.flight.outbound.departure.time, 'MMM d, HH:mm')}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Flight Summary */}
                      <div className="mt-3 pt-3 border-t border-blue-200 flex justify-between items-center">
                        <div>
                          <span className="text-gray-500 text-sm">Total:</span>
                          <span className="ml-2 font-bold text-lg text-blue-700">
                            {rec.flight.price?.currency} {rec.flight.price?.total?.toFixed(0)}
                          </span>
                        </div>
                        {rec.flight.outbound?.durationFormatted && (
                          <span className="text-sm text-gray-500">
                            {rec.flight.outbound.durationFormatted} • {rec.flight.outbound?.stops === 0 ? 'Direct' : `${rec.flight.outbound.stops} stop(s)`}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hotel Details */}
                  {rec.hotel && (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Hotel className="w-4 h-4 text-green-600" /> Hotel Details
                      </h4>

                      {/* Hotel Image */}
                      {rec.hotel.images?.[0] && (
                        <img
                          src={rec.hotel.images[0]}
                          alt={rec.hotel.name}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                      )}

                      <div className="space-y-2 text-sm">
                        <p className="font-semibold text-gray-900">{rec.hotel.name}</p>

                        {/* Rating */}
                        {(rec.hotel.rating || rec.hotel.starRating) && (
                          <div className="flex items-center gap-2">
                            {rec.hotel.starRating && (
                              <span className="text-yellow-500">
                                {'★'.repeat(rec.hotel.starRating)}
                              </span>
                            )}
                            {rec.hotel.rating && (
                              <span className="bg-green-600 text-white text-xs px-1.5 py-0.5 rounded">
                                {rec.hotel.rating}
                              </span>
                            )}
                            {rec.hotel.reviewCount > 0 && (
                              <span className="text-gray-500 text-xs">({rec.hotel.reviewCount} reviews)</span>
                            )}
                          </div>
                        )}

                        {/* Location */}
                        {rec.hotel.location?.address && (
                          <div className="flex items-start gap-1 text-gray-600">
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{rec.hotel.location.address}</span>
                          </div>
                        )}

                        {/* Amenities */}
                        {rec.hotel.amenities?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {rec.hotel.amenities.slice(0, 4).map((amenity, i) => (
                              <span key={i} className="text-xs bg-white px-2 py-0.5 rounded border border-green-200">
                                {amenity}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Hotel Price & Link */}
                      <div className="mt-3 pt-3 border-t border-green-200">
                        {rec.hotel.offers?.[0] && (
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-gray-500 text-sm">Total:</span>
                              <span className="ml-2 font-bold text-lg text-green-700">
                                {rec.hotel.offers[0].price?.currency} {rec.hotel.offers[0].price?.total?.toFixed(0)}
                              </span>
                              {rec.hotel.offers[0].price?.perNight && (
                                <span className="text-xs text-gray-500 ml-1">
                                  (${rec.hotel.offers[0].price.perNight.toFixed(0)}/night)
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {rec.hotel.link && (
                          <a
                            href={rec.hotel.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-sm text-green-700 hover:text-green-800 font-medium"
                          >
                            View on Google Hotels <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
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
                        <li key={i} className="text-gray-600 flex items-start gap-1">
                          <span className="text-green-500">+</span> {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">Considerations</h4>
                    <ul className="text-sm space-y-1">
                      {rec.cons?.map((con, i) => (
                        <li key={i} className="text-gray-600 flex items-start gap-1">
                          <span className="text-red-500">-</span> {con}
                        </li>
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
        Analyzed {meta?.flightsAnalyzed || 0} flights and {meta?.hotelsAnalyzed || 0} hotels
        {meta?.webSearchesUsed > 0 && ` • Enhanced with ${meta.webSearchesUsed} web searches`}
        {meta?.searchMode === 'date_range' && ' • Date range search'}
      </div>
    </div>
  );
}
