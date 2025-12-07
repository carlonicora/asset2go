"use client";

import { useEffect } from "react";
import { getFaro, initFaro } from "@/lib/faro";

export function FaroProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const faro = initFaro();

    if (faro) {
      console.log("Grafana Faro initialized successfully");
    }
  }, []);

  return <>{children}</>;
}

// Helper function to manually log events to Faro
export function logFaroEvent(name: string, attributes?: Record<string, string>) {
  const faro = getFaro();
  if (faro) {
    faro.api.pushEvent(name, attributes);
  }
}

// Helper function to set user context in Faro
export function setFaroUser(userId: string, email?: string, username?: string) {
  const faro = getFaro();
  if (faro) {
    faro.api.setUser({
      id: userId,
      email,
      username,
    });
  }
}

// Helper function to manually log errors to Faro
export function logFaroError(error: Error, context?: Record<string, string>) {
  const faro = getFaro();
  if (faro) {
    faro.api.pushError(error, { context });
  }
}
