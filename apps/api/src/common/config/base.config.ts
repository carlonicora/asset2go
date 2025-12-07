export const baseConfig = {
  environment: {
    type: (process.env.NODE_ENV === "worker" ? "worker" : "api") as "worker" | "api",
  },
  api: {
    url: process.env.API_URL
      ? process.env.API_URL.endsWith("/")
        ? process.env.API_URL
        : `${process.env.API_URL}/`
      : "http://localhost:3000/",
    port: parseInt(process.env.API_PORT || "3000"),
    env: process.env.ENV || "development",
  },
  app: {
    url: process.env.APP_URL
      ? process.env.APP_URL.trim().replace(/\/+$/, "") // Trim whitespace & remove trailing slashes
      : "http://localhost:3000",
  },
  neo4j: {
    uri: process.env.NEO4J_URI || "",
    username: process.env.NEO4J_USER || "",
    password: process.env.NEO4J_PASSWORD || "",
    database: process.env.NEO4J_DATABASE || "",
  },
  redis: {
    host: process.env.REDIS_HOST || "",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || "",
    username: process.env.REDIS_USERNAME || "",
    queue: process.env.REDIS_QUEUE || "default",
  },
  cache: {
    enabled: process.env.CACHE_ENABLED !== "false",
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || "600"),
    skipPatterns: (process.env.CACHE_SKIP_PATTERNS || "/access,/auth,/notifications,/websocket,/version").split(","),
  },
  cors: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
      : ["http://localhost:3000"],
    originPatterns: process.env.CORS_ORIGIN_PATTERNS
      ? process.env.CORS_ORIGIN_PATTERNS.split(",").map((pattern) => pattern.trim())
      : [],
    credentials: process.env.CORS_CREDENTIALS !== "false",
    methods: process.env.CORS_METHODS || "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: process.env.CORS_ALLOWED_HEADERS || "Content-Type,Authorization,X-Requested-With",
    maxAge: parseInt(process.env.CORS_MAX_AGE || "86400"),
    preflightContinue: process.env.CORS_PREFLIGHT_CONTINUE === "true",
    optionsSuccessStatus: parseInt(process.env.CORS_OPTIONS_SUCCESS_STATUS || "204"),
    logViolations: process.env.CORS_LOG_VIOLATIONS !== "false",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "",
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  },
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
    email: process.env.VAPID_EMAIL || "",
  },
  email: {
    emailProvider: (process.env.EMAIL_PROVIDER as "sendgrid" | "smtp" | "brevo") || "smtp",
    emailApiKey: process.env.EMAIL_API_KEY || "",
    emailFrom: process.env.EMAIL_FROM || "",
    emailHost: process.env.EMAIL_HOST || "",
    emailPort: +process.env.EMAIL_PORT || 0,
    emailSecure: process.env.EMAIL_SECURE === "true",
    emailUsername: process.env.EMAIL_USERNAME || "",
    emailPassword: process.env.EMAIL_PASSWORD || "",
  },
  logging: {
    loki: {
      enabled: process.env.LOKI_ENABLED === "true",
      host: process.env.LOKI_HOST || "http://localhost:3100",
      username: process.env.LOKI_USERNAME || "",
      password: process.env.LOKI_PASSWORD || "",
      batching: process.env.LOKI_BATCHING !== "false",
      interval: parseInt(process.env.LOKI_INTERVAL || "30"),
      labels: {
        application: process.env.LOKI_APP_LABEL || "asset2go-api",
        environment: process.env.ENV || "development",
      },
    },
  },
  tempo: {
    enabled: process.env.TEMPO_ENABLED === "true",
    endpoint: process.env.TEMPO_ENDPOINT || "http://localhost:4318/v1/traces",
    serviceName: process.env.TEMPO_SERVICE_NAME || "asset2go-api",
    serviceVersion: process.env.TEMPO_SERVICE_VERSION || "1.0.0",
  },
  s3: {
    type: process.env.S3_TYPE || "",
    endpoint: process.env.S3_ENDPOINT || "",
    bucket: process.env.S3_BUCKET || "",
    key: process.env.S3_ACCESS_KEY_ID || "",
    secret: process.env.S3_SECRET_ACCESS_KEY || "",
    region: process.env.S3_REGION || "us-east-1",
  },
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== "false",
    ttl: parseInt(process.env.RATE_LIMIT_TTL || "60000"),
    limit: parseInt(process.env.RATE_LIMIT_REQUESTS || "100"),
    ipLimit: parseInt(process.env.IP_RATE_LIMIT_REQUESTS || "20"),
  },
};
