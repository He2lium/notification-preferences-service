import { ConflictException, HttpException, Injectable } from '@nestjs/common';
import { DataSource, QueryRunner, ReplicationMode } from 'typeorm';
import { IsolationLevel } from 'typeorm/driver/types/IsolationLevel';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
export class DbService {
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
      const result = await logic(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (err) {
      console.error(err);
      await queryRunner.rollbackTransaction();
      if (err instanceof HttpException) throw err;
      throw new ConflictException(err);
    } finally {
      await queryRunner.release();
    }
  }
}
