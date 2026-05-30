import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Building2, ExternalLink, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MarketCard {
  id: string;
  fullAddress: string;
  addressNumber: string;
  roadName: string;
  suburb: string;
  city: string;
  lat: number;
  lng: number;
  source: 'linz';
}

interface MarketFeedProps {
  defaultSuburb?: string;
  defaultCity?: string;
}

export function MarketFeed({ defaultSuburb = 'Ponsonby', defaultCity = 'Auckland' }: MarketFeedProps) {
  const [inputValue, setInputValue] = useState(defaultSuburb);
  const [searchParams, setSearchParams] = useState({ suburb: defaultSuburb, city: defaultCity });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['/api/market/cards', searchParams.suburb, searchParams.city],
    queryFn: async () => {
      const res = await fetch(
        `/api/market/cards?suburb=${encodeURIComponent(searchParams.suburb)}&city=${encodeURIComponent(searchParams.city)}&limit=24`
      );
      return res.json() as Promise<{ cards: MarketCard[]; total: number; suburb: string; city: string }>;
    },
    staleTime: 6 * 60 * 60 * 1000,
  });

  const { data: suggestions } = useQuery({
    queryKey: ['/api/market/suburbs', inputValue],
    queryFn: async () => {
      if (inputValue.length < 2) return { suggestions: [] };
      const res = await fetch(`/api/market/suburbs?q=${encodeURIComponent(inputValue)}&city=${encodeURIComponent(searchParams.city)}`);
      return res.json() as Promise<{ suggestions: string[] }>;
    },
    enabled: inputValue.length >= 2 && inputValue !== searchParams.suburb,
    staleTime: 60 * 60 * 1000,
  });

  const handleSearch = useCallback(() => {
    if (inputValue.trim()) {
      setSearchParams({ suburb: inputValue.trim(), city: defaultCity });
    }
  }, [inputValue, defaultCity]);

  const cards = data?.cards ?? [];
  const loading = isLoading || isFetching;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Browse the Market</h2>
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            LINZ Data
          </Badge>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Real NZ property addresses from Land Information New Zealand. No listings yet — explore what's out there.
        </p>

        {/* Suburb search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search suburb..."
              className="pr-4"
            />
            {suggestions?.suggestions && suggestions.suggestions.length > 0 && inputValue !== searchParams.suburb && (
              <div className="absolute top-full left-0 right-0 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md mt-1 shadow-lg overflow-hidden">
                {suggestions.suggestions.map(s => (
                  <button
                    key={s}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    onClick={() => { setInputValue(s); setSearchParams({ suburb: s, city: defaultCity }); }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button onClick={handleSearch} size="icon" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Cards grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && cards.length === 0 ? (
          <div className="flex items-center justify-center h-40 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading {searchParams.suburb} properties...</span>
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
            <Building2 className="w-8 h-8 opacity-40" />
            <p className="text-sm">No addresses found for {searchParams.suburb}. Try another suburb.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              {data?.total} addresses in {searchParams.suburb}, {searchParams.city}
            </p>
            <div className="grid grid-cols-1 gap-3">
              {cards.map(card => (
                <MarketPropertyCard key={card.id} card={card} />
              ))}
            </div>
            <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-6 pb-4">
              Data sourced from LINZ (Land Information New Zealand). Addresses only — not active listings.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function MarketPropertyCard({ card }: { card: MarketCard }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${card.lat},${card.lng}`;
  const reportUrl = `/api/market/report?address=${encodeURIComponent(card.fullAddress)}&city=${encodeURIComponent(card.city)}`;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {card.fullAddress}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 ml-5">
            {card.suburb}, {card.city}
          </p>
        </div>
        <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 dark:border-blue-800 shrink-0">
          LINZ
        </Badge>
      </div>

      <div className="flex gap-2 mt-3">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg py-2 px-3 transition-colors"
        >
          <MapPin className="w-3 h-3" />
          View on map
        </a>
        <a
          href={reportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg py-2 px-3 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Free report
        </a>
      </div>
    </div>
  );
}
