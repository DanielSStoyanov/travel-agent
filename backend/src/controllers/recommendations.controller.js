import { amadeusService } from '../services/amadeus.service.js';
import { searchApiService } from '../services/search.service.js';
import { openaiService } from '../services/openai.service.js';

export async function getRecommendations(req, res, next) {
  try {
    const {
      origin,
      destination,
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
    if (!origin || !destination || !departureDate) {
      return res.status(400).json({
        error: 'Missing required parameters'
      });
    }

    // Step 1: Fetch flights
    console.log('[Recommendations] Fetching flights...');
    const flights = await amadeusService.searchFlights({
      originLocationCode: origin.toUpperCase(),
      destinationLocationCode: destination.toUpperCase(),
      departureDate,
      returnDate,
      adults: parseInt(adults)
    });

    // Step 2: Fetch hotels
    console.log('[Recommendations] Fetching hotels...');
    let hotels = [];
    const hotelList = await amadeusService.searchHotelsByCity({
      cityCode: destination.toUpperCase()
    });

    if (hotelList.length > 0) {
      const hotelIds = hotelList.slice(0, 20).map(h => h.hotelId);
      try {
        hotels = await amadeusService.searchHotelOffers({
          hotelIds,
          checkInDate: departureDate,
          checkOutDate: returnDate || departureDate,
          adults: parseInt(adults)
        });
      } catch (err) {
        console.error('Hotel offers error:', err.message);
      }
    }

    // Step 3: Determine if we need web enrichment
    let webSearchResults = null;
    const remainingSearches = searchApiService.getRemainingSearches();

    if (remainingSearches > 0) {
      // Ask AI what to search for
      const smartQueries = await openaiService.buildSmartSearchQueries({
        destination,
        checkIn: departureDate,
        checkOut: returnDate,
        budget,
        travelStyle,
        interests,
        remainingSearches
      });

      // Execute searches
      if (smartQueries.length > 0) {
        console.log('[Recommendations] Performing web searches:', smartQueries);
        webSearchResults = [];
        for (const query of smartQueries.slice(0, 2)) { // Max 2 searches
          try {
            const result = await searchApiService.search(query);
            webSearchResults.push({ query, results: result });
          } catch (err) {
            console.error('Web search error:', err.message);
          }
        }
      }
    }

    // Step 4: AI Analysis
    console.log('[Recommendations] Running AI analysis...');
    const analysis = await openaiService.analyzeAndRecommend({
      flights,
      hotels,
      webSearchResults,
      searchContext: {
        origin,
        destination,
        departureDate,
        returnDate,
        adults,
        budget,
        priorities
      },
      preferences
    });

    // Step 5: Enrich recommendations with full data
    const enrichedRecommendations = analysis.recommendations.map(rec => {
      const flight = flights.find(f => f.id === rec.flightId);
      const hotel = hotels.find(h => h.id === rec.hotelId);

      return {
        ...rec,
        flight: flight || null,
        hotel: hotel || null
      };
    });

    res.json({
      recommendations: enrichedRecommendations,
      insights: analysis.insights,
      summary: analysis.summary,
      meta: {
        flightsAnalyzed: flights.length,
        hotelsAnalyzed: hotels.length,
        webSearchesUsed: webSearchResults?.length || 0,
        remainingSearches: searchApiService.getRemainingSearches(),
        generatedAt: new Date().toISOString()
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
      destinationInfo = await searchApiService.searchDestinationInfo(destination);
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
