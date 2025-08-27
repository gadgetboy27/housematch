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
    <nav className="absolute bottom-0 left-0 right-0 px-6 py-3 bg-white/95 backdrop-blur-lg border-t border-border">
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
