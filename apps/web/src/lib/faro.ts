import { getWebInstrumentations, initializeFaro } from "@grafana/faro-web-sdk";
import { ReactIntegration } from "@grafana/faro-react";
import { TracingInstrumentation } from "@grafana/faro-web-tracing";

let faroInstance: ReturnType<typeof initializeFaro> | null = null;

export function initFaro() {
  if (typeof window === "undefined") {
    return null;
  }

  if (faroInstance) {
    return faroInstance;
  }

  const faroUrl = process.env.NEXT_PUBLIC_FARO_URL;
  const appName = process.env.NEXT_PUBLIC_FARO_APP_NAME || "asset2go-web";
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV || "development";

  // Only initialize if Faro URL is configured
  if (!faroUrl) {
    console.warn("Faro URL not configured. Skipping Faro initialization.");
    return null;
  }

  faroInstance = initializeFaro({
    url: faroUrl,
    app: {
      name: appName,
      version: appVersion,
      environment,
    },
    instrumentations: [
      // Load default Web instrumentations (errors, console, web vitals, etc.)
      ...getWebInstrumentations({
        captureConsole: true,
      }),
      // Add React integration for React-specific error tracking
      new ReactIntegration(),
      // Add tracing instrumentation for distributed tracing
      new TracingInstrumentation(),
    ],
  });

  return faroInstance;
}

export function getFaro() {
  return faroInstance;
}
