import { amadeusService } from '../services/amadeus.service.js';

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
      currencyCode = 'EUR'
    } = req.query;

    // Validation
    if (!origin || !destination || !departureDate) {
      return res.status(400).json({
        error: 'Missing required parameters: origin, destination, departureDate'
      });
    }

    const flights = await amadeusService.searchFlights({
      originLocationCode: origin.toUpperCase(),
      destinationLocationCode: destination.toUpperCase(),
      departureDate,
      returnDate,
      adults: parseInt(adults),
      travelClass,
      nonStop: nonStop === 'true',
      currencyCode
    });

    // Optional: filter by max price
    let filteredFlights = flights;
    if (maxPrice) {
      filteredFlights = flights.filter(f => f.price.total <= parseFloat(maxPrice));
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
        searchedAt: new Date().toISOString()
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
      adults = 1
    } = req.query;

    if (!origin || !destination || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required parameters'
      });
    }

    // Generate date range
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    // Fetch prices for each date (with rate limiting)
    const priceMatrix = [];
    for (const date of dates.slice(0, 14)) { // Limit to 14 days to avoid API rate limits
      try {
        const flights = await amadeusService.searchFlights({
          originLocationCode: origin.toUpperCase(),
          destinationLocationCode: destination.toUpperCase(),
          departureDate: date,
          adults: parseInt(adults),
          max: 5
        });

        const cheapest = flights.length > 0
          ? Math.min(...flights.map(f => f.price.total))
          : null;

        priceMatrix.push({
          date,
          cheapestPrice: cheapest,
          hasAvailability: flights.length > 0
        });
      } catch (err) {
        priceMatrix.push({
          date,
          cheapestPrice: null,
          hasAvailability: false,
          error: true
        });
      }
    }

    res.json({
      origin,
      destination,
      priceMatrix,
      cheapestDate: priceMatrix
        .filter(p => p.cheapestPrice)
        .sort((a, b) => a.cheapestPrice - b.cheapestPrice)[0]?.date
    });
  } catch (error) {
    next(error);
  }
}
