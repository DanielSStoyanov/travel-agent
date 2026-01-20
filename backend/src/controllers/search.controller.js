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
