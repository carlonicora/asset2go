import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ThrottlerGuard } from "@nestjs/throttler";
import { ConfigJwtInterface } from "src/common/config/interfaces/config.jwt.interface";
import { JwtStrategy } from "src/common/strategies/jwt.strategy";
import { BlockNoteModule } from "src/core/blocknote/blocknote.module";
import { CacheModule } from "src/core/cache/cache.module";
import { CorsModule } from "src/core/cors/cors.module";
import { EmailModule } from "src/core/email/email.module";
import { JsonApiModule } from "src/core/jsonapi/jsonapi.module";
import { LoggingModule } from "src/core/logging/logging.module";
import { MigratorModule } from "src/core/migrator/migrator.module";
import { Neo4JModule } from "src/core/neo4j/neo4j.module";
import { QueueModule } from "src/core/queue/queue.module";
import { RedisModule } from "src/core/redis/redis.module";
import { SecurityModule } from "src/core/security/security.module";
import { TracingModule } from "src/core/tracing/tracing.module";
import { WebsocketModule } from "src/core/websocket/websocket.module";
import { VersionModule } from "./version/version.module";

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const jwtConfig = config.get<ConfigJwtInterface>("jwt");
        return {
          secret: jwtConfig.secret,
          signOptions: { expiresIn: jwtConfig.expiresIn as any },
        };
      },
    }),
    PassportModule,

    BlockNoteModule,
    CacheModule,
    CorsModule,
    EmailModule,
    JsonApiModule,
    LoggingModule,
    MigratorModule,
    Neo4JModule,
    QueueModule,
    RedisModule,
    SecurityModule,
    TracingModule,
    VersionModule,
    WebsocketModule,
  ],
  providers: [
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [
    JwtModule,
    PassportModule,

    BlockNoteModule,
    CacheModule,
    CorsModule,
    EmailModule,
    JsonApiModule,
    LoggingModule,
    Neo4JModule,
    RedisModule,
    SecurityModule,
    TracingModule,
    VersionModule,
    WebsocketModule,
  ],
})
export class CoreModules {}
