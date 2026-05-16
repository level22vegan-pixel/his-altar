import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getOrgToken } from "@/lib/session";

setAuthTokenGetter(getOrgToken);

createRoot(document.getElementById("root")!).render(<App />);
