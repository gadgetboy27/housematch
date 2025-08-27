interface PropertyMetricsProps {
  views: number;
  likes: number;
  saves: number;
}

export default function PropertyMetrics({ views, likes, saves }: PropertyMetricsProps) {
  return (
    <div className="space-y-2">
      <div className="px-2 py-1 rounded-full text-white text-xs flex items-center space-x-1 backdrop-blur-md bg-black/50 border border-white/10">
        <i className="fas fa-eye text-blue-400"></i>
        <span data-testid="text-metric-views">{views}</span>
      </div>
      <div className="px-2 py-1 rounded-full text-white text-xs flex items-center space-x-1 backdrop-blur-md bg-black/50 border border-white/10">
        <i className="fas fa-heart text-red-400"></i>
        <span data-testid="text-metric-likes">{likes}</span>
      </div>
      <div className="px-2 py-1 rounded-full text-white text-xs flex items-center space-x-1 backdrop-blur-md bg-black/50 border border-white/10">
        <i className="fas fa-bookmark text-yellow-400"></i>
        <span data-testid="text-metric-saves">{saves}</span>
      </div>
    </div>
  );
}
