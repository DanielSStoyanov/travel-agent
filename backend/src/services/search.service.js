import axios from 'axios';
import { config } from '../config/index.js';
import { getCached, setCache, isCacheReady } from './cache.service.js';

// Popular airports for location autocomplete fallback
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

class SearchApiService {
  constructor() {
    this.baseUrl = config.searchApi.baseUrl;
    this.apiKey = config.searchApi.apiKey;
    this.remainingSearches = 100; // Track usage for free tier
  }

  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Generic search method supporting multiple engines
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} Search results
   */
  async search(params) {
    const { engine = 'google', cacheKey, cacheTTL, ...searchParams } = params;

    // Try cache first if cacheKey provided
    if (cacheKey && isCacheReady()) {
      const cached = getCached(cacheKey);
      if (cached) {
        console.log(`[SearchAPI] Cache hit for: ${cacheKey}`);
        return cached;
      }
    }

    if (!this.isConfigured()) {
      console.warn('[SearchAPI] API key not configured');
      throw new Error('SearchAPI key not configured');
    }

    if (this.remainingSearches <= 0) {
      console.warn('[SearchAPI] Search quota exhausted');
      throw new Error('Search API quota exhausted');
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          api_key: this.apiKey,
          engine,
          ...searchParams
        },
        timeout: 30000
      });

      this.remainingSearches--;
      console.log(`[SearchAPI] Search completed (${engine}). Remaining: ${this.remainingSearches}`);

      // Cache results if cacheKey provided
      if (cacheKey && isCacheReady()) {
        setCache(cacheKey, response.data, cacheTTL || config.cache.ttlSearch);
      }

      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Error:', error.response?.data || error.message);
      throw error;
    }
  }

  // ==========================================
  // FLIGHT SEARCH METHODS (Google Flights)
  // ==========================================

  /**
   * Search for flights using Google Flights engine
   * @param {Object} params - Flight search parameters
   * @returns {Promise<Array>} Normalized flight results
   */
  async searchFlights(params) {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      adults = 1,
      travelClass,
      currencyCode = 'USD'
    } = params;

    if (!this.isConfigured()) {
      console.log('[SearchAPI] Not configured, returning empty flights');
      return [];
    }

    const cacheKey = `flights:${origin}:${destination}:${departureDate}:${returnDate || 'oneway'}:${adults}`;

    try {
      const searchParams = {
        engine: 'google_flights',
        departure_id: origin,
        arrival_id: destination,
        outbound_date: departureDate,
        adults: adults,
        currency: currencyCode,
        hl: 'en',
        gl: 'us',
        cacheKey,
        cacheTTL: config.cache.ttlFlights
      };

      // Add return date for round trips
      if (returnDate) {
        searchParams.return_date = returnDate;
        searchParams.type = '1'; // Round trip
      } else {
        searchParams.type = '2'; // One way
      }

      // Add travel class if specified
      if (travelClass) {
        const classMap = { 'ECONOMY': '1', 'PREMIUM_ECONOMY': '2', 'BUSINESS': '3', 'FIRST': '4' };
        searchParams.travel_class = classMap[travelClass] || '1';
      }

      const response = await this.search(searchParams);
      return this.normalizeFlightData(response, currencyCode);
    } catch (error) {
      console.error('[SearchAPI] Flight search error:', error.message);
      return [];
    }
  }

  /**
   * Search flights across a date range to find best deals
   */
  async searchFlightsInRange(params) {
    const { origin, destination, startDate, endDate, tripDuration, adults } = params;

    if (!this.isConfigured()) {
      console.log('[SearchAPI] Not configured, returning empty flights');
      return { flights: [], bestDeal: null, priceByDate: {} };
    }

    // Generate sample dates within the range (every 3-4 days to limit API calls)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    const current = new Date(start);

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 3); // Sample every 3 days
    }

    // Limit to max 5 date samples to conserve API calls
    const sampleDates = dates.slice(0, 5);

    const allFlights = [];
    const priceByDate = {};

    // Search flights for each sample date
    for (const departureDate of sampleDates) {
      try {
        const returnDate = tripDuration
          ? new Date(new Date(departureDate).getTime() + tripDuration * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : null;

        const flights = await this.searchFlights({
          origin,
          destination,
          departureDate,
          returnDate,
          adults: adults || 1
        });

        if (flights.length > 0) {
          const minPrice = Math.min(...flights.map(f => f.price.total));
          priceByDate[departureDate] = minPrice;
          allFlights.push(...flights.map(f => ({ ...f, searchDate: departureDate })));
        }
      } catch (error) {
        console.error(`[SearchAPI] Failed to search flights for ${departureDate}:`, error.message);
      }
    }

    // Find best deal
    const bestDeal = allFlights.length > 0
      ? allFlights.reduce((best, flight) => flight.price.total < best.price.total ? flight : best)
      : null;

    return { flights: allFlights, bestDeal, priceByDate };
  }

  /**
   * Normalize Google Flights response to common format
   */
  normalizeFlightData(response, currency = 'USD') {
    const flights = [];

    // Process best_flights (typically better options)
    if (response.best_flights) {
      for (const option of response.best_flights) {
        const normalized = this.normalizeFlightOption(option, currency, 'best');
        if (normalized) flights.push(normalized);
      }
    }

    // Process other_flights
    if (response.other_flights) {
      for (const option of response.other_flights) {
        const normalized = this.normalizeFlightOption(option, currency, 'other');
        if (normalized) flights.push(normalized);
      }
    }

    return flights;
  }

  normalizeFlightOption(option, currency, type) {
    if (!option.flights || option.flights.length === 0) return null;

    const flightSegments = option.flights;
    const firstFlight = flightSegments[0];
    const lastFlight = flightSegments[flightSegments.length - 1];

    // Generate a unique ID
    const id = `${firstFlight.flight_number || 'FL'}-${firstFlight.departure_airport?.id || ''}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Extract booking options if available
    const bookingOptions = option.extensions?.map(ext => ({
      source: ext,
    })) || [];

    return {
      id,
      price: {
        total: option.price || 0,
        currency: currency,
        perTraveler: option.price || 0
      },
      outbound: {
        departure: {
          airport: firstFlight.departure_airport?.id || '',
          airportName: firstFlight.departure_airport?.name || '',
          terminal: firstFlight.departure_airport?.terminal,
          time: firstFlight.departure_airport?.time || ''
        },
        arrival: {
          airport: lastFlight.arrival_airport?.id || '',
          airportName: lastFlight.arrival_airport?.name || '',
          terminal: lastFlight.arrival_airport?.terminal,
          time: lastFlight.arrival_airport?.time || ''
        },
        duration: option.total_duration || 0,
        durationFormatted: this.formatDuration(option.total_duration),
        stops: flightSegments.length - 1,
        segments: flightSegments.map(seg => ({
          carrier: seg.airline || '',
          carrierLogo: seg.airline_logo || '',
          flightNumber: seg.flight_number || '',
          aircraft: seg.airplane || '',
          departure: {
            airport: seg.departure_airport?.id || '',
            airportName: seg.departure_airport?.name || '',
            time: seg.departure_airport?.time || ''
          },
          arrival: {
            airport: seg.arrival_airport?.id || '',
            airportName: seg.arrival_airport?.name || '',
            time: seg.arrival_airport?.time || ''
          },
          duration: seg.duration || 0,
          durationFormatted: this.formatDuration(seg.duration)
        }))
      },
      inbound: null, // Will be populated for round trips
      bookingClass: option.travel_class || 'ECONOMY',
      type: type,
      carbonEmissions: option.carbon_emissions,
      bookingToken: option.booking_token || null,
      departureToken: option.departure_token || null,
      bookingOptions,
      layovers: option.layovers?.map(l => ({
        airport: l.id,
        airportName: l.name,
        duration: l.duration,
        durationFormatted: this.formatDuration(l.duration),
        overnight: l.overnight || false
      })) || []
    };
  }

  formatDuration(minutes) {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  // ==========================================
  // HOTEL SEARCH METHODS (Google Hotels)
  // ==========================================

  /**
   * Search for hotels using Google Hotels engine
   */
  async searchHotels(params) {
    const {
      destination,
      cityCode,
      checkIn,
      checkOut,
      adults = 2,
      currency = 'USD'
    } = params;

    if (!this.isConfigured()) {
      console.log('[SearchAPI] Not configured, returning empty hotels');
      return [];
    }

    // Use destination or resolve cityCode to city name
    const searchLocation = destination || this.getCityNameFromCode(cityCode) || cityCode;
    const cacheKey = `hotels:${searchLocation}:${checkIn}:${checkOut}:${adults}`;

    try {
      const searchParams = {
        engine: 'google_hotels',
        q: searchLocation,
        check_in_date: checkIn,
        check_out_date: checkOut,
        adults: adults,
        currency: currency,
        gl: 'us',
        hl: 'en',
        cacheKey,
        cacheTTL: config.cache.ttlHotels
      };

      const response = await this.search(searchParams);
      return this.normalizeHotelData(response, checkIn, checkOut, currency);
    } catch (error) {
      console.error('[SearchAPI] Hotel search error:', error.message);
      return [];
    }
  }

  /**
   * Normalize Google Hotels response to common format
   */
  normalizeHotelData(response, checkIn, checkOut, currency) {
    const hotels = [];

    if (response.properties) {
      for (const property of response.properties) {
        const id = property.property_token || `hotel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const nights = this.calculateNights(checkIn, checkOut);
        const totalPrice = property.total_rate?.lowest || property.rate_per_night?.lowest || 0;
        const pricePerNight = nights > 0 ? totalPrice / nights : totalPrice;

        hotels.push({
          id,
          name: property.name || 'Unknown Hotel',
          rating: property.overall_rating || null,
          reviewCount: property.reviews || 0,
          starRating: property.hotel_class ? parseInt(property.hotel_class) : null,
          location: {
            latitude: property.gps_coordinates?.latitude,
            longitude: property.gps_coordinates?.longitude,
            address: property.address || '',
            neighborhood: property.neighborhood || ''
          },
          images: property.images?.map(img => img.thumbnail || img.original_image) || [],
          amenities: property.amenities || [],
          link: property.link || null,
          serpLink: property.serpapi_property_details_link || null,
          type: property.type || 'Hotel',
          checkIn: property.check_in_time,
          checkOut: property.check_out_time,
          offers: [{
            id: `offer-${id}`,
            checkIn,
            checkOut,
            price: {
              total: totalPrice,
              perNight: pricePerNight,
              currency: currency
            },
            source: property.rate_per_night?.source || 'Various'
          }],
          nearbyPlaces: property.nearby_places || [],
          description: property.description || ''
        });
      }
    }

    return hotels;
  }

  // ==========================================
  // LOCATION / AUTOCOMPLETE METHODS
  // ==========================================

  /**
   * Search for locations (cities/airports) for autocomplete
   * Uses local database with OpenAI enhancement
   */
  async searchLocations(keyword) {
    const lowerKeyword = keyword.toLowerCase();

    // Try cache first
    const cacheKey = `locations:${lowerKeyword}`;
    if (isCacheReady()) {
      const cached = getCached(cacheKey);
      if (cached) return cached;
    }

    // Use local location data (more reliable for IATA codes)
    const filtered = POPULAR_LOCATIONS.filter(loc =>
      loc.cityName.toLowerCase().includes(lowerKeyword) ||
      loc.code.toLowerCase().includes(lowerKeyword) ||
      loc.name.toLowerCase().includes(lowerKeyword) ||
      loc.countryCode.toLowerCase().includes(lowerKeyword)
    );

    // Cache and return results
    if (isCacheReady() && filtered.length > 0) {
      setCache(cacheKey, filtered, config.cache.ttlSearch);
    }

    return filtered;
  }

  /**
   * Get city name from IATA code using local data
   */
  getCityNameFromCode(code) {
    if (!code) return null;
    const location = POPULAR_LOCATIONS.find(loc =>
      loc.code.toLowerCase() === code.toLowerCase()
    );
    return location?.cityName || null;
  }

  // ==========================================
  // WEB SEARCH METHODS (for enrichment)
  // ==========================================

  /**
   * Perform a general web search
   */
  async webSearch(query, options = {}) {
    const cacheKey = `web:${query}:${JSON.stringify(options)}`;

    try {
      const response = await this.search({
        engine: 'google',
        q: query,
        num: options.num || 10,
        gl: options.country || 'us',
        hl: options.language || 'en',
        cacheKey,
        cacheTTL: config.cache.ttlSearch
      });

      return this.normalizeWebSearchResults(response);
    } catch (error) {
      console.error('[SearchAPI] Web search error:', error.message);
      return { organic: [], knowledge: null, relatedSearches: [] };
    }
  }

  /**
   * Search for destination information (attractions, tips, etc.)
   */
  async searchDestinationInfo(destination) {
    const query = `${destination} travel guide top attractions things to do tips`;
    return this.webSearch(query, { num: 10 });
  }

  /**
   * Normalize web search results
   */
  normalizeWebSearchResults(data) {
    const results = {
      organic: [],
      knowledge: null,
      relatedSearches: []
    };

    if (data.organic_results) {
      results.organic = data.organic_results.map(r => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet,
        displayedLink: r.displayed_link,
        position: r.position
      }));
    }

    if (data.knowledge_graph) {
      results.knowledge = {
        title: data.knowledge_graph.title,
        type: data.knowledge_graph.type,
        description: data.knowledge_graph.description,
        attributes: data.knowledge_graph.attributes
      };
    }

    if (data.related_searches) {
      results.relatedSearches = data.related_searches.map(r => r.query);
    }

    return results;
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  calculateNights(checkIn, checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
  }

  /**
   * Get remaining search quota
   */
  getRemainingSearches() {
    return this.remainingSearches;
  }
}

export const searchApiService = new SearchApiService();
