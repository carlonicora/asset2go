import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyReply, FastifyRequest } from "fastify";
import { catchError, Observable, tap, throwError } from "rxjs";
import { ConfigTempoInterface } from "src/common/config/interfaces/config.tempo.interface";
import { TracingService } from "../services/tracing.service";

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  private readonly serviceName: string;
  private readonly serviceVersion: string;

  constructor(
    private readonly tracingService: TracingService,
    private readonly configService: ConfigService,
  ) {
    const tempoConfig = this.configService.get<ConfigTempoInterface>("tempo");
    this.serviceName = tempoConfig?.serviceName || "asset2go-api";
    this.serviceVersion = tempoConfig?.serviceVersion || "1.0.0";
  }

  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> {
    if (!this.tracingService.isTracingEnabled()) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();
    const startTime = Date.now();

    // Start HTTP span
    const span = this.tracingService.startHttpSpan(request.method, request.url, request.ip);

    if (!span) {
      return next.handle();
    }

    // Add initial request attributes using OpenTelemetry semantic conventions
    this.tracingService.addSpanAttributes({
      "http.method": request.method,
      "http.url": request.url,
      "http.route": request.url,
      "http.target": request.url, // Standard HTTP target attribute
      "http.scheme": request.protocol || "http",
      "http.user_agent": request.headers["user-agent"] || "",
      "http.client_ip": request.ip,
      "http.host": request.headers.host || "",
      "operation.name": `${request.method} ${request.url}`, // Explicit operation name
      component: "nestjs-http",
      "span.kind": "server",
      "service.name": this.serviceName,
      "service.version": this.serviceVersion,
    });

    // Add forwarded headers if present
    const forwardedFor = request.headers["x-forwarded-for"];
    if (forwardedFor) {
      this.tracingService.addSpanAttribute("http.x_forwarded_for", String(forwardedFor));
    }

    const realIp = request.headers["x-real-ip"];
    if (realIp) {
      this.tracingService.addSpanAttribute("http.x_real_ip", String(realIp));
    }

    // Add request ID if present
    const requestId = request.headers["x-request-id"] || request.id;
    if (requestId) {
      this.tracingService.addSpanAttribute("http.request_id", String(requestId));
    }

    return next.handle().pipe(
      tap((result) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Add response attributes
        this.tracingService.addSpanAttributes({
          "http.status_code": response.statusCode || 200,
          "http.response_time_ms": responseTime,
          "response.success": true,
        });

        // Add result size if available
        if (result && typeof result === "object") {
          try {
            const resultSize = JSON.stringify(result).length;
            this.tracingService.addSpanAttribute("http.response_size_bytes", resultSize);
          } catch (error) {
            console.warn("Failed to calculate response size for tracing span", error);
            // Ignore JSON serialization errors
          }
        }

        // Mark span as successful
        this.tracingService.setSpanSuccess();

        // Add success event
        this.tracingService.addSpanEvent("request.completed", {
          response_time_ms: responseTime,
          status_code: response.statusCode || 200,
        });

        // End the span
        this.tracingService.endSpan(span);
      }),
      catchError((error) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Add error attributes
        this.tracingService.addSpanAttributes({
          "http.status_code": error.status || error.statusCode || 500,
          "http.response_time_ms": responseTime,
          "response.success": false,
          error: true,
        });

        // Set error status and details
        this.tracingService.setSpanError(error);

        // Add error event
        this.tracingService.addSpanEvent("request.error", {
          "error.name": error.name || "UnknownError",
          "error.message": error.message || "Unknown error occurred",
          response_time_ms: responseTime,
          status_code: error.status || error.statusCode || 500,
        });

        // End the span
        this.tracingService.endSpan(span);

        return throwError(() => error);
      }),
    );
  }
}
