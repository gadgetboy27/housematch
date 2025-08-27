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
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 max-w-sm w-full px-6 py-3 bg-white/90 backdrop-blur-xl border-t border-border/50 z-50">
      <div className="flex items-center justify-around">
        {navigationItems.map((item) => {
          const isActive = location === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`flex flex-col items-center space-y-1 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
              data-testid={item.testId}
            >
              <i className={`fas ${item.icon} text-lg`}></i>
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
