import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../../.env') });

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

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
