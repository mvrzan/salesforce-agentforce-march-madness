import { type ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

const Layout = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-gray-950 flex flex-col overflow-x-hidden">
    <Header />
    {children}
    <Footer />
  </div>
);

export default Layout;
