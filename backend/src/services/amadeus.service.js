import axios from 'axios';
import { config } from '../config/index.js';
import { getCached, setCache, isCacheReady } from './cache.service.js';

// Popular airports for demo/fallback
const POPULAR_LOCATIONS = [
  { code: 'JFK', name: 'John F Kennedy Intl', cityName: 'New York', countryCode: 'US', type: 'AIRPORT' },
  { code: 'LAX', name: 'Los Angeles Intl', cityName: 'Los Angeles', countryCode: 'US', type: 'AIRPORT' },
  { code: 'LHR', name: 'Heathrow', cityName: 'London', countryCode: 'GB', type: 'AIRPORT' },
  { code: 'CDG', name: 'Charles de Gaulle', cityName: 'Paris', countryCode: 'FR', type: 'AIRPORT' },
  { code: 'FRA', name: 'Frankfurt Airport', cityName: 'Frankfurt', countryCode: 'DE', type: 'AIRPORT' },
  { code: 'AMS', name: 'Schiphol', cityName: 'Amsterdam', countryCode: 'NL', type: 'AIRPORT' },
  { code: 'BCN', name: 'El Prat', cityName: 'Barcelona', countryCode: 'ES', type: 'AIRPORT' },
  { code: 'FCO', name: 'Fiumicino', cityName: 'Rome', countryCode: 'IT', type: 'AIRPORT' },
  { code: 'DXB', name: 'Dubai Intl', cityName: 'Dubai', countryCode: 'AE', type: 'AIRPORT' },
  { code: 'SIN', name: 'Changi', cityName: 'Singapore', countryCode: 'SG', type: 'AIRPORT' },
  { code: 'HND', name: 'Haneda', cityName: 'Tokyo', countryCode: 'JP', type: 'AIRPORT' },
  { code: 'NRT', name: 'Narita', cityName: 'Tokyo', countryCode: 'JP', type: 'AIRPORT' },
  { code: 'SYD', name: 'Sydney Kingsford Smith', cityName: 'Sydney', countryCode: 'AU', type: 'AIRPORT' },
  { code: 'IST', name: 'Istanbul Airport', cityName: 'Istanbul', countryCode: 'TR', type: 'AIRPORT' },
  { code: 'MUC', name: 'Munich Airport', cityName: 'Munich', countryCode: 'DE', type: 'AIRPORT' },
  { code: 'VIE', name: 'Vienna Intl', cityName: 'Vienna', countryCode: 'AT', type: 'AIRPORT' },
  { code: 'ZRH', name: 'Zurich Airport', cityName: 'Zurich', countryCode: 'CH', type: 'AIRPORT' },
  { code: 'MAD', name: 'Barajas', cityName: 'Madrid', countryCode: 'ES', type: 'AIRPORT' },
  { code: 'LIS', name: 'Lisbon Portela', cityName: 'Lisbon', countryCode: 'PT', type: 'AIRPORT' },
  { code: 'ATH', name: 'Eleftherios Venizelos', cityName: 'Athens', countryCode: 'GR', type: 'AIRPORT' },
  { code: 'SOF', name: 'Sofia Airport', cityName: 'Sofia', countryCode: 'BG', type: 'AIRPORT' },
  { code: 'BKK', name: 'Suvarnabhumi', cityName: 'Bangkok', countryCode: 'TH', type: 'AIRPORT' },
  { code: 'HKG', name: 'Hong Kong Intl', cityName: 'Hong Kong', countryCode: 'HK', type: 'AIRPORT' },
  { code: 'ORD', name: 'O\'Hare Intl', cityName: 'Chicago', countryCode: 'US', type: 'AIRPORT' },
  { code: 'MIA', name: 'Miami Intl', cityName: 'Miami', countryCode: 'US', type: 'AIRPORT' },
  { code: 'SFO', name: 'San Francisco Intl', cityName: 'San Francisco', countryCode: 'US', type: 'AIRPORT' },
  { code: 'SEA', name: 'Seattle-Tacoma Intl', cityName: 'Seattle', countryCode: 'US', type: 'AIRPORT' },
  { code: 'BOS', name: 'Logan Intl', cityName: 'Boston', countryCode: 'US', type: 'AIRPORT' },
  { code: 'DEN', name: 'Denver Intl', cityName: 'Denver', countryCode: 'US', type: 'AIRPORT' },
  { code: 'YYZ', name: 'Toronto Pearson', cityName: 'Toronto', countryCode: 'CA', type: 'AIRPORT' },
];

