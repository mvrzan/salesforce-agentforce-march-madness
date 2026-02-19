import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: "🏠", end: true },
  { to: "/bracket", label: "My Bracket", icon: "📝", end: false },
  { to: "/ai-bracket", label: "AI Bracket", icon: "🤖", end: false },
  { to: "/compare", label: "Compare", icon: "⚖️", end: false },
  { to: "/live", label: "Live", icon: "📡", end: false },
];

const NavBar = () => (
  <nav className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur border-b border-gray-800">
    <div className="max-w-screen-2xl mx-auto px-4 flex items-center justify-between h-14">
      <div className="flex items-center gap-2">
        <span className="text-xl">🏀</span>
        <span className="font-black text-white tracking-tight text-sm sm:text-base">
          March Madness <span className="text-orange-400">AI</span>
        </span>
      </div>

      <div className="flex items-center gap-1">
        {NAV_ITEMS.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`
            }
          >
            <span className="hidden sm:inline">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  </nav>
);

export default NavBar;
