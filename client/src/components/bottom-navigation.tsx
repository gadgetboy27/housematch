import { useLocation } from "wouter";
import { Home, Heart, Plus, ShoppingCart, User } from "lucide-react";

const navigationItems = [
  {
    path: "/",
    icon: Home,
    label: "Discover",
    testId: "nav-discover"
  },
  {
    path: "/liked",
    icon: Heart,
    label: "Liked",
    testId: "nav-liked"
  },
  {
    path: "/add",
    icon: Plus,
    label: "Add",
    testId: "nav-add"
  },
  {
    path: "/reports",
    icon: ShoppingCart,
    label: "Reports",
    testId: "nav-reports"
  },
  {
    path: "/profile",
    icon: User,
    label: "Profile",
    testId: "nav-profile"
  },
];

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 max-w-sm w-full px-6 py-3 bg-white/75 backdrop-blur-2xl border-t border-white/20 shadow-2xl rounded-t-3xl z-40">
      <div className="flex items-center justify-around">
        {navigationItems.map((item) => {
          const isActive = location === item.path;
          const IconComponent = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`flex flex-col items-center space-y-1 transition-all duration-300 ${
                isActive 
                  ? "text-purple-700 scale-110" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
              data-testid={item.testId}
            >
              <IconComponent className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
