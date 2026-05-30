export default function LandingCard() {
  return (
    <div className="w-full h-full relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-8">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-8 max-w-sm">
        {/* Illustration: House from smartphone */}
        <div className="mb-4">
          <div className="relative w-32 h-40">
            {/* Smartphone */}
            <div className="absolute inset-0 mx-auto bg-black rounded-3xl border-8 border-gray-800 shadow-2xl flex items-center justify-center">
              {/* Screen */}
              <div className="w-full h-full bg-gradient-to-b from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center relative overflow-hidden m-2">
                {/* House shape coming out */}
                <svg viewBox="0 0 100 100" className="w-20 h-20 relative z-10">
                  <path
                    d="M 50 20 L 80 50 L 75 50 L 75 85 L 25 85 L 25 50 L 20 50 Z"
                    fill="#FFD700"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <rect x="35" y="55" width="12" height="15" fill="#8B4513" stroke="white" strokeWidth="1" />
                  <rect x="53" y="55" width="12" height="15" fill="#8B4513" stroke="white" strokeWidth="1" />
                  <path
                    d="M 50 35 L 60 45 L 40 45 Z"
                    fill="#FF6B6B"
                    stroke="white"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-4xl font-black text-white drop-shadow-lg leading-tight">
            Find Your Perfect Home
          </h1>
          <p className="text-xl font-bold text-white/90 drop-shadow">
            Made Simple
          </p>
        </div>

        {/* Description */}
        <div className="space-y-4">
          <p className="text-base text-white/95 font-semibold leading-relaxed drop-shadow">
            Swipe. Compare. Buy with confidence.
          </p>

          {/* Features */}
          <div className="space-y-3 text-sm text-white/90 font-medium">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">🏠</span>
              <span>Smart property matching</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">📊</span>
              <span>Market insights & reports</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">💬</span>
              <span>Connect with agents</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">⚡</span>
              <span>DIY buying made easy</span>
            </div>
          </div>
        </div>

        {/* CTA Text */}
        <div className="text-sm text-white/80 font-semibold drop-shadow italic pt-2">
          ← Swipe to get started →
        </div>
      </div>
    </div>
  );
}
