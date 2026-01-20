import { useState } from 'react';
import { Search, Calendar, Users, Wallet, ArrowRight, Clock, Sparkles } from 'lucide-react';
import LocationInput from './LocationInput';
import { travelApi } from '../../services/api';

export default function SearchForm({ onSearch, onResults, setIsLoading }) {
  const [formData, setFormData] = useState({
    origin: '',
    originCode: '',
    destination: '',
    destinationCode: '',
    periodStart: '',
    periodEnd: '',
    tripDuration: 7,
    adults: 1,
    budget: '',
    priorities: [],
    travelStyle: 'balanced'
  });

  const [error, setError] = useState(null);

  // Generate default period (next month)
  const getDefaultPeriod = () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    return {
      start: nextMonth.toISOString().split('T')[0],
      end: endOfNextMonth.toISOString().split('T')[0]
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.originCode || !formData.destinationCode) {
      setError('Please select origin and destination');
      return;
    }

    if (!formData.periodStart || !formData.periodEnd) {
      setError('Please select a search period (date range)');
      return;
    }

    setIsLoading(true);
    onSearch(formData);

    try {
      const results = await travelApi.getRecommendations({
        origin: formData.originCode,
        destination: formData.destinationCode,
        periodStart: formData.periodStart,
        periodEnd: formData.periodEnd,
        tripDuration: formData.tripDuration,
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

  const tripDurations = [
    { value: 3, label: 'Weekend (3 days)' },
    { value: 5, label: 'Short Trip (5 days)' },
    { value: 7, label: '1 Week' },
    { value: 10, label: '10 Days' },
    { value: 14, label: '2 Weeks' },
    { value: 21, label: '3 Weeks' },
  ];

  return (
    <form onSubmit={handleSubmit} className="card">
      {/* Header */}
      <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-indigo-50 rounded-lg border border-primary-100">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Smart Travel Search</h3>
            <p className="text-sm text-gray-600">
              Select a time period and trip duration. Our AI will search for the best flight and hotel deals within your chosen dates and propose optimal travel plans.
            </p>
          </div>
        </div>
      </div>

      {/* Location inputs */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
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
      </div>

      {/* Period Selection */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Search Period (when you can travel)
        </h4>
        <div className="grid md:grid-cols-3 gap-4">
          {/* Period Start */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Earliest Date
            </label>
            <input
              type="date"
              className="input"
              value={formData.periodStart}
              onChange={(e) => setFormData(prev => ({ ...prev, periodStart: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Period End */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Latest Date
            </label>
            <input
              type="date"
              className="input"
              value={formData.periodEnd}
              onChange={(e) => setFormData(prev => ({ ...prev, periodEnd: e.target.value }))}
              min={formData.periodStart || new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Trip Duration */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Trip Duration
            </label>
            <select
              className="input"
              value={formData.tripDuration}
              onChange={(e) => setFormData(prev => ({ ...prev, tripDuration: parseInt(e.target.value) }))}
            >
              {tripDurations.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          AI will find the best dates within this period for a {formData.tripDuration}-day trip
        </p>
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
            Budget (total per person)
          </label>
          <div className="relative">
            <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              className="input pl-10"
              value={formData.budget}
              onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
            >
              <option value="">Flexible</option>
              <option value="budget">Budget (under $500)</option>
              <option value="moderate">Moderate ($500-1000)</option>
              <option value="comfort">Comfort ($1000-2000)</option>
              <option value="luxury">Luxury ($2000+)</option>
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
        Find Best Travel Deals
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}
