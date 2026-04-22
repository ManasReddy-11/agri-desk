export default function Logo() {
  return (
    <div className="flex flex-col items-center gap-3 mb-8">
      {/* Logo Icon */}
      <div className="flex items-center justify-center gap-2">
        {/* Orange Fruit Icon */}
        <div className="relative w-10 h-10">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Orange Circle */}
            <circle cx="50" cy="55" r="35" fill="#ff8c42" />
            {/* Orange highlights */}
            <circle cx="35" cy="40" r="8" fill="#ffb380" opacity="0.6" />
            {/* Green Leaf */}
            <ellipse
              cx="70"
              cy="28"
              rx="18"
              ry="24"
              fill="#22c55e"
              transform="rotate(-30 70 28)"
            />
            {/* Leaf vein */}
            <line
              x1="70"
              y1="10"
              x2="70"
              y2="46"
              stroke="#16a34a"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* App Name */}
        <div className="flex flex-col">
          <h1 className="text-4xl font-bold text-green-700">AgriDesk</h1>
        </div>
      </div>

      {/* Tagline */}
      <p className="text-sm text-gray-600 font-medium">
        Farm to Table Marketplace
      </p>
    </div>
  );
}
