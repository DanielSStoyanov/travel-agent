# TravelAI Planner - Implementation Plan

## Project Overview

A personal travel planning application that aggregates flight and accommodation data, analyzes options using AI, and provides optimized travel recommendations with price-quality balancing.

### Core Features
1. **Flight Search** - Search and compare flights via Amadeus API
2. **Accommodation Search** - Search hotels via Amadeus + web search fallback via SearchAPI
3. **AI Analysis** - OpenAI-powered analysis to find optimal price/quality combinations
4. **Smart Recommendations** - Generate complete travel plans with itineraries
5. **Price Comparison Matrix** - Flexible date searching to find best deals

### Technology Stack
- **Backend**: Node.js with Express.js
- **Frontend**: React with Vite
- **AI**: OpenAI API (gpt-4o or gpt-4o-mini)
- **Flight Data**: Amadeus for Developers API
- **Web Search**: SearchAPI (for accommodation fallback and enrichment)
- **Database**: SQLite (for caching and user preferences)
- **Styling**: Tailwind CSS

---

## Phase 1: Project Setup and Foundation

### 1.1 Initialize Project Structure

```
travel-planner/
├── backend/
│   ├── src/
│   │   ├── index.js                 # Express server entry point
│   │   ├── config/
│   │   │   └── index.js             # Environment configuration
│   │   ├── services/
│   │   │   ├── amadeus.service.js   # Amadeus API integration
│   │   │   ├── search.service.js    # SearchAPI integration
│   │   │   ├── openai.service.js    # OpenAI integration
│   │   │   └── cache.service.js     # SQLite caching
│   │   ├── controllers/
│   │   │   ├── flights.controller.js
│   │   │   ├── hotels.controller.js
│   │   │   ├── recommendations.controller.js
│   │   │   └── search.controller.js
│   │   ├── routes/
│   │   │   └── index.js             # API routes
│   │   ├── utils/
│   │   │   ├── formatters.js        # Data formatting utilities
│   │   │   ├── validators.js        # Input validation
│   │   │   └── prompts.js           # AI prompt templates
│   │   └── db/
│   │       └── schema.sql           # SQLite schema
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── SearchForm/
│   │   │   │   ├── SearchForm.jsx
│   │   │   │   ├── DatePicker.jsx
│   │   │   │   ├── LocationInput.jsx
│   │   │   │   └── TravelerSelector.jsx
│   │   │   ├── Results/
│   │   │   │   ├── FlightCard.jsx
│   │   │   │   ├── HotelCard.jsx
│   │   │   │   ├── RecommendationCard.jsx
│   │   │   │   └── PriceMatrix.jsx
│   │   │   ├── AIInsights/
│   │   │   │   ├── AnalysisPanel.jsx
│   │   │   │   └── SuggestionsList.jsx
│   │   │   └── common/
│   │   │       ├── Loading.jsx
│   │   │       ├── ErrorBoundary.jsx
│   │   │       └── Modal.jsx
│   │   ├── hooks/
│   │   │   ├── useFlightSearch.js
│   │   │   ├── useHotelSearch.js
│   │   │   └── useAIRecommendations.js
│   │   ├── services/
│   │   │   └── api.js               # Backend API client
│   │   ├── utils/
│   │   │   └── formatting.js
│   │   └── styles/
│   │       └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── README.md
└── docker-compose.yml               # Optional: for easy deployment
```

### 1.2 Backend Setup Commands

```bash
# Create project directory
mkdir -p travel-planner/backend travel-planner/frontend
cd travel-planner/backend

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express cors dotenv axios better-sqlite3 openai

# Install dev dependencies
npm install -D nodemon
```

### 1.3 Environment Configuration

Create `backend/.env.example`:
```env
# Server
PORT=3001
NODE_ENV=development

# Amadeus API (https://developers.amadeus.com)
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret
AMADEUS_ENV=test  # Use 'test' for development, 'production' for live

# OpenAI API (https://platform.openai.com)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini  # or gpt-4o for better quality

# SearchAPI (https://www.searchapi.io)
SEARCHAPI_KEY=your_searchapi_key

# Cache settings
CACHE_TTL_FLIGHTS=900      # 15 minutes in seconds
CACHE_TTL_HOTELS=3600      # 1 hour in seconds
CACHE_TTL_SEARCH=86400     # 24 hours in seconds
```

---

## Phase 2: Backend Services Implementation

### 2.1 Express Server Entry Point

Create `backend/src/index.js`:
```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { initializeDatabase } from './db/init.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initializeDatabase();

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`TravelAI server running on port ${PORT}`);
});
```

### 2.2 Database Schema

