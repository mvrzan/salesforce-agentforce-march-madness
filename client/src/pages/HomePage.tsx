import { Link } from "react-router-dom";

const FEATURES = [
  {
    icon: "📝",
    title: "Build Your Bracket",
    description: "Select winners through all 6 rounds across 4 regions. Your picks are saved automatically.",
    to: "/bracket",
    cta: "Start Picking",
    color: "blue",
  },
  {
    icon: "🤖",
    title: "AI-Powered Bracket",
    description: "Watch Agentforce analyze matchups in real time and generate picks with full reasoning.",
    to: "/ai-bracket",
    cta: "See AI Picks",
    color: "orange",
  },
  {
    icon: "⚖️",
    title: "Head-to-Head Compare",
    description: "Your bracket vs the AI side-by-side. See who called the upsets and who got burned.",
    to: "/compare",
    cta: "Compare Now",
    color: "purple",
  },
  {
    icon: "📡",
    title: "Live Performance",
    description: "Track scores in real time as games finish. Watch the AI adapt its predictions round by round.",
    to: "/live",
    cta: "Go Live",
    color: "green",
  },
];

const colorMap: Record<string, string> = {
  blue: "border-blue-700 hover:border-blue-500 hover:bg-blue-950/30",
  orange: "border-orange-700 hover:border-orange-500 hover:bg-orange-950/30",
  purple: "border-purple-700 hover:border-purple-500 hover:bg-purple-950/30",
  green: "border-green-700 hover:border-green-500 hover:bg-green-950/30",
};

const ctaColorMap: Record<string, string> = {
  blue: "bg-blue-600 hover:bg-blue-500",
  orange: "bg-orange-600 hover:bg-orange-500",
  purple: "bg-purple-600 hover:bg-purple-500",
  green: "bg-green-600 hover:bg-green-500",
};

const HomePage = () => (
  <div className="min-h-screen bg-gray-950 text-white">
    {/* Hero */}
    <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
      <div className="text-6xl mb-4">🏀</div>
      <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-4">
        March Madness <span className="text-orange-400">× Agentforce</span>
      </h1>
      <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
        Build your bracket, pit it against an AI agent powered by Salesforce Agentforce, and watch both adapt as the
        tournament unfolds — live, round by round.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          to="/bracket"
          className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl transition-colors"
        >
          Build My Bracket →
        </Link>
        <Link
          to="/ai-bracket"
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors border border-gray-700"
        >
          See AI Picks
        </Link>
      </div>
    </div>

    {/* Feature grid */}
    <div className="max-w-5xl mx-auto px-4 pb-20 grid grid-cols-1 sm:grid-cols-2 gap-5">
      {FEATURES.map(({ icon, title, description, to, cta, color }) => (
        <div
          key={to}
          className={`rounded-2xl border bg-gray-900 p-6 flex flex-col gap-4 transition-all duration-200 ${colorMap[color]}`}
        >
          <div className="text-3xl">{icon}</div>
          <div>
            <h2 className="text-lg font-bold text-white mb-1">{title}</h2>
            <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
          </div>
          <Link
            to={to}
            className={`mt-auto self-start px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${ctaColorMap[color]}`}
          >
            {cta} →
          </Link>
        </div>
      ))}
    </div>
  </div>
);

export default HomePage;
