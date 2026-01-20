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
