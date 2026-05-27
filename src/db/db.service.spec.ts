import { Test, TestingModule } from '@nestjs/testing';
import { DbService } from './db.service';
import { getDataSourceToken } from '@nestjs/typeorm';
import {
  ConflictException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { UserEntity } from '../user/entities/user.entity';

describe('DbService', () => {
  let service: DbService;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DbService,
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('transaction', () => {
    it('должен закоммитить и вернуть результат при успехе', async () => {
      const result = await service.transaction(async (q) => {
        expect(q).toBe(mockQueryRunner);
        return 42;
      });

      expect(result).toBe(42);
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('должен пробросить HttpException без изменений', async () => {
      const httpErr = new HttpException('custom', 418);

      await expect(
        service.transaction(async () => {
          throw httpErr;
        }),
      ).rejects.toBe(httpErr);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('должен маппить EntityNotFoundError в NotFoundException', async () => {
      const entityErr = new EntityNotFoundError(UserEntity, { id: 1 });

      await expect(
        service.transaction(async () => {
          throw entityErr;
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    describe('QueryFailedError', () => {
      it('23505 (unique_violation) → 409 ConflictException', async () => {
        const qfErr = new QueryFailedError('query', [], {
          ...new Error('duplicate key'),
          code: '23505',
        });

        await expect(
          service.transaction(async () => {
            throw qfErr;
          }),
        ).rejects.toThrow(ConflictException);
      });

      it('23503 (foreign_key_violation) → 422 UnprocessableEntityException', async () => {
        const qfErr = new QueryFailedError('query', [], {
          ...new Error('fk violation'),
          code: '23503',
        });

        await expect(
          service.transaction(async () => {
            throw qfErr;
          }),
        ).rejects.toThrow(UnprocessableEntityException);
      });

      it('23502 (not_null_violation) → 422 UnprocessableEntityException', async () => {
        const qfErr = new QueryFailedError('query', [], {
          ...new Error('not null'),
          code: '23502',
        });

        await expect(
          service.transaction(async () => {
            throw qfErr;
          }),
        ).rejects.toThrow(UnprocessableEntityException);
      });

      it('40001 (serialization_failure) → 409 ConflictException', async () => {
        const qfErr = new QueryFailedError('query', [], {
          ...new Error('serialization failure'),
          code: '40001',
        });

        await expect(
          service.transaction(async () => {
            throw qfErr;
          }),
        ).rejects.toThrow(ConflictException);
      });

      it('08xxx (connection error) → 503 ServiceUnavailableException', async () => {
        const qfErr = new QueryFailedError('query', [], {
          ...new Error('connection lost'),
          code: '08006',
        });

        await expect(
          service.transaction(async () => {
            throw qfErr;
          }),
        ).rejects.toThrow(ServiceUnavailableException);
      });

      it('неизвестный pg-код → 500 InternalServerError', async () => {
        const qfErr = new QueryFailedError('query', [], {
          ...new Error('something'),
          code: '99999',
        });

        await expect(
          service.transaction(async () => {
            throw qfErr;
          }),
        ).rejects.toThrow('Internal Server Error');
      });
    });

    it('неизвестная ошибка → 500 InternalServerError', async () => {
      await expect(
        service.transaction(async () => {
          throw new Error('unexpected');
        }),
      ).rejects.toThrow('Internal Server Error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