Create `backend/src/db/schema.sql`:
```sql
-- Cache table for API responses
CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Search history for learning preferences
CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  search_type TEXT NOT NULL,  -- 'flight', 'hotel', 'combined'
  query_params TEXT NOT NULL,
  results_count INTEGER,
  selected_option TEXT,       -- Which option user selected (for learning)
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- User preferences (for personalization)
CREATE TABLE IF NOT EXISTS preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Index for cache expiration cleanup
CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_search_history_date ON search_history(created_at);
```

Create `backend/src/db/init.js`:
```javascript
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db;

export function getDatabase() {
  if (!db) {
    db = new Database(path.join(__dirname, '../../data/travel.db'));
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function initializeDatabase() {
  const database = getDatabase();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  database.exec(schema);
  console.log('Database initialized');
}
```

### 2.3 Configuration Module

Create `backend/src/config/index.js`:
```javascript
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  amadeus: {
    clientId: process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET,
    env: process.env.AMADEUS_ENV || 'test',
    get baseUrl() {
      return this.env === 'production' 
        ? 'https://api.amadeus.com' 
        : 'https://test.api.amadeus.com';
    }
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
  },
  
  searchApi: {
    apiKey: process.env.SEARCHAPI_KEY,
    baseUrl: 'https://www.searchapi.io/api/v1/search'
  },
  
  cache: {
    ttlFlights: parseInt(process.env.CACHE_TTL_FLIGHTS) || 900,
    ttlHotels: parseInt(process.env.CACHE_TTL_HOTELS) || 3600,
    ttlSearch: parseInt(process.env.CACHE_TTL_SEARCH) || 86400
  }
};
```

### 2.4 Amadeus Service

Create `backend/src/services/amadeus.service.js`:
```javascript
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
   * @param {Object} params - Search parameters
   * @param {string} params.originLocationCode - IATA code (e.g., 'SOF')
   * @param {string} params.destinationLocationCode - IATA code (e.g., 'BCN')
   * @param {string} params.departureDate - YYYY-MM-DD
   * @param {string} [params.returnDate] - YYYY-MM-DD (optional for one-way)
   * @param {number} [params.adults=1] - Number of adult travelers
   * @param {string} [params.travelClass] - ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
   * @param {boolean} [params.nonStop=false] - Direct flights only
   * @param {number} [params.max=50] - Maximum results
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
   * @param {Object} params - Search parameters
   * @param {string} params.cityCode - IATA city code
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
   * @param {Object} params - Search parameters
   * @param {string[]} params.hotelIds - Array of hotel IDs from searchHotelsByCity
   * @param {string} params.checkInDate - YYYY-MM-DD
   * @param {string} params.checkOutDate - YYYY-MM-DD
   * @param {number} [params.adults=1] - Number of adults
   * @param {number} [params.rooms=1] - Number of rooms
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
   * @param {string} keyword - City or airport name
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
```

### 2.5 SearchAPI Service

Create `backend/src/services/search.service.js`:
```javascript
import axios from 'axios';
import { config } from '../config/index.js';
import { getCached, setCache } from './cache.service.js';

class SearchApiService {
  constructor() {
    this.baseUrl = config.searchApi.baseUrl;
    this.apiKey = config.searchApi.apiKey;
    this.remainingSearches = 100; // Track usage
  }

  /**
   * Perform a web search
   * @param {string} query - Search query
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Search results
   */
  async search(query, options = {}) {
    const cacheKey = `search:${query}:${JSON.stringify(options)}`;
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`[SearchAPI] Cache hit for: ${query}`);
      return cached;
    }

    if (this.remainingSearches <= 0) {
      console.warn('[SearchAPI] Search quota exhausted');
      throw new Error('Search API quota exhausted');
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          api_key: this.apiKey,
          engine: options.engine || 'google',
          q: query,
          num: options.num || 10,
          gl: options.country || 'us',
          hl: options.language || 'en',
          ...options.extraParams
        }
      });

      this.remainingSearches--;
      console.log(`[SearchAPI] Search completed. Remaining: ${this.remainingSearches}`);

      const results = this.normalizeSearchResults(response.data);
      setCache(cacheKey, results, config.cache.ttlSearch);
      
      return results;
    } catch (error) {
      console.error('[SearchAPI] Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Search for hotel information and reviews
   * Optimized to get maximum value from limited searches
   */
  async searchHotels(destination, checkIn, checkOut, options = {}) {
    // Craft an optimized query to get hotel info + prices + ratings in one search
    const query = `best hotels ${destination} ${options.budget || ''} ${checkIn} booking prices ratings reviews`.trim();
    
    const results = await this.search(query, {
      num: 15,
      ...options
    });

    return results;
  }

  /**
   * Search for destination information (attractions, tips, etc.)
   */
  async searchDestinationInfo(destination) {
    const cacheKey = `destination_info:${destination}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const query = `${destination} travel guide top attractions things to do tips`;
    const results = await this.search(query, { num: 10 });
    
    setCache(cacheKey, results, config.cache.ttlSearch);
    return results;
  }

  normalizeSearchResults(data) {
    const results = {
      organic: [],
      knowledge: null,
      relatedSearches: []
    };

    // Organic results
    if (data.organic_results) {
      results.organic = data.organic_results.map(r => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet,
        displayedLink: r.displayed_link,
        position: r.position
      }));
    }

    // Knowledge panel (often contains useful structured data)
    if (data.knowledge_graph) {
      results.knowledge = {
        title: data.knowledge_graph.title,
        type: data.knowledge_graph.type,
        description: data.knowledge_graph.description,
        attributes: data.knowledge_graph.attributes
      };
    }

    // Related searches for context
    if (data.related_searches) {
      results.relatedSearches = data.related_searches.map(r => r.query);
    }

    return results;
  }

  /**
   * Get remaining search quota
   */
  getRemainingSearches() {
    return this.remainingSearches;
  }
}

