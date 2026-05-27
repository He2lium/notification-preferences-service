import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, QueryRunner, ReplicationMode } from 'typeorm';
import { IsolationLevel } from 'typeorm/driver/types/IsolationLevel';
import { InjectDataSource } from '@nestjs/typeorm';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

@Injectable()
export class DbService {
  private readonly logger = new Logger(DbService.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async transaction<R = void>(
    logic: (queryRunner: QueryRunner) => Promise<R>,
    isolationLevel?: IsolationLevel,
    mode?: ReplicationMode,
  ) {
    const queryRunner = this.dataSource.createQueryRunner(mode);
    await queryRunner.connect();
    await queryRunner.startTransaction(isolationLevel);
    try {
      // TODO [Metrics]: metricsService.timing('db_transaction_duration_seconds', () => logic(queryRunner))
      const result = await logic(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();

      if (err instanceof HttpException) throw err;
      if (err instanceof EntityNotFoundError)
        throw new NotFoundException(err.message);
      if (err instanceof QueryFailedError) throw this.mapQueryFailedError(err);

      this.logger.error(
        'Unexpected transaction error',
        err instanceof Error ? err.stack : undefined,
      );
      throw new InternalServerErrorException();
    } finally {
      await queryRunner.release();
    }
  }

  private mapQueryFailedError(err: QueryFailedError): HttpException {
    const pgCode = (err.driverError as { code?: string } | undefined)?.code;

    switch (pgCode) {
      case '23505':
        return new ConflictException(err.message);
      case '23503':
      case '23502':
        return new UnprocessableEntityException(err.message);
      case '40001':
        return new ConflictException(err.message);
      default:
        if (pgCode?.startsWith('08'))
          return new ServiceUnavailableException(err.message);
        this.logger.error('Query failed', err.stack);
        return new InternalServerErrorException();
    }
  }
}
