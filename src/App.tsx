import React from "react";
import { HashRouter, BrowserRouter, Routes, Route } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;