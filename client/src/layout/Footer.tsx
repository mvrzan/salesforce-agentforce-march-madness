import agentforceLogo from "../assets/agentforce_logo.webp";
import appLinkLogo from "../assets/applink.png";
import dataCloudLogo from "../assets/data_cloud_logo.png";
import githubLogo from "../assets/github_dark.webp";
import herokuLogo from "../assets/heroku.webp";
import salesforceLogo from "../assets/salesforce_logo.svg";

const TECH_LOGOS = [
  { src: salesforceLogo, alt: "Salesforce", label: "Salesforce", href: "https://www.salesforce.com" },
  { src: agentforceLogo, alt: "Agentforce", label: "Agentforce", href: "https://www.salesforce.com/agentforce" },
  { src: dataCloudLogo, alt: "Data 360", label: "Data 360", href: "https://www.salesforce.com/data" },
  { src: herokuLogo, alt: "Heroku", label: "Heroku", href: "https://www.heroku.com" },
  { src: appLinkLogo, alt: "AppLink", label: "AppLink", href: "https://devcenter.heroku.com/articles/heroku-applink" },
];

const Footer = () => (
  <footer className="border-t border-gray-800 bg-gray-950 mt-auto">
    <div className="max-w-screen-2xl mx-auto px-6 py-8">
      {/* Top row: branding + powered-by logos */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: app identity */}
        <div className="flex flex-col items-center md:items-start gap-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏀</span>
            <span className="font-black text-white tracking-tight text-lg">
              March Madness <span className="text-orange-400">AI</span>
            </span>
          </div>
          <p className="text-gray-500 text-xs text-center md:text-left">
            AI-powered bracket predictions &amp; live game adaptation
          </p>
        </div>

        {/* Right: powered-by logos */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-gray-600 text-xs uppercase tracking-widest font-semibold">Powered by</span>
          <div className="flex items-center gap-6">
            {TECH_LOGOS.map(({ src, alt, label, href }) => (
              <a
                key={alt}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 group"
              >
                <img
                  src={src}
                  alt={alt}
                  className="h-7 w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                />
                <span className="text-gray-600 text-xs group-hover:text-gray-400 transition-colors">{label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-800 my-6" />

      {/* Bottom row: copyright + GitHub link */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-gray-600 text-xs">
          &copy; {new Date().getFullYear()} March Madness AI Demo &mdash; Intelligent agents. Real-time data. Endless
          possibilities &mdash; <span className="text-orange-400">Agentforce</span> &amp;{" "}
          <span className="text-blue-400">Data 360</span>.
        </p>

        <a
          href="https://github.com/mvrzan"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors"
        >
          <img
            src={githubLogo}
            alt="GitHub"
            className="h-5 w-5 object-contain opacity-70 hover:opacity-100 transition-opacity"
          />
          <span className="text-xs">Built by Matija Vrzan</span>
        </a>
      </div>
    </div>
  </footer>
);

export default Footer;
