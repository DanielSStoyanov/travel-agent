import { searchApiService } from '../services/search.service.js';

export async function searchFlights(req, res, next) {
  try {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      adults = 1,
      travelClass,
      nonStop,
      maxPrice,
      currencyCode = 'USD'
    } = req.query;

    // Validation
    if (!origin || !destination || !departureDate) {
      return res.status(400).json({
        error: 'Missing required parameters: origin, destination, departureDate'
      });
    }

    const flights = await searchApiService.searchFlights({
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departureDate,
      returnDate,
      adults: parseInt(adults),
      travelClass,
      currencyCode
    });

    // Optional: filter by max price
    let filteredFlights = flights;
    if (maxPrice) {
      filteredFlights = flights.filter(f => f.price.total <= parseFloat(maxPrice));
    }

    // Filter non-stop flights if requested
    if (nonStop === 'true') {
      filteredFlights = filteredFlights.filter(f => f.outbound?.stops === 0);
    }

    // Sort by price by default
    filteredFlights.sort((a, b) => a.price.total - b.price.total);

    res.json({
      count: filteredFlights.length,
      flights: filteredFlights,
      meta: {
        origin,
        destination,
        departureDate,
        returnDate,
        searchedAt: new Date().toISOString(),
        remainingSearches: searchApiService.getRemainingSearches()
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getFlightCalendar(req, res, next) {
  try {
    const {
      origin,
      destination,
      startDate,
      endDate,
      tripDuration,
      adults = 1
    } = req.query;

    if (!origin || !destination || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required parameters'
      });
    }

    // Use the range search method which is more API-efficient
    const rangeResults = await searchApiService.searchFlightsInRange({
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      startDate,
      endDate,
      tripDuration: tripDuration ? parseInt(tripDuration) : null,
      adults: parseInt(adults)
    });

    // Convert priceByDate to priceMatrix format
    const priceMatrix = Object.entries(rangeResults.priceByDate).map(([date, price]) => ({
      date,
      cheapestPrice: price,
      hasAvailability: true
    }));

    // Sort by date
    priceMatrix.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      origin,
      destination,
      priceMatrix,
      cheapestDate: priceMatrix
        .filter(p => p.cheapestPrice)
        .sort((a, b) => a.cheapestPrice - b.cheapestPrice)[0]?.date,
      bestDeal: rangeResults.bestDeal,
      meta: {
        searchedAt: new Date().toISOString(),
        remainingSearches: searchApiService.getRemainingSearches()
      }
    });
  } catch (error) {
    next(error);
  }
}
