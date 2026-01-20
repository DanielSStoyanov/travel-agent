import axios from 'axios';
import { config } from '../config/index.js';
import { getCached, setCache } from './cache.service.js';

class AmadeusService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.baseUrl = config.amadeus.baseUrl;
  }

  async getAccessToken() {
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
        }
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
    const cacheKey = `flights:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

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

    setCache(cacheKey, flights, config.cache.ttlFlights);
    return flights;
  }

  /**
   * Search for hotels by city
   */
  async searchHotelsByCity(params) {
    const cacheKey = `hotels_city:${params.cityCode}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await this.request('GET', '/v1/reference-data/locations/hotels/by-city', {
      cityCode: params.cityCode,
      radius: params.radius || 20,
      radiusUnit: 'KM',
      hotelSource: 'ALL'
    });

    setCache(cacheKey, response.data, config.cache.ttlHotels);
    return response.data;
  }

  /**
   * Search for hotel offers (availability and pricing)
   */
  async searchHotelOffers(params) {
    const cacheKey = `hotel_offers:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

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
    setCache(cacheKey, hotels, config.cache.ttlHotels);
    return hotels;
  }

  /**
   * Get city/airport IATA codes
   */
  async searchLocations(keyword) {
    const cacheKey = `locations:${keyword.toLowerCase()}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await this.request('GET', '/v1/reference-data/locations', {
      keyword,
      subType: 'CITY,AIRPORT',
      view: 'LIGHT'
    });

    const locations = response.data.map(loc => ({
      code: loc.iataCode,
      name: loc.name,
      cityName: loc.address?.cityName || loc.name,
      countryCode: loc.address?.countryCode,
      type: loc.subType
    }));

    setCache(cacheKey, locations, config.cache.ttlSearch);
    return locations;
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
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  }
}

export const amadeusService = new AmadeusService();