export const searchApiService = new SearchApiService();
```

### 2.6 Cache Service

Create `backend/src/services/cache.service.js`:
```javascript
import { getDatabase } from '../db/init.js';

/**
 * Get cached value
 * @param {string} key - Cache key
 * @returns {any|null} Cached value or null
 */
export function getCached(key) {
  const db = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  
  const row = db.prepare(
    'SELECT value FROM cache WHERE key = ? AND expires_at > ?'
  ).get(key, now);
  
  if (row) {
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }
  return null;
}

/**
 * Set cache value
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 */
export function setCache(key, value, ttl) {
  const db = getDatabase();
  const expiresAt = Math.floor(Date.now() / 1000) + ttl;
  const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
  
  db.prepare(`
    INSERT OR REPLACE INTO cache (key, value, expires_at)
    VALUES (?, ?, ?)
  `).run(key, valueStr, expiresAt);
}

/**
 * Delete cached value
 * @param {string} key - Cache key
 */
export function deleteCache(key) {
  const db = getDatabase();
  db.prepare('DELETE FROM cache WHERE key = ?').run(key);
}

/**
 * Clear expired cache entries
 */
export function cleanupExpiredCache() {
  const db = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  const result = db.prepare('DELETE FROM cache WHERE expires_at < ?').run(now);
  console.log(`[Cache] Cleaned up ${result.changes} expired entries`);
}

/**
 * Clear all cache
 */
export function clearAllCache() {
  const db = getDatabase();
  db.prepare('DELETE FROM cache').run();
}

