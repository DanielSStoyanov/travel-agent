import { searchApiService } from '../services/search.service.js';

export async function searchHotels(req, res, next) {
  try {
    const {
      cityCode,
      destination,
      checkIn,
      checkOut,
      adults = 2,
      rooms = 1,
      minRating,
      maxPrice,
      currency = 'USD'
    } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({
        error: 'Missing required parameters: checkIn, checkOut'
      });
    }

    if (!cityCode && !destination) {
      return res.status(400).json({
        error: 'Missing required parameter: cityCode or destination'
      });
    }

    // Search hotels using Google Hotels via SearchAPI
    let hotels = [];
    try {
      hotels = await searchApiService.searchHotels({
        cityCode: cityCode?.toUpperCase(),
        destination,
        checkIn,
        checkOut,
        adults: parseInt(adults),
        currency
      });
    } catch (err) {
      console.error('Hotel search error:', err.message);
    }

    // Filter and sort
    let filteredHotels = hotels;

    if (minRating) {
      filteredHotels = filteredHotels.filter(h =>
        h.rating && parseFloat(h.rating) >= parseFloat(minRating)
      );
    }

    if (maxPrice) {
      filteredHotels = filteredHotels.filter(h =>
        h.offers.some(o => o.price.total <= parseFloat(maxPrice))
      );
    }

    // Sort by rating (descending) then by price (ascending)
    filteredHotels.sort((a, b) => {
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      const priceA = a.offers[0]?.price.total || Infinity;
      const priceB = b.offers[0]?.price.total || Infinity;
      return priceA - priceB;
    });

    res.json({
      count: filteredHotels.length,
      hotels: filteredHotels,
      meta: {
        cityCode,
        destination,
        checkIn,
        checkOut,
        searchedAt: new Date().toISOString(),
        remainingSearches: searchApiService.getRemainingSearches()
      }
    });
  } catch (error) {
    next(error);
  }
}
