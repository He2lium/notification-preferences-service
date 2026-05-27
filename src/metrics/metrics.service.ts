import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly counters = new Map<string, number>();

  increment(name: string, tags?: Record<string, string>): void {
    const key = tags ? `${name}:${JSON.stringify(tags)}` : name;
    const next = (this.counters.get(key) ?? 0) + 1;
    this.counters.set(key, next);
    this.logger.log(`${name} ${JSON.stringify(tags ?? {})} = ${next}`);
  }

  async timing<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      const duration = (Date.now() - start) / 1000;
      this.logger.log(`${name} duration=${duration.toFixed(3)}s`);
    }
  }
}
