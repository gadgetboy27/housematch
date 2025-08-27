import { useLocation } from "wouter";

const navigationItems = [
  {
    path: "/",
    icon: "fa-home",
    label: "Discover",
    testId: "nav-discover"
  },
  {
    path: "/liked",
    icon: "fa-heart",
    label: "Liked",
    testId: "nav-liked"
  },
  {
    path: "/add",
    icon: "fa-plus",
    label: "Add",
    testId: "nav-add"
  },
  {
    path: "/reports",
    icon: "fa-shopping-cart",
    label: "Reports",
    testId: "nav-reports"
  },
  {
    path: "/profile",
    icon: "fa-user",
    label: "Profile",
    testId: "nav-profile"
  },
];

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 max-w-sm w-full px-6 py-3 bg-white/75 backdrop-blur-2xl border-t border-white/20 shadow-2xl rounded-t-3xl z-[60]">
      <div className="flex items-center justify-around">
        {navigationItems.map((item) => {
          const isActive = location === item.path;
          
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
              <i className={`fas ${item.icon} text-lg`}></i>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
