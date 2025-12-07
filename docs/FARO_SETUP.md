# Grafana Faro - Frontend Observability Setup Guide

This guide explains how to use Grafana Faro for frontend observability in the Asset2Go web application.

## Overview

Grafana Faro automatically captures:
- **Errors**: JavaScript errors, unhandled promise rejections, console errors
- **Performance**: Core Web Vitals (LCP, FID, CLS), page load times, resource timing
- **User Sessions**: Session replay, user interactions, navigation events
- **Custom Events**: Application-specific events and metrics
- **Traces**: Distributed tracing integrated with backend Tempo traces

## Quick Start

### 1. Configure Environment Variables

Add these variables to your `.env` file:

```bash
# Grafana Faro Configuration
NEXT_PUBLIC_FARO_URL=http://localhost:12345/collect
NEXT_PUBLIC_FARO_APP_NAME=asset2go-web
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENVIRONMENT=development
```

**Production Example:**
```bash
NEXT_PUBLIC_FARO_URL=https://faro-collector.yourdomain.com/collect
NEXT_PUBLIC_ENVIRONMENT=production
```

### 2. Start the Faro Collector (LGTM Infrastructure Stack)

**For Local Development:**
The Faro collector runs in the LGTM infrastructure stack alongside Grafana, Loki, and Tempo.

```bash
# Navigate to the LGTM infrastructure directory
cd infrastructure/lgtm-docker

# Copy the .env.example if you haven't already
cp .env.example .env

# Start the entire LGTM stack (includes Faro collector)
docker compose up -d
```

Verify the collector is running:
```bash
curl http://localhost:12345/health
```

**For Production (Docker Compose):**
When running the full application stack via docker-compose.yml, the Faro collector is also included:

```bash
# From monorepo root
docker compose up faro-collector
```

### 3. Start the Web Application

```bash
# From the monorepo root
pnpm dev:web
```

The Faro SDK will automatically initialize and start capturing telemetry.

## Testing the Integration

### 1. Verify Faro Initialization

Open your browser console and look for:
```
Grafana Faro initialized successfully
```

### 2. Test Error Tracking

Create a test error in any component:

```tsx
// Add this to any page or component
const TestErrorButton = () => {
  const handleError = () => {
    throw new Error("Test error for Faro");
  };

  return <button onClick={handleError}>Trigger Test Error</button>;
};
```

Click the button and check:
- Browser console for the error
- Faro collector logs: `docker compose logs faro-collector`
- Grafana Loki for the error log

### 3. Test Custom Events

```tsx
import { logFaroEvent } from "@/components/providers/FaroProvider";

function MyComponent() {
  const handleAction = () => {
    logFaroEvent("user_action", {
      action: "button_clicked",
      component: "MyComponent",
      value: "test_value"
    });
  };

  return <button onClick={handleAction}>Log Event</button>;
}
```

### 4. Test User Context

Set user context after authentication:

```tsx
import { setFaroUser } from "@/components/providers/FaroProvider";

// After successful login
setFaroUser(
  user.id,
  user.email,
  user.username
);
```

### 5. Test Manual Error Logging

```tsx
import { logFaroError } from "@/components/providers/FaroProvider";

try {
  // Some risky operation
  await riskyOperation();
} catch (error) {
  logFaroError(error, {
    operation: "riskyOperation",
    userId: user.id,
    timestamp: new Date().toISOString()
  });
}
```

## Usage Examples

### Custom Event Tracking

Track business-critical events:

```tsx
import { logFaroEvent } from "@/components/providers/FaroProvider";

// Track form submissions
logFaroEvent("form_submitted", {
  formName: "contact_form",
  success: "true"
});

// Track feature usage
logFaroEvent("feature_used", {
  feature: "document_upload",
  fileType: "pdf",
  fileSize: "1.2MB"
});

// Track user engagement
logFaroEvent("user_engagement", {
  action: "video_played",
  duration: "30s"
});
```

### Error Boundary Integration

Wrap your app with an error boundary that logs to Faro:

```tsx
import { Component, ReactNode } from "react";
import { logFaroError } from "@/components/providers/FaroProvider";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    logFaroError(error, {
      errorInfo: JSON.stringify(errorInfo),
      boundary: "ErrorBoundary"
    });
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}
```

