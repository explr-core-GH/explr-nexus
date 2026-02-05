import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Check, Search } from 'lucide-react';
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
  required?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Search for an address...",
  className,
  disabled,
  required
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(value || null);
  const [hasSearched, setHasSearched] = useState(false);
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
    if (searchQuery.length < 5) {
      setSuggestions([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      const encodedQuery = encodeURIComponent(searchQuery);
      // Removed country restriction for broader search
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=5&addressdetails=1`,
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
      setSuggestions([]);
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

    // Debounce search - wait longer for user to finish typing
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (newValue.length >= 5) {
      setIsLoading(true); // Show loading immediately
      debounceRef.current = setTimeout(() => {
        searchAddress(newValue);
      }, 500);
    } else {
      setIsLoading(false);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectAddress = (suggestion: AddressSuggestion) => {
    const address = suggestion.display_name;
    setQuery(address);
    setSelectedAddress(address);
    setSuggestions([]);
    setShowSuggestions(false);
    setHasSearched(false);
    onChange(address, parseFloat(suggestion.lat), parseFloat(suggestion.lon));
  };

  const isValid = selectedAddress && selectedAddress === query;
  const showError = !isValid && query.length >= 5 && !isLoading && hasSearched && !showSuggestions;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className={cn(
          "absolute left-3 top-3 h-4 w-4",
          isValid ? "text-accent" : "text-muted-foreground"
        )} />
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          className={cn(
            "pl-10 pr-10",
            isValid && "border-accent/50 focus-visible:ring-accent/50",
            className
          )}
          disabled={disabled}
          required={required}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {isValid && !isLoading && (
          <Check className="absolute right-3 top-3 h-4 w-4 text-accent" />
        )}
      </div>
      
      {/* Helper text */}
      {!isValid && query.length === 0 && (
        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Type at least 5 characters to search
        </p>
      )}
      
      {/* Loading indicator */}
      {isLoading && query.length >= 5 && (
        <p className="text-xs text-muted-foreground mt-1.5">
          Searching for addresses...
        </p>
      )}
      
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-accent/10 transition-colors flex items-start gap-2 border-b border-border/50 last:border-0"
              onClick={() => handleSelectAddress(suggestion)}
            >
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-accent" />
              <span className="line-clamp-2">{suggestion.display_name}</span>
            </button>
          ))}
        </div>
      )}
      
      {/* No results message */}
      {showSuggestions && suggestions.length === 0 && hasSearched && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3">
          <p className="text-sm text-muted-foreground text-center">
            No addresses found. Try a different search.
          </p>
        </div>
      )}
      
      {/* Validation error - only show after user has searched and closed dropdown */}
      {showError && (
        <p className="text-xs text-destructive mt-1.5">
          Please select an address from the suggestions
        </p>
      )}
      
      {/* Success indicator */}
      {isValid && (
        <p className="text-xs text-accent mt-1.5 flex items-center gap-1">
          <Check className="h-3 w-3" />
          Address selected
        </p>
      )}
    </div>
  );
}