class AmadeusService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.baseUrl = config.amadeus.baseUrl;
  }

  isConfigured() {
    return !!(config.amadeus.clientId && config.amadeus.clientSecret);
  }

  async getAccessToken() {
    if (!this.isConfigured()) {
      throw new Error('Amadeus API credentials not configured. Add AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET to .env');
    }

    // Check if token is still valid (with 60s buffer)
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/security/oauth2/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: config.amadeus.clientId,
          client_secret: config.amadeus.clientSecret
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('Amadeus auth error:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Amadeus');
    }
  }

  async request(method, endpoint, params = {}, data = null) {
    const token = await this.getAccessToken();

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        params,
        data,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      console.error(`Amadeus API error (${endpoint}):`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Search for flight offers
   */
  async searchFlights(params) {
    if (!this.isConfigured()) {
      console.log('[Amadeus] Not configured, returning empty flights');
      return [];
    }

    const cacheKey = `flights:${JSON.stringify(params)}`;
    if (isCacheReady()) {
      const cached = getCached(cacheKey);
      if (cached) return cached;
    }

    const searchParams = {
      originLocationCode: params.originLocationCode,
      destinationLocationCode: params.destinationLocationCode,
      departureDate: params.departureDate,
      adults: params.adults || 1,
      max: params.max || 50,
      currencyCode: params.currencyCode || 'EUR'
    };

    if (params.returnDate) {
      searchParams.returnDate = params.returnDate;
    }
    if (params.travelClass) {
      searchParams.travelClass = params.travelClass;
    }
    if (params.nonStop) {
      searchParams.nonStop = true;
    }

    const response = await this.request('GET', '/v2/shopping/flight-offers', searchParams);

    // Process and normalize flight data
    const flights = this.normalizeFlightData(response);

    if (isCacheReady()) {
      setCache(cacheKey, flights, config.cache.ttlFlights);
    }
    return flights;
  }

  /**
   * Search flights across a date range to find best deals
   */
  async searchFlightsInRange(params) {
    if (!this.isConfigured()) {
      console.log('[Amadeus] Not configured, returning empty flights');
      return { flights: [], bestDeal: null, priceByDate: {} };
    }

    const { originLocationCode, destinationLocationCode, startDate, endDate, tripDuration, adults } = params;

    // Generate sample dates within the range (every 3-4 days to limit API calls)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    const current = new Date(start);

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 3); // Sample every 3 days
    }

    // Limit to max 10 date samples to avoid too many API calls
    const sampleDates = dates.slice(0, 10);

    const allFlights = [];
    const priceByDate = {};

    // Search flights for each sample date
    for (const departureDate of sampleDates) {
      try {
        const returnDate = tripDuration
          ? new Date(new Date(departureDate).getTime() + tripDuration * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : null;

        const flights = await this.searchFlights({
          originLocationCode,
          destinationLocationCode,
          departureDate,
          returnDate,
          adults: adults || 1,
          max: 10
        });

        if (flights.length > 0) {
          const minPrice = Math.min(...flights.map(f => f.price.total));
          priceByDate[departureDate] = minPrice;
          allFlights.push(...flights.map(f => ({ ...f, searchDate: departureDate })));
        }
      } catch (error) {
        console.error(`Failed to search flights for ${departureDate}:`, error.message);
      }
    }

    // Find best deal
    const bestDeal = allFlights.length > 0
      ? allFlights.reduce((best, flight) => flight.price.total < best.price.total ? flight : best)
      : null;

    return { flights: allFlights, bestDeal, priceByDate };
  }

  /**
   * Search for hotels by city
   */
  async searchHotelsByCity(params) {
    if (!this.isConfigured()) {
      return [];
    }

    const cacheKey = `hotels_city:${params.cityCode}`;
    if (isCacheReady()) {
      const cached = getCached(cacheKey);
      if (cached) return cached;
    }

    const response = await this.request('GET', '/v1/reference-data/locations/hotels/by-city', {
      cityCode: params.cityCode,
      radius: params.radius || 20,
      radiusUnit: 'KM',
      hotelSource: 'ALL'
    });

    if (isCacheReady()) {
      setCache(cacheKey, response.data, config.cache.ttlHotels);
    }
    return response.data;
  }

  /**
   * Search for hotel offers (availability and pricing)
   */
  async searchHotelOffers(params) {
    if (!this.isConfigured()) {
      return [];
    }

    const cacheKey = `hotel_offers:${JSON.stringify(params)}`;
    if (isCacheReady()) {
      const cached = getCached(cacheKey);
      if (cached) return cached;
    }

    // Amadeus limits to 20 hotel IDs per request
    const hotelIds = params.hotelIds.slice(0, 20).join(',');

    const response = await this.request('GET', '/v3/shopping/hotel-offers', {
      hotelIds,
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      adults: params.adults || 1,
      roomQuantity: params.rooms || 1,
      currency: params.currency || 'EUR',
      bestRateOnly: true
    });

    const hotels = this.normalizeHotelData(response);
    if (isCacheReady()) {
      setCache(cacheKey, hotels, config.cache.ttlHotels);
    }
    return hotels;
  }

  /**
   * Get city/airport IATA codes - with fallback to local data
   */
  async searchLocations(keyword) {
    const lowerKeyword = keyword.toLowerCase();

    // Try cache first
    const cacheKey = `locations:${lowerKeyword}`;
    if (isCacheReady()) {
      const cached = getCached(cacheKey);
      if (cached) return cached;
    }

    // If API not configured, use local fallback
    if (!this.isConfigured()) {
      console.log('[Amadeus] Using local location fallback');
      const filtered = POPULAR_LOCATIONS.filter(loc =>
        loc.cityName.toLowerCase().includes(lowerKeyword) ||
        loc.code.toLowerCase().includes(lowerKeyword) ||
        loc.name.toLowerCase().includes(lowerKeyword) ||
        loc.countryCode.toLowerCase().includes(lowerKeyword)
      );
      return filtered;
    }

    try {
      const response = await this.request('GET', '/v1/reference-data/locations', {
        keyword,
        subType: 'CITY,AIRPORT',
        view: 'LIGHT'
      });

      const locations = (response.data || []).map(loc => ({
        code: loc.iataCode,
        name: loc.name,
        cityName: loc.address?.cityName || loc.name,
        countryCode: loc.address?.countryCode,
        type: loc.subType
      }));

      if (isCacheReady()) {
        setCache(cacheKey, locations, config.cache.ttlSearch);
      }
      return locations;
    } catch (error) {
      console.error('[Amadeus] Location search failed, using fallback:', error.message);
      // Fallback to local data on API error
      const filtered = POPULAR_LOCATIONS.filter(loc =>
        loc.cityName.toLowerCase().includes(lowerKeyword) ||
        loc.code.toLowerCase().includes(lowerKeyword) ||
        loc.name.toLowerCase().includes(lowerKeyword)
      );
      return filtered;
    }
  }

  // Normalize flight data for easier consumption
  normalizeFlightData(response) {
    if (!response.data) return [];

    const dictionaries = response.dictionaries || {};

    return response.data.map(offer => {
      const outbound = offer.itineraries[0];
      const inbound = offer.itineraries[1] || null;

      return {
        id: offer.id,
        price: {
          total: parseFloat(offer.price.total),
          currency: offer.price.currency,
          perTraveler: parseFloat(offer.price.total) / offer.travelerPricings.length
        },
        outbound: this.normalizeItinerary(outbound, dictionaries),
        inbound: inbound ? this.normalizeItinerary(inbound, dictionaries) : null,
        bookingClass: offer.travelerPricings[0]?.fareDetailsBySegment[0]?.cabin || 'ECONOMY',
        seatsRemaining: offer.numberOfBookableSeats,
        lastTicketingDate: offer.lastTicketingDate,
        validatingCarrier: dictionaries.carriers?.[offer.validatingAirlineCodes?.[0]] || offer.validatingAirlineCodes?.[0]
      };
    });
  }

  normalizeItinerary(itinerary, dictionaries) {
    const segments = itinerary.segments;
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];

    return {
      departure: {
        airport: firstSegment.departure.iataCode,
        terminal: firstSegment.departure.terminal,
        time: firstSegment.departure.at
      },
      arrival: {
        airport: lastSegment.arrival.iataCode,
        terminal: lastSegment.arrival.terminal,
        time: lastSegment.arrival.at
      },
      duration: itinerary.duration,
      stops: segments.length - 1,
      segments: segments.map(seg => ({
        carrier: dictionaries.carriers?.[seg.carrierCode] || seg.carrierCode,
        carrierCode: seg.carrierCode,
        flightNumber: `${seg.carrierCode}${seg.number}`,
        aircraft: dictionaries.aircraft?.[seg.aircraft?.code] || seg.aircraft?.code,
        departure: {
          airport: seg.departure.iataCode,
          time: seg.departure.at
        },
        arrival: {
          airport: seg.arrival.iataCode,
          time: seg.arrival.at
        },
        duration: seg.duration
      }))
    };
  }

  normalizeHotelData(response) {
    if (!response.data) return [];

    return response.data.map(hotel => ({
      id: hotel.hotel.hotelId,
      name: hotel.hotel.name,
      rating: hotel.hotel.rating,
      location: {
        latitude: hotel.hotel.latitude,
        longitude: hotel.hotel.longitude,
        address: hotel.hotel.address
      },
      offers: hotel.offers?.map(offer => ({
        id: offer.id,
        checkIn: offer.checkInDate,
        checkOut: offer.checkOutDate,
        roomType: offer.room?.typeEstimated?.category,
        bedType: offer.room?.typeEstimated?.bedType,
        beds: offer.room?.typeEstimated?.beds,
        description: offer.room?.description?.text,
        price: {
          total: parseFloat(offer.price.total),
          currency: offer.price.currency,
          perNight: parseFloat(offer.price.total) / this.calculateNights(offer.checkInDate, offer.checkOutDate)
        },
        cancellation: offer.policies?.cancellation,
        paymentType: offer.policies?.paymentType
      })) || []
    }));
  }

  calculateNights(checkIn, checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
  }
}

export const amadeusService = new AmadeusService();
