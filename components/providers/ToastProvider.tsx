// components/providers/ToastProvider.tsx
// NEW: Global toast notification provider using react-hot-toast
"use client";
import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      gutter={8}
      toastOptions={{
        duration: 4000,
        style: {
          background: "#1B1B1B",
          color: "#F8F9FA",
          borderRadius: "0.75rem",
          padding: "12px 16px",
          fontSize: "0.875rem",
        },
        success: {
          iconTheme: { primary: "#2D6A4F", secondary: "#F8F9FA" },
        },
        error: {
          iconTheme: { primary: "#ef4444", secondary: "#F8F9FA" },
        },
      }}
    />
  );
}