// Run cleanup every hour
setInterval(cleanupExpiredCache, 60 * 60 * 1000);
```

### 2.7 OpenAI Service

Create `backend/src/services/openai.service.js`:
```javascript
import OpenAI from 'openai';
import { config } from '../config/index.js';
import { PROMPTS } from '../utils/prompts.js';

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey
    });
    this.model = config.openai.model;
  }

  /**
   * Analyze travel options and provide recommendations
   * @param {Object} data - Travel data to analyze
   * @param {Array} data.flights - Flight options
   * @param {Array} data.hotels - Hotel options
   * @param {Object} data.preferences - User preferences
   * @param {Object} data.searchContext - Original search parameters
   */
  async analyzeAndRecommend(data) {
    const systemPrompt = PROMPTS.TRAVEL_ANALYST;
    
    const userPrompt = this.buildAnalysisPrompt(data);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const content = response.data?.choices[0]?.message?.content || response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('[OpenAI] Analysis error:', error);
      throw error;
    }
  }

  /**
   * Generate a natural language travel plan
   */
  async generateTravelPlan(recommendation, destinationInfo) {
    const systemPrompt = PROMPTS.TRAVEL_PLANNER;
    
    const userPrompt = `
Based on the selected travel option and destination information, create a detailed travel plan.

SELECTED OPTION:
${JSON.stringify(recommendation, null, 2)}

DESTINATION INFORMATION:
${JSON.stringify(destinationInfo, null, 2)}

Please create a day-by-day itinerary with practical tips.
`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 2500
      });

      return response.data?.choices[0]?.message?.content || response.choices[0].message.content;
    } catch (error) {
      console.error('[OpenAI] Travel plan generation error:', error);
      throw error;
    }
  }

  /**
   * Smart query builder - determines what to search for given limited searches
   */
  async buildSmartSearchQueries(context) {
    const systemPrompt = PROMPTS.SEARCH_OPTIMIZER;
    
    const userPrompt = `
Given the following travel search context, determine the most valuable search queries to enrich the results.
We have LIMITED search API calls (${context.remainingSearches} remaining), so choose wisely.

SEARCH CONTEXT:
- Destination: ${context.destination}
- Travel Dates: ${context.checkIn} to ${context.checkOut}
- Budget Level: ${context.budget || 'not specified'}
- Travel Style: ${context.travelStyle || 'not specified'}
- Specific Interests: ${context.interests?.join(', ') || 'none specified'}

What are the 1-3 most valuable searches to enhance recommendations?
Return as JSON array of search queries.
`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      const content = response.data?.choices[0]?.message?.content || response.choices[0].message.content;
      return JSON.parse(content).queries || [];
    } catch (error) {
      console.error('[OpenAI] Query building error:', error);
      return []; // Fallback to no additional searches
    }
  }

  buildAnalysisPrompt(data) {
    return `
Analyze the following travel options and provide recommendations.

SEARCH PARAMETERS:
- Origin: ${data.searchContext.origin}
- Destination: ${data.searchContext.destination}
- Dates: ${data.searchContext.departureDate} to ${data.searchContext.returnDate || 'one-way'}
- Travelers: ${data.searchContext.adults} adults
- Budget: ${data.searchContext.budget || 'flexible'}
- Priorities: ${data.searchContext.priorities?.join(', ') || 'best value'}

AVAILABLE FLIGHTS (${data.flights.length} options):
${JSON.stringify(data.flights.slice(0, 20), null, 2)}

AVAILABLE HOTELS (${data.hotels.length} options):
${JSON.stringify(data.hotels.slice(0, 15), null, 2)}

${data.webSearchResults ? `
ADDITIONAL CONTEXT FROM WEB:
${JSON.stringify(data.webSearchResults, null, 2)}
` : ''}

USER PREFERENCES:
${JSON.stringify(data.preferences || {}, null, 2)}

Please analyze all options and return a JSON response with:
1. "recommendations": Array of top 3-5 combined packages (flight + hotel), each with:
   - "rank": 1-5
   - "flightId": ID of recommended flight
   - "hotelId": ID of recommended hotel
   - "totalPrice": Combined price
   - "valueScore": 1-100 score for value
   - "reasoning": Why this combination is recommended
   - "pros": Array of advantages
   - "cons": Array of disadvantages
   - "bestFor": Who this option is best suited for

2. "insights": Object with:
   - "priceAnalysis": Analysis of price ranges and value
   - "timingAdvice": Best booking timing or date flexibility suggestions
   - "alternativeSuggestions": Any alternative destinations or dates worth considering
   - "warnings": Any red flags or things to watch out for

3. "summary": A brief 2-3 sentence summary of the overall options
`;
  }
}

export const openaiService = new OpenAIService();
```

### 2.8 AI Prompts

Create `backend/src/utils/prompts.js`:
```javascript
export const PROMPTS = {
  TRAVEL_ANALYST: `You are an expert travel analyst AI assistant. Your role is to analyze flight and hotel options to find the best combinations for travelers.

You excel at:
- Finding the best value for money (not just cheapest)
- Balancing convenience factors (flight times, hotel location, transfers)
- Understanding different traveler needs (business, leisure, budget, luxury)
- Identifying hidden costs or red flags
- Suggesting creative alternatives

Always be specific with numbers and provide actionable recommendations.
When analyzing options, consider:
1. Total trip cost (flights + accommodation + estimated transfers)
2. Time efficiency (layovers, check-in/out alignment with flights)
3. Location quality (hotel proximity to attractions, airports)
4. Review signals (ratings, common complaints)
5. Flexibility (cancellation policies, rebooking options)

Your output must be valid JSON.`,

  TRAVEL_PLANNER: `You are a friendly and knowledgeable travel planning assistant. Create engaging, practical travel itineraries.

Your itineraries should:
- Be realistic and achievable (not cramming too much in)
- Include specific recommendations (restaurant names, attraction tips)
- Consider logistics (travel times between places)
- Mention local tips and cultural considerations
- Include estimated costs where relevant
- Suggest alternatives for different weather or preferences

Write in a warm, helpful tone as if advising a friend.`,

  SEARCH_OPTIMIZER: `You are a search query optimizer. Given a travel context and limited search API calls, determine the most valuable searches to perform.

Prioritize searches that:
1. Fill critical information gaps (hotel reviews, safety info)
2. Provide high-value local knowledge (best neighborhoods, hidden gems)
3. Offer practical logistics (transport, local customs)

Avoid searches that:
- Duplicate information already available from booking APIs
- Are too generic to be useful
- Focus on well-known tourist information already widely available

Return a JSON object with a "queries" array containing 1-3 optimized search strings.`,

  DESTINATION_DISCOVERY: `You are a destination discovery assistant. When a user provides vague criteria, suggest specific destinations that match.

Consider:
- Budget constraints
- Travel time/distance
- Seasonal factors
- Visa requirements
- Safety considerations
- Unique experiences available

Always explain WHY each destination matches the criteria.`
};
```

---

## Phase 3: API Routes and Controllers

### 3.1 Routes Setup

Create `backend/src/routes/index.js`:
```javascript
import { Router } from 'express';
import * as flightsController from '../controllers/flights.controller.js';
import * as hotelsController from '../controllers/hotels.controller.js';
import * as recommendationsController from '../controllers/recommendations.controller.js';
import * as searchController from '../controllers/search.controller.js';

