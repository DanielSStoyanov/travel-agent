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
