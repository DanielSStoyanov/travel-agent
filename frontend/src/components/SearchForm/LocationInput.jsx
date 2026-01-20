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
                  {loc.type} {loc.countryCode && `• ${loc.countryCode}`}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
