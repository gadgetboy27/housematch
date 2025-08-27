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
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 max-w-sm w-full px-6 py-3 bg-purple-700/80 backdrop-blur-xl">
      <div className="flex items-center justify-around">
        {navigationItems.map((item) => {
          const isActive = location === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-all duration-300 
                         backdrop-blur-sm bg-white/10 border border-white/20 shadow-lg
                         hover:bg-white/20 hover:shadow-xl hover:scale-105 hover:border-white/30
                         active:scale-95 active:bg-white/5 relative overflow-hidden
                         before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-white/5 before:to-transparent before:pointer-events-none
                         ${isActive ? "text-white bg-white/15 shadow-xl" : "text-white/60"}`}
              data-testid={item.testId}
              style={{
                boxShadow: isActive 
                  ? '0 8px 32px rgba(255, 255, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.25)' 
                  : '0 4px 16px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}
            >
              <i className={`fas ${item.icon} text-lg drop-shadow-sm`}></i>
              <span className="text-xs drop-shadow-sm">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
