import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BracketProvider } from "./context/BracketContext";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import BracketPage from "./pages/BracketPage";
import AIBracketPage from "./pages/AIBracketPage";
import ComparePage from "./pages/ComparePage";
import LivePage from "./pages/LivePage";

const App = () => (
  <BracketProvider>
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 flex flex-col overflow-x-hidden">
        <NavBar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/bracket" element={<BracketPage />} />
            <Route path="/ai-bracket" element={<AIBracketPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/live" element={<LivePage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  </BracketProvider>
);

export default App;
