import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SettingsApp } from "./SettingsApp";
import "./styles.css";

// One renderer, two windows: the notch, and the settings window at #settings.
const isSettings = location.hash === "#settings";

createRoot(document.getElementById("root")!).render(<StrictMode>{isSettings ? <SettingsApp /> : <App />}</StrictMode>);