const router = Router();

// Location search (for autocomplete)
router.get('/locations', searchController.searchLocations);

// Flight routes
router.get('/flights/search', flightsController.searchFlights);
router.get('/flights/calendar', flightsController.getFlightCalendar);

// Hotel routes
router.get('/hotels/search', hotelsController.searchHotels);

// AI-powered recommendations
router.post('/recommendations', recommendationsController.getRecommendations);
router.post('/recommendations/plan', recommendationsController.generatePlan);

// Web search (for enrichment)
router.get('/search/destination', searchController.searchDestination);
router.get('/search/status', searchController.getSearchStatus);

export default router;
```

### 3.2 Flights Controller

Create `backend/src/controllers/flights.controller.js`:
```javascript
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
```

### 3.3 Hotels Controller

Create `backend/src/controllers/hotels.controller.js`:
```javascript
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
      const cityName = hotelList[0]?.name || cityCode; // Get city name from first result
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
```

### 3.4 Recommendations Controller

Create `backend/src/controllers/recommendations.controller.js`:
```javascript
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
```

### 3.5 Search Controller

Create `backend/src/controllers/search.controller.js`:
```javascript
import { amadeusService } from '../services/amadeus.service.js';
import { searchApiService } from '../services/search.service.js';

export async function searchLocations(req, res, next) {
  try {
    const { keyword } = req.query;

    if (!keyword || keyword.length < 2) {
      return res.status(400).json({
        error: 'Keyword must be at least 2 characters'
      });
    }

    const locations = await amadeusService.searchLocations(keyword);
    res.json({ locations });
  } catch (error) {
    next(error);
  }
}

export async function searchDestination(req, res, next) {
  try {
    const { destination } = req.query;

    if (!destination) {
      return res.status(400).json({ error: 'Missing destination' });
    }

    if (searchApiService.getRemainingSearches() <= 0) {
      return res.status(429).json({
        error: 'Search quota exhausted',
        remainingSearches: 0
      });
    }

    const results = await searchApiService.searchDestinationInfo(destination);
    
    res.json({
      results,
      remainingSearches: searchApiService.getRemainingSearches()
    });
  } catch (error) {
    next(error);
  }
}

export async function getSearchStatus(req, res) {
  res.json({
    remainingSearches: searchApiService.getRemainingSearches(),
    maxSearches: 100
  });
}
```

---

## Phase 4: Frontend Implementation

### 4.1 Frontend Setup

```bash
cd ../frontend

# Create Vite React project
npm create vite@latest . -- --template react

# Install dependencies
npm install axios react-router-dom @tanstack/react-query date-fns lucide-react

# Install Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 4.2 Tailwind Configuration

Update `frontend/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}
```

Update `frontend/src/styles/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .btn-primary {
    @apply bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
  }
  
  .btn-secondary {
    @apply bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors;
  }
  
  .card {
    @apply bg-white rounded-xl shadow-sm border border-gray-100 p-6;
  }
  
  .input {
    @apply w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none;
  }
}
```

### 4.3 API Client

Create `frontend/src/services/api.js`:
```javascript
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60s timeout for AI operations
});

// Request interceptor for logging
api.interceptors.request.use(config => {
  console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('[API Error]', error.response?.data || error.message);
    throw error;
  }
);

export const travelApi = {
  // Locations
  searchLocations: (keyword) => 
    api.get('/locations', { params: { keyword } }).then(r => r.data),

  // Flights
  searchFlights: (params) => 
    api.get('/flights/search', { params }).then(r => r.data),
  
  getFlightCalendar: (params) => 
    api.get('/flights/calendar', { params }).then(r => r.data),

  // Hotels
  searchHotels: (params) => 
    api.get('/hotels/search', { params }).then(r => r.data),

  // Recommendations
  getRecommendations: (data) => 
    api.post('/recommendations', data).then(r => r.data),
  
  generatePlan: (data) => 
    api.post('/recommendations/plan', data).then(r => r.data),

  // Search status
  getSearchStatus: () => 
    api.get('/search/status').then(r => r.data),
};

export default api;
```

### 4.4 Main App Component

