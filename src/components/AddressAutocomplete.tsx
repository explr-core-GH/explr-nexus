import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, latitude?: number, longitude?: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Start typing an address...",
  className,
  disabled
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(value || null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with external value
  useEffect(() => {
    if (value && value !== query) {
      setQuery(value);
      setSelectedAddress(value);
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddress = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const encodedQuery = encodeURIComponent(searchQuery);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=5&addressdetails=1&countrycodes=us`,
        {
          headers: {
            'User-Agent': 'ExplrNexus/1.0',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Address search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setSelectedAddress(null);
    
    // Clear the coordinates when typing
    onChange(newValue, undefined, undefined);

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchAddress(newValue);
    }, 300);
  };

  const handleSelectAddress = (suggestion: AddressSuggestion) => {
    const address = suggestion.display_name;
    setQuery(address);
    setSelectedAddress(address);
    setSuggestions([]);
    setShowSuggestions(false);
    onChange(address, parseFloat(suggestion.lat), parseFloat(suggestion.lon));
  };

  const isValid = selectedAddress && selectedAddress === query;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className={cn(
          "absolute left-3 top-3 h-4 w-4",
          isValid ? "text-accent" : "text-muted-foreground"
        )} />
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className={cn("pl-10 pr-10", className)}
          disabled={disabled}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {isValid && !isLoading && (
          <Check className="absolute right-3 top-3 h-4 w-4 text-accent" />
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-start gap-2"
              onClick={() => handleSelectAddress(suggestion)}
            >
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <span className="line-clamp-2">{suggestion.display_name}</span>
            </button>
          ))}
        </div>
      )}
      
      {!isValid && query.length > 0 && !isLoading && (
        <p className="text-xs text-destructive mt-1">
          Please select a valid address from the suggestions
        </p>
      )}
    </div>
  );
}
