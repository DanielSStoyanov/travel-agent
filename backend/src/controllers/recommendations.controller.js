import { searchApiService } from '../services/search.service.js';
import { openaiService } from '../services/openai.service.js';

export async function getRecommendations(req, res, next) {
  try {
    const {
      origin,
      destination,
      // New date range parameters
      periodStart,
      periodEnd,
      tripDuration = 7,
      // Legacy specific date support
      departureDate,
      returnDate,
      adults = 1,
      budget,
      priorities = [],
      travelStyle,
      interests = [],
      preferences = {}
    } = req.body;

    // Validation
    if (!origin || !destination) {
      return res.status(400).json({
        error: 'Missing required parameters: origin and destination'
      });
    }

    // Determine if using date range or specific dates
    const useDateRange = periodStart && periodEnd;

    if (!useDateRange && !departureDate) {
      return res.status(400).json({
        error: 'Please provide either a date range (periodStart, periodEnd) or specific departureDate'
      });
    }

    let flights = [];
    let bestDeal = null;
    let priceByDate = {};
    let searchDates = {};

    if (useDateRange) {
      // NEW FLOW: Search across date range to find best deals
      console.log(`[Recommendations] Searching flights in range: ${periodStart} to ${periodEnd}`);

      const rangeResults = await searchApiService.searchFlightsInRange({
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        startDate: periodStart,
        endDate: periodEnd,
        tripDuration: parseInt(tripDuration),
        adults: parseInt(adults)
      });

      flights = rangeResults.flights;
      bestDeal = rangeResults.bestDeal;
      priceByDate = rangeResults.priceByDate;

      // Calculate optimal dates based on best deals
      if (bestDeal) {
        const bestDate = bestDeal.searchDate || bestDeal.outbound?.departure?.time?.split('T')[0];
        searchDates = {
          recommended: bestDate,
          departureDate: bestDate,
          returnDate: new Date(new Date(bestDate).getTime() + tripDuration * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };
      }
    } else {
      // LEGACY FLOW: Specific dates
      console.log('[Recommendations] Fetching flights for specific dates...');
      flights = await searchApiService.searchFlights({
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        departureDate,
        returnDate,
        adults: parseInt(adults)
      });
      searchDates = { departureDate, returnDate };
    }

    // Step 2: Fetch hotels for the destination
    console.log('[Recommendations] Fetching hotels...');
    let hotels = [];

    try {
      const checkIn = searchDates.departureDate || searchDates.recommended || periodStart;
      const checkOut = searchDates.returnDate ||
        new Date(new Date(checkIn).getTime() + tripDuration * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get city name from destination code
      const cityName = searchApiService.getCityNameFromCode(destination.toUpperCase()) || destination;

      hotels = await searchApiService.searchHotels({
        destination: cityName,
        cityCode: destination.toUpperCase(),
        checkIn,
        checkOut,
        adults: parseInt(adults)
      });
    } catch (err) {
      console.error('Hotel search error:', err.message);
    }

    // Step 3: Determine if we need web enrichment
    let webSearchResults = null;
    const remainingSearches = searchApiService.getRemainingSearches();

    if (remainingSearches > 0 && openaiService) {
      try {
        const smartQueries = await openaiService.buildSmartSearchQueries({
          destination,
          checkIn: searchDates.departureDate || periodStart,
          checkOut: searchDates.returnDate || periodEnd,
          budget,
          travelStyle,
          interests,
          remainingSearches
        });

        if (smartQueries.length > 0) {
          console.log('[Recommendations] Performing web searches:', smartQueries);
          webSearchResults = [];
          for (const query of smartQueries.slice(0, 2)) {
            try {
              const result = await searchApiService.webSearch(query);
              webSearchResults.push({ query, results: result });
            } catch (err) {
              console.error('Web search error:', err.message);
            }
          }
        }
      } catch (err) {
        console.error('Smart query error:', err.message);
      }
    }

    // Step 4: AI Analysis
    console.log('[Recommendations] Running AI analysis...');
    let analysis = { recommendations: [], insights: {}, summary: '' };

    try {
      analysis = await openaiService.analyzeAndRecommend({
        flights: flights.slice(0, 30), // Limit to avoid token limits
        hotels: hotels.slice(0, 20),
        webSearchResults,
        searchContext: {
          origin,
          destination,
          periodStart,
          periodEnd,
          tripDuration,
          departureDate: searchDates.departureDate || searchDates.recommended,
          returnDate: searchDates.returnDate,
          adults,
          budget,
          priorities,
          useDateRange
        },
        preferences,
        bestDeal,
        priceByDate
      });
    } catch (err) {
      console.error('AI analysis error:', err.message);
      // Provide fallback recommendations if AI fails
      analysis = {
        recommendations: flights.slice(0, 5).map((flight, index) => ({
          rank: index + 1,
          flightId: flight.id,
          hotelId: hotels[0]?.id || null,
          totalPrice: flight.price.total + (hotels[0]?.offers?.[0]?.price?.total || 0),
          valueScore: 70 - (index * 5),
          reasoning: `Flight option ${index + 1} - ${flight.price.currency} ${flight.price.total}`,
          pros: ['Direct booking available'],
          cons: ['AI analysis unavailable'],
          bestFor: 'General travelers',
          suggestedDates: searchDates
        })),
        insights: {
          priceAnalysis: `Found ${flights.length} flight options. Prices range from ${flights.length > 0 ? Math.min(...flights.map(f => f.price.total)) : 'N/A'} to ${flights.length > 0 ? Math.max(...flights.map(f => f.price.total)) : 'N/A'}.`,
          timingAdvice: useDateRange ? `Best prices found around ${bestDeal?.searchDate || 'various dates'} within your selected period.` : 'Book early for best prices.',
          warnings: []
        },
        summary: `Found ${flights.length} flights and ${hotels.length} hotels for your trip to ${destination}.`
      };
    }

    // Step 5: Enrich recommendations with full data
    const enrichedRecommendations = analysis.recommendations.map(rec => {
      const flight = flights.find(f => f.id === rec.flightId);
      const hotel = hotels.find(h => h.id === rec.hotelId);

      return {
        ...rec,
        flight: flight || null,
        hotel: hotel || null,
        suggestedDates: rec.suggestedDates || searchDates
      };
    });

    res.json({
      recommendations: enrichedRecommendations,
      insights: analysis.insights,
      summary: analysis.summary,
      searchPeriod: useDateRange ? { start: periodStart, end: periodEnd, tripDuration } : null,
      bestDeal: bestDeal ? {
        date: bestDeal.searchDate,
        price: bestDeal.price,
        flight: bestDeal
      } : null,
      priceByDate: Object.keys(priceByDate).length > 0 ? priceByDate : null,
      meta: {
        flightsAnalyzed: flights.length,
        hotelsAnalyzed: hotels.length,
        webSearchesUsed: webSearchResults?.length || 0,
        remainingSearches: searchApiService.getRemainingSearches(),
        generatedAt: new Date().toISOString(),
        searchMode: useDateRange ? 'date_range' : 'specific_dates'
      }
    });
  } catch (error) {
    console.error('[Recommendations] Error:', error);
    next(error);
  }
}

export async function generatePlan(req, res, next) {
  try {
    const { recommendation, destination } = req.body;

    if (!recommendation) {
      return res.status(400).json({ error: 'Missing recommendation data' });
    }

    // Get destination info
    let destinationInfo = null;
    if (searchApiService.getRemainingSearches() > 0) {
      try {
        destinationInfo = await searchApiService.searchDestinationInfo(destination);
      } catch (err) {
        console.error('Destination info error:', err.message);
      }
    }

    // Generate detailed plan
    const plan = await openaiService.generateTravelPlan(recommendation, destinationInfo);

    res.json({
      plan,
      destination,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
}