### Performance Monitoring

Faro automatically tracks Core Web Vitals. To track custom performance metrics:

```tsx
import { getFaro } from "@/lib/faro";

// Track custom timing
const faro = getFaro();
if (faro) {
  const startTime = performance.now();

  // ... your operation

  const duration = performance.now() - startTime;
  faro.api.pushMeasurement({
    type: "custom_metric",
    values: {
      operation_duration: duration
    }
  });
}
```

## Viewing Telemetry in Grafana

### 1. Access Grafana

Navigate to your Grafana instance (typically `http://localhost:3000`).

### 2. View Logs in Loki

1. Go to **Explore** > Select **Loki** data source
2. Query examples:
   ```
   {app="asset2go-web"}
   {app="asset2go-web", level="error"}
   {app="asset2go-web"} |= "error"
   ```

### 3. View Traces in Tempo

1. Go to **Explore** > Select **Tempo** data source
2. Search by:
   - Trace ID
   - Service name: `asset2go-web`
   - Tags: `environment=development`

### 4. Create Dashboards

Create dashboards for:
- **Error Rate**: Count of errors over time
- **Performance**: Web vitals (LCP, FID, CLS) trends
- **User Sessions**: Active sessions, session duration
- **Custom Events**: Business metrics

Example Loki query for error rate:
```
rate({app="asset2go-web", level="error"}[5m])
```

## Troubleshooting

### Faro Not Initializing

**Check console for warnings:**
```
Faro URL not configured. Skipping Faro initialization.
```

**Solution:**
- Verify `NEXT_PUBLIC_FARO_URL` is set in `.env`
- Restart the dev server after changing env vars

### Collector Not Receiving Data

**Check collector health:**
```bash
docker compose logs faro-collector
```

**Common issues:**
1. Collector not running: `docker compose up faro-collector`
2. Wrong URL: Verify `NEXT_PUBLIC_FARO_URL` matches collector endpoint
3. CORS issues: Check browser network tab for blocked requests

### No Logs in Loki

**Check Loki integration:**
```bash
# Verify Loki environment variables
docker compose exec faro-collector env | grep LOKI

# Expected output:
# FARO_LOKI_ENABLED=true
# FARO_LOKI_URL=http://loki:3100
```

**Solutions:**
1. Ensure `LOKI_ENABLED=true` in `.env`
2. Verify Loki is running and accessible
3. Check Faro collector logs for connection errors

### No Traces in Tempo

**Check Tempo integration:**
```bash
docker compose exec faro-collector env | grep TEMPO
```

**Solutions:**
1. Ensure `TEMPO_ENABLED=true` in `.env`
2. Verify Tempo endpoint is correct
3. Check Faro collector logs for trace export errors

## Production Deployment

### 1. Use Production Collector URL

Update `.env` for production:
```bash
NEXT_PUBLIC_FARO_URL=https://faro-collector.yourdomain.com/collect
NEXT_PUBLIC_ENVIRONMENT=production
```

### 2. Secure the Collector

Add authentication/authorization to the Faro collector:
- Use API keys
- Implement rate limiting
- Add IP allowlisting

### 3. Configure Sampling

For high-traffic applications, configure sampling to reduce data volume:

```typescript
// In faro.ts
initializeFaro({
  // ... other config
  sessionTracking: {
    samplingRate: 0.1 // Sample 10% of sessions
  }
});
```

### 4. Monitor Collector Health

Set up alerts for:
- Collector downtime
- High error rates
- Queue backlog

## Best Practices

1. **Set User Context Early**: Call `setFaroUser()` immediately after authentication
2. **Use Meaningful Event Names**: Use consistent naming conventions for events
3. **Add Context to Errors**: Include relevant context when logging errors manually
4. **Avoid PII**: Don't log sensitive personal information
5. **Monitor Performance Impact**: Faro adds minimal overhead, but monitor bundle size
6. **Use Environments**: Differentiate dev/staging/production with `NEXT_PUBLIC_ENVIRONMENT`

## Additional Resources

- [Grafana Faro Documentation](https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/)
- [Web Vitals Guide](https://web.dev/vitals/)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/instrumentation/js/)