Create `frontend/src/App.jsx`:
```jsx
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchForm from './components/SearchForm/SearchForm';
import ResultsPanel from './components/Results/ResultsPanel';
import AIInsightsPanel from './components/AIInsights/AIInsightsPanel';
import { Plane, Sparkles } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const [searchParams, setSearchParams] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Plane className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">TravelAI Planner</h1>
              <p className="text-sm text-gray-500">AI-powered travel recommendations</p>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Search Form */}
          <section className="mb-8">
            <SearchForm 
              onSearch={setSearchParams}
              onResults={setRecommendations}
              setIsLoading={setIsLoading}
            />
          </section>

          {/* Loading State */}
          {isLoading && (
            <div className="card flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">
                  <Sparkles className="inline w-4 h-4 mr-2" />
                  AI is analyzing your travel options...
                </p>
                <p className="text-sm text-gray-400 mt-2">This may take 15-30 seconds</p>
              </div>
            </div>
          )}

          {/* Results */}
          {!isLoading && recommendations && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ResultsPanel recommendations={recommendations} />
              </div>
              <div>
                <AIInsightsPanel insights={recommendations.insights} summary={recommendations.summary} />
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !recommendations && (
            <div className="card text-center py-16">
              <Plane className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Start Your Travel Search
              </h2>
              <p className="text-gray-500 max-w-md mx-auto">
                Enter your travel details above and our AI will find the best 
                flight and hotel combinations for you.
              </p>
            </div>
          )}
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;
```

### 4.5 Search Form Component

Create `frontend/src/components/SearchForm/SearchForm.jsx`:
```jsx
import { useState } from 'react';
import { Search, Calendar, Users, Wallet, ArrowRight } from 'lucide-react';
import LocationInput from './LocationInput';
import DatePicker from './DatePicker';
import { travelApi } from '../../services/api';

export default function SearchForm({ onSearch, onResults, setIsLoading }) {
  const [formData, setFormData] = useState({
    origin: '',
    originCode: '',
    destination: '',
    destinationCode: '',
    departureDate: '',
    returnDate: '',
    adults: 1,
    budget: '',
    priorities: [],
    travelStyle: 'balanced'
  });

  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.originCode || !formData.destinationCode || !formData.departureDate) {
      setError('Please fill in origin, destination, and departure date');
      return;
    }

    setIsLoading(true);
    onSearch(formData);

    try {
      const results = await travelApi.getRecommendations({
        origin: formData.originCode,
        destination: formData.destinationCode,
        departureDate: formData.departureDate,
        returnDate: formData.returnDate || undefined,
        adults: formData.adults,
        budget: formData.budget || undefined,
        priorities: formData.priorities,
        travelStyle: formData.travelStyle
      });
      
      onResults(results);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get recommendations');
      onResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const priorities = [
    { id: 'price', label: 'Lowest Price' },
    { id: 'comfort', label: 'Comfort' },
    { id: 'time', label: 'Shortest Travel Time' },
    { id: 'rating', label: 'Best Ratings' },
    { id: 'location', label: 'Central Location' },
  ];

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Origin */}
        <LocationInput
          label="From"
          value={formData.origin}
          onChange={(value, code) => setFormData(prev => ({ 
            ...prev, 
            origin: value, 
            originCode: code 
          }))}
          placeholder="City or airport"
        />

        {/* Destination */}
        <LocationInput
          label="To"
          value={formData.destination}
          onChange={(value, code) => setFormData(prev => ({ 
            ...prev, 
            destination: value, 
            destinationCode: code 
          }))}
          placeholder="City or airport"
        />

        {/* Departure Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Departure
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              className="input pl-10"
              value={formData.departureDate}
              onChange={(e) => setFormData(prev => ({ ...prev, departureDate: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {/* Return Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Return (optional)
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              className="input pl-10"
              value={formData.returnDate}
              onChange={(e) => setFormData(prev => ({ ...prev, returnDate: e.target.value }))}
              min={formData.departureDate || new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      </div>

      {/* Additional Options Row */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* Travelers */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Travelers
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              className="input pl-10"
              value={formData.adults}
              onChange={(e) => setFormData(prev => ({ ...prev, adults: parseInt(e.target.value) }))}
            >
              {[1, 2, 3, 4, 5, 6].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'Adult' : 'Adults'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Budget */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Budget (per person)
          </label>
          <div className="relative">
            <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              className="input pl-10"
              value={formData.budget}
              onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
            >
              <option value="">Flexible</option>
              <option value="budget">Budget (under €500)</option>
              <option value="moderate">Moderate (€500-1000)</option>
              <option value="comfort">Comfort (€1000-2000)</option>
              <option value="luxury">Luxury (€2000+)</option>
            </select>
          </div>
        </div>

        {/* Travel Style */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Travel Style
          </label>
          <select
            className="input"
            value={formData.travelStyle}
            onChange={(e) => setFormData(prev => ({ ...prev, travelStyle: e.target.value }))}
          >
            <option value="balanced">Balanced</option>
            <option value="budget">Budget Conscious</option>
            <option value="comfort">Comfort First</option>
            <option value="adventure">Adventure</option>
            <option value="relaxation">Relaxation</option>
          </select>
        </div>
      </div>

      {/* Priorities */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Priorities (select what matters most)
        </label>
        <div className="flex flex-wrap gap-2">
          {priorities.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  priorities: prev.priorities.includes(p.id)
                    ? prev.priorities.filter(x => x !== p.id)
                    : [...prev.priorities, p.id]
                }));
              }}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                formData.priorities.includes(p.id)
                  ? 'bg-primary-100 text-primary-700 border border-primary-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
        <Search className="w-4 h-4" />
        Find Best Travel Options
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}
```

