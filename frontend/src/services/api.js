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
