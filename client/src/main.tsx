import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set document title
document.title = "Appointment Management Dashboard";

createRoot(document.getElementById("root")!).render(<App />);
