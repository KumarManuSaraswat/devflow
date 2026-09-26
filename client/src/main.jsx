import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import MotionProvider from "./components/motion/MotionProvider";
import "./index.css";
import NativeBridge from "./mobile/NativeBridge";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
     <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <NativeBridge />
        <MotionProvider>
          <App />
        </MotionProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            className: "font-sans",
          }}
        />
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