### 4.6 Location Input Component

Create `frontend/src/components/SearchForm/LocationInput.jsx`:
```jsx
import { useState, useRef, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { travelApi } from '../../services/api';

export default function LocationInput({ label, value, onChange, placeholder }) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val, '');

    // Debounce API calls
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (val.length >= 2) {
      setIsLoading(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const data = await travelApi.searchLocations(val);
          setSuggestions(data.locations || []);
          setIsOpen(true);
        } catch (err) {
          console.error('Location search error:', err);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (location) => {
    setQuery(`${location.cityName} (${location.code})`);
    onChange(`${location.cityName} (${location.code})`, location.code);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          className="input pl-10"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((loc, idx) => (
            <li
              key={`${loc.code}-${idx}`}
              onClick={() => handleSelect(loc)}
              className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
            >
              <MapPin className="w-4 h-4 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">
                  {loc.cityName}
                  <span className="ml-2 text-sm text-gray-500">({loc.code})</span>
                </div>
                <div className="text-xs text-gray-500">
                  {loc.type} • {loc.countryCode}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### 4.7 Results Panel Component

Create `frontend/src/components/Results/ResultsPanel.jsx`:
```jsx
import { useState } from 'react';
import { Award, ChevronRight, Plane, Hotel, Clock, Star } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function ResultsPanel({ recommendations }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!recommendations?.recommendations?.length) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500">No recommendations found. Try adjusting your search criteria.</p>
      </div>
    );
  }

  const selected = recommendations.recommendations[selectedIndex];

  return (
    <div className="space-y-4">
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
                    €{rec.totalPrice?.toFixed(0) || 'N/A'}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {/* Flight Info */}
                  {rec.flight && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Plane className="w-4 h-4 text-gray-400" />
                      <span>
                        {rec.flight.validatingCarrier} • 
                        {rec.flight.outbound.stops === 0 ? ' Direct' : ` ${rec.flight.outbound.stops} stop(s)`}
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

                {/* Pros/Cons Preview */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {rec.pros?.slice(0, 2).map((pro, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
                      ✓ {pro}
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
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <Plane className="w-4 h-4" /> Flight Details
                      </h4>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-gray-500">Outbound:</span>{' '}
                          {format(parseISO(rec.flight.outbound.departure.time), 'MMM d, HH:mm')}
                        </p>
                        <p>
                          <span className="text-gray-500">Duration:</span>{' '}
                          {rec.flight.outbound.duration}
                        </p>
                        <p>
                          <span className="text-gray-500">Price:</span>{' '}
                          €{rec.flight.price.total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Hotel Details */}
                  {rec.hotel && rec.hotel.offers?.[0] && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <Hotel className="w-4 h-4" /> Hotel Details
                      </h4>
                      <div className="text-sm space-y-1">
                        <p className="font-medium">{rec.hotel.name}</p>
                        <p>
                          <span className="text-gray-500">Room:</span>{' '}
                          {rec.hotel.offers[0].roomType || 'Standard'}
                        </p>
                        <p>
                          <span className="text-gray-500">Price:</span>{' '}
                          €{rec.hotel.offers[0].price.total.toFixed(2)} total
                        </p>
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
                        <li key={i} className="text-gray-600">✓ {pro}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">Considerations</h4>
                    <ul className="text-sm space-y-1">
                      {rec.cons?.map((con, i) => (
                        <li key={i} className="text-gray-600">• {con}</li>
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
        Analyzed {recommendations.meta?.flightsAnalyzed} flights and {recommendations.meta?.hotelsAnalyzed} hotels
        {recommendations.meta?.webSearchesUsed > 0 && ` • Enhanced with ${recommendations.meta.webSearchesUsed} web searches`}
      </div>
    </div>
  );
}
```

### 4.8 AI Insights Panel

Create `frontend/src/components/AIInsights/AIInsightsPanel.jsx`:
```jsx
import { Sparkles, TrendingUp, Clock, AlertTriangle, Lightbulb } from 'lucide-react';

export default function AIInsightsPanel({ insights, summary }) {
  if (!insights) return null;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="card bg-gradient-to-br from-primary-50 to-indigo-50 border-primary-100">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">AI Summary</h3>
            <p className="text-sm text-gray-700">{summary}</p>
          </div>
        </div>
      </div>

      {/* Price Analysis */}
      {insights.priceAnalysis && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <h4 className="font-medium text-gray-900">Price Analysis</h4>
          </div>
          <p className="text-sm text-gray-600">{insights.priceAnalysis}</p>
        </div>
      )}

      {/* Timing Advice */}
      {insights.timingAdvice && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-blue-600" />
            <h4 className="font-medium text-gray-900">Timing Advice</h4>
          </div>
          <p className="text-sm text-gray-600">{insights.timingAdvice}</p>
        </div>
      )}

      {/* Warnings */}
      {insights.warnings && insights.warnings.length > 0 && (
        <div className="card border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <h4 className="font-medium text-yellow-800">Things to Consider</h4>
          </div>
          <ul className="text-sm text-yellow-700 space-y-1">
            {insights.warnings.map((warning, i) => (
              <li key={i}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Alternative Suggestions */}
      {insights.alternativeSuggestions && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-purple-600" />
            <h4 className="font-medium text-gray-900">Worth Considering</h4>
          </div>
          <p className="text-sm text-gray-600">{insights.alternativeSuggestions}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Phase 5: Testing and Deployment

### 5.1 Package.json Scripts

Update `backend/package.json`:
```json
{
  "name": "travel-planner-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "echo \"TODO: Add tests\""
  },
  "dependencies": {
    "axios": "^1.6.0",
    "better-sqlite3": "^9.2.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "openai": "^4.20.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### 5.2 Environment Setup Checklist

```markdown
## Before Running

1. **Amadeus Developer Account**
   - Go to https://developers.amadeus.com
   - Create a free account
   - Create a new app in the dashboard
   - Copy API Key and Secret to .env

2. **OpenAI Account**
   - Go to https://platform.openai.com
   - Create an account and add credits
   - Generate an API key
   - Copy to .env

3. **SearchAPI Account**
   - Go to https://www.searchapi.io
   - Create account (100 free searches)
   - Copy API key to .env

4. **Create Data Directory**
   ```bash
   mkdir -p backend/data
   ```

5. **Copy Environment File**
   ```bash
   cp backend/.env.example backend/.env
   # Edit .env with your API keys
   ```
```

### 5.3 Running the Application

```bash
# Terminal 1: Start Backend
cd backend
npm install
npm run dev

# Terminal 2: Start Frontend
cd frontend
npm install
npm run dev
```

---

## Phase 6: Future Enhancements

### 6.1 Priority Additions (After MVP)

1. **Price Calendar View** - Visual calendar showing prices across dates
2. **Save & Compare** - Save searches and compare options side by side
3. **Flexible Dates Search** - "Cheapest in next 30 days" feature
4. **Multi-city Trips** - Support for complex itineraries
5. **Price Alerts** - Notify when prices drop

### 6.2 Advanced Features (Future)

1. **User Accounts** - Save preferences and search history
2. **Booking Integration** - Direct booking through affiliate links
3. **Weather Integration** - Show forecast for travel dates
4. **Activity Suggestions** - Integrate GetYourGuide/Viator
5. **Group Travel** - Coordinate trips from multiple origins

---

## Quick Start Commands Summary

```bash
# Clone and setup
mkdir travel-planner && cd travel-planner

# Backend
mkdir -p backend/src/{config,services,controllers,routes,db,utils}
mkdir -p backend/data
cd backend
npm init -y
npm install express cors dotenv axios better-sqlite3 openai
npm install -D nodemon

# Frontend
cd ../
npm create vite@latest frontend -- --template react
cd frontend
npm install axios react-router-dom @tanstack/react-query date-fns lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Run
# Terminal 1: cd backend && npm run dev
# Terminal 2: cd frontend && npm run dev
```

---

## Notes for Claude Code

- Always handle API errors gracefully - travel APIs can be unreliable
- Cache aggressively to save on API calls and improve UX
- The Amadeus test environment has limited data - some city/date combinations may return no results
- SearchAPI has only 100 free calls - use them wisely via the AI query optimizer
- OpenAI's gpt-4o-mini is sufficient for analysis; use gpt-4o only if quality needs improvement
- SQLite is used for simplicity; can be replaced with PostgreSQL for production
