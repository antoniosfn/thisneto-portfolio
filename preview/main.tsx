import React from "react";
import { createRoot } from "react-dom/client";
import LandingPage from "../src/landing/LandingPage";
import "../src/landing/landing.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LandingPage />
  </React.StrictMode>,
);
