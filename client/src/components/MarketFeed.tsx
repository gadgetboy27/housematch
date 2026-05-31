import { useQuery } from '@tanstack/react-query';
import { MapPin, Building2, ExternalLink, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface MarketCard {
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
  suburb: string | null;  // null = whole city
  city: string;
}

export function MarketFeed({ suburb, city }: MarketFeedProps) {
  const params = new URLSearchParams({ city, limit: '24' });
  if (suburb) params.set('suburb', suburb);

  const { data, isLoading } = useQuery({
    queryKey: ['/api/market/cards', suburb ?? 'all', city],
    queryFn: async () => {
      const res = await fetch(`/api/market/cards?${params}`);
      return res.json() as Promise<{ cards: MarketCard[]; total: number }>;
    },
    staleTime: 6 * 60 * 60 * 1000,
  });

  const cards = data?.cards ?? [];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Subtle header — no search bar */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {suburb ? `${suburb}, ${city}` : city} — NZ Market
          </span>
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 ml-auto">
            LINZ
          </Badge>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Real NZ property addresses. Tap any card for a free property report.
        </p>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading properties…</span>
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
            <Building2 className="w-8 h-8 opacity-30" />
            <p className="text-sm text-center">No addresses found. Try a different suburb using the search icon above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 pt-2">
            {cards.map(card => (
              <MarketPropertyCard key={card.id} card={card} />
            ))}
            <p className="text-xs text-center text-gray-400 dark:text-gray-500 pt-2 pb-6">
              {data?.total} addresses · Data from Land Information New Zealand
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MarketPropertyCard({ card }: { card: MarketCard }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${card.lat},${card.lng}`;
  const reportUrl = `/market-report?address=${encodeURIComponent(card.fullAddress)}&city=${encodeURIComponent(card.city)}`;
  const fallbackImage = `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250`;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Property Image */}
      <div className="relative w-full h-40 bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <img
          src={fallbackImage}
          alt={card.fullAddress}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
          <p className="text-sm font-bold truncate">{card.fullAddress}</p>
          <p className="text-xs text-gray-200">{card.suburb}, {card.city}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 p-3">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg py-2 transition-colors font-medium"
        >
          <MapPin className="w-3 h-3" />
          Map
        </a>
        <a
          href={reportUrl}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg py-2 transition-colors font-medium"
        >
          <ExternalLink className="w-3 h-3" />
          Report
        </a>
      </div>
    </div>
  );
}
