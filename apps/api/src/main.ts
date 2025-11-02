import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from monorepo root (../../.env relative to dist/main.js)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Initialize tracing before any other imports
import { tracingSetup } from "./core/tracing/tracing.setup";
tracingSetup.initialize();

import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory, Reflector } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { BaseConfigInterface } from "src/common/config/interfaces/base.config.interface";
import { ConfigApiInterface } from "src/common/config/interfaces/config.api.interface";
import { ConfigRateLimitInterface } from "src/common/config/interfaces/config.ratelimit.interface";
import { HttpExceptionFilter } from "src/common/filters/http-exception.filter";
import { CacheInterceptor } from "src/core/cache/interceptors/cache.interceptor";
import { CacheService } from "src/core/cache/services/cache.service";
import { CorsService } from "src/core/cors/services/cors.service";
import { LoggingInterceptor } from "src/core/logging/interceptors/logging.interceptor";
import { AppLoggingService } from "src/core/logging/services/logging.service";
import { TracingInterceptor } from "src/core/tracing/interceptors/tracing.interceptor";
import { EventEmitter } from "stream";
import { AppModule } from "./app.module";
import { AppMode, AppModeConfig } from "./core/appmode/constants/app.mode.constant";

function getAppMode(): AppMode {
  const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
  if (modeArg) {
    const mode = modeArg.split("=")[1];
    if (mode === AppMode.WORKER) return AppMode.WORKER;
    if (mode === AppMode.API) return AppMode.API;
  }

  if (process.argv.includes("--worker")) return AppMode.WORKER;

  if (process.argv.includes("--api")) return AppMode.API;

  return AppMode.API;
}

function getAppModeConfig(mode: AppMode): AppModeConfig {
  switch (mode) {
    case AppMode.API:
      return {
        mode: AppMode.API,
        enableControllers: true,
        enableWorkers: false,
        enableCronJobs: false,
      };
    case AppMode.WORKER:
      return {
        mode: AppMode.WORKER,
        enableControllers: false,
        enableWorkers: true,
        enableCronJobs: true,
      };
    default:
      throw new Error(`Unknown app mode: ${mode}`);
  }
}

async function bootstrapAPI(modeConfig: AppModeConfig): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.forRoot(modeConfig),
    new FastifyAdapter({
      routerOptions: {
        ignoreTrailingSlash: true,
      },
      bodyLimit: 100 * 1024 * 1024,
    }),
    {
      logger: ["error", "warn"],
    },
  );

  const configService = app.get(ConfigService<BaseConfigInterface>);

  await app.register(require("@fastify/multipart"), {
    limits: {
      fileSize: 100 * 1024 * 1024,
      fieldSize: 10 * 1024 * 1024,
      files: 10,
      fields: 20,
    },
    attachFieldsToBody: false,
  });

  const loggingService = app.get(AppLoggingService);
  app.useLogger(loggingService);

  // Add Fastify onSend hook to capture when responses are actually sent and log immediately
  app
    .getHttpAdapter()
    .getInstance()
    .addHook("onSend", async (request, reply, payload) => {
      const startTime = request.raw["requestStartTime"];

      if (startTime) {
        const responseTime = Date.now() - startTime;
        const statusCode = reply.statusCode || 200;
        let resultSize = 0;
        try {
          resultSize = payload ? (typeof payload === "string" ? payload.length : JSON.stringify(payload).length) : 0;
        } catch {
          resultSize = 0; // Fallback if payload can't be stringified
        }

        // Extract request details
        const requestMethod = request.method;
        const requestPath = request.url;
        const userIp = request.ip;

        // Log successful request with accurate timing
        loggingService.logHttpRequest(requestMethod, requestPath, statusCode, responseTime, userIp);

        // Enhanced logging with additional context
        loggingService.logWithContext(`✅ Request completed successfully`, "HTTP_SUCCESS", {
          responseTime,
          statusCode,
          resultSize,
          loggedFromOnSend: true,
        });

        // Clear context after successful logging (no longer needed)
        loggingService.clearRequestContext();
      }
      return payload;
    });

  app.useGlobalFilters(new HttpExceptionFilter(loggingService));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      validateCustomDecorators: true,
    }),
  );

  const rateLimitConfig = configService.get<ConfigRateLimitInterface>("rateLimit");
  if (rateLimitConfig?.enabled) {
    loggingService.log(`Rate limiting enabled: ${rateLimitConfig.limit} requests per ${rateLimitConfig.ttl}ms`);
  } else {
    loggingService.log("Rate limiting disabled");
  }

  // Apply interceptors in the correct order: Tracing → Cache → Logging
  const tracingInterceptor = app.get(TracingInterceptor);
  app.useGlobalInterceptors(tracingInterceptor);

  const cacheService = app.get(CacheService);
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new CacheInterceptor(cacheService, reflector, loggingService));

  // Use the new injectable logging interceptor
  const loggingInterceptor = app.get(LoggingInterceptor);
  app.useGlobalInterceptors(loggingInterceptor);

  const corsService = app.get(CorsService);
  corsService.validateConfiguration();
  app.enableCors(corsService.getCorsConfiguration());

  const port = configService.get<ConfigApiInterface>("api").port;
  await app.listen(port, "0.0.0.0");

  console.log(`🚀 API server started on port ${port}`);
  loggingService.log(`API server started on port ${port}`);

  process.on("SIGTERM", async () => {
    try {
      await app.close();
      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  });

  process.on("SIGINT", async () => {
    try {
      await app.close();
      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  });
}

async function bootstrapWorker(modeConfig: AppModeConfig): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule.forRoot(modeConfig), {
    logger: ["error", "warn"],
  });

  // Use the new injectable logging service for worker mode
  const loggingService = app.get(AppLoggingService);
  app.useLogger(loggingService);

  console.log("🔧 Worker process started");
  loggingService.log("Worker process started");

  process.on("SIGTERM", async () => {
    try {
      await app.close();
      process.exit(0);
    } catch (error) {
      console.error("Error during worker shutdown:", error);
      process.exit(1);
    }
  });

  process.on("SIGINT", async () => {
    try {
      await app.close();
      process.exit(0);
    } catch (error) {
      console.error("Error during worker shutdown:", error);
      process.exit(1);
    }
  });
}

async function bootstrap(): Promise<void> {
  EventEmitter.defaultMaxListeners = 50;

  const mode = getAppMode();
  const modeConfig = getAppModeConfig(mode);

  try {
    if (mode === AppMode.WORKER) {
      await bootstrapWorker(modeConfig);
    } else {
      await bootstrapAPI(modeConfig);
    }
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

bootstrap();
