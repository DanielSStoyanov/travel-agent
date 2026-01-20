import { useState } from 'react';
import { Search, Calendar, Users, Wallet, ArrowRight } from 'lucide-react';
import LocationInput from './LocationInput';
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
        Find Best Travel Options
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}
