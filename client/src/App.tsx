import { Navigate, Routes, Route } from "react-router";
import { BracketProvider } from "./context/BracketContext";
import Layout from "./layout/Layout";
import HomePage from "./pages/HomePage";
import BracketPage from "./pages/BracketPage";
import AIBracketPage from "./pages/AIBracketPage";
import ComparePage from "./pages/ComparePage";
import LivePage from "./pages/LivePage";

const App = () => (
  <BracketProvider>
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bracket" element={<BracketPage />} />
        <Route path="/ai-bracket" element={<AIBracketPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  </BracketProvider>
);

export default App;
