import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        let redisUrl = process.env.REDIS_URL;
        if (redisUrl) {
          if (redisUrl.startsWith('valkey://')) {
            redisUrl = redisUrl.replace(/^valkey:\/\//, 'redis://');
          } else if (redisUrl.startsWith('valkeys://')) {
            redisUrl = redisUrl.replace(/^valkeys:\/\//, 'rediss://');
          }
        }

        const client = redisUrl
          ? new Redis(redisUrl, {
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            })
          : new Redis({
              host: process.env.REDIS_HOST || 'localhost',
              port: Number(process.env.REDIS_PORT || 6379),
              password: process.env.REDIS_PASSWORD || undefined,
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            });

        client.on('error', (err) => {
          console.error('[Redis/Valkey] Connection error:', err.message);
        });

        client.on('connect', () => {
          console.log('[Redis/Valkey] Connected successfully');
        });

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
