import { amadeusService } from '../services/amadeus.service.js';
import { searchApiService } from '../services/search.service.js';

export async function searchHotels(req, res, next) {
  try {
    const {
      cityCode,
      checkIn,
      checkOut,
      adults = 1,
      rooms = 1,
      minRating,
      maxPrice,
      enrichWithWeb = 'false'
    } = req.query;

    if (!cityCode || !checkIn || !checkOut) {
      return res.status(400).json({
        error: 'Missing required parameters: cityCode, checkIn, checkOut'
      });
    }

    // Step 1: Get hotel list for the city
    const hotelList = await amadeusService.searchHotelsByCity({
      cityCode: cityCode.toUpperCase()
    });

    if (!hotelList || hotelList.length === 0) {
      return res.json({
        count: 0,
        hotels: [],
        message: 'No hotels found in this location'
      });
    }

    // Step 2: Get offers for top hotels
    const hotelIds = hotelList.slice(0, 20).map(h => h.hotelId);

    let hotels = [];
    try {
      hotels = await amadeusService.searchHotelOffers({
        hotelIds,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults: parseInt(adults),
        rooms: parseInt(rooms)
      });
    } catch (err) {
      // Amadeus hotel offers API can be unreliable
      console.error('Hotel offers error:', err.message);
    }

    // Step 3: Optionally enrich with web search data
    let webEnrichment = null;
    if (enrichWithWeb === 'true' && searchApiService.getRemainingSearches() > 0) {
      const cityName = hotelList[0]?.name || cityCode;
      webEnrichment = await searchApiService.searchHotels(
        cityName,
        checkIn,
        checkOut,
        { budget: maxPrice ? `under ${maxPrice}` : '' }
      );
    }

    // Filter and sort
    let filteredHotels = hotels;

    if (minRating) {
      filteredHotels = filteredHotels.filter(h =>
        h.rating && parseInt(h.rating) >= parseInt(minRating)
      );
    }

    if (maxPrice) {
      filteredHotels = filteredHotels.filter(h =>
        h.offers.some(o => o.price.total <= parseFloat(maxPrice))
      );
    }

    res.json({
      count: filteredHotels.length,
      hotels: filteredHotels,
      webEnrichment,
      meta: {
        cityCode,
        checkIn,
        checkOut,
        totalHotelsInCity: hotelList.length,
        searchedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
}
