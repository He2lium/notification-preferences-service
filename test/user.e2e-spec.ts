import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('UserController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('create user without settings', () => {
    const USER_ID = 9991;

    it('PUT /user creates user with no settings', () => {
      return request(app.getHttpServer())
        .put('/user')
        .send({ id: USER_ID })
        .expect(200)
        .expect(({ body }) => {
          expect(body.id).toBe(String(USER_ID));
          expect(body.settings).not.toBe(null);
        });
    });

    it('GET /user/:id returns the created user', () => {
      return request(app.getHttpServer())
        .get(`/user/${USER_ID}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body.id).toBe(String(USER_ID));
          expect(body.createdAt).toBeDefined();
          expect(body.updatedAt).toBeDefined();
        });
    });

    it('DELETE /user/:id removes the user', () => {
      return request(app.getHttpServer())
        .delete(`/user/${USER_ID}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body.id).toBe(String(USER_ID));
        });
    });

    it('GET /user/:id returns 404 after deletion', () => {
      return request(app.getHttpServer()).get(`/user/${USER_ID}`).expect(404);
    });
  });

  const fullSettings = {
    kind_delivery_status: true,
    kind_marketing: true,
    kind_transactional: false,
    channel_email: true,
    channel_push: false,
    channel_sms: false,
    channel_telegram: false,
    channel_vk: false,
    quiet_start: '10:00',
    quiet_end: '18:00',
    region: 'eu',
    timezone_offset: 180,
  };

  describe('create user with settings, update, delete', () => {
    const USER_ID = 9992;

    it('PUT /user creates user with settings', () => {
      return request(app.getHttpServer())
        .put('/user')
        .send({
          id: USER_ID,
          settings: { ...fullSettings },
        })
        .expect(200)
        .expect(({ body }) => {
          expect(body.id).toBe(String(USER_ID));
          expect(body.settings).toMatchObject({
            channel_email: true,
            kind_marketing: true,
            region: 'eu',
            timezone_offset: 180,
          });
        });
    });

    it('PUT /user updates settings', () => {
      return request(app.getHttpServer())
        .put('/user')
        .send({
          id: USER_ID,
          settings: {
            ...fullSettings,
            channel_sms: true,
            kind_marketing: false,
          },
        })
        .expect(200)
        .expect(({ body }) => {
          expect(body.id).toBe(String(USER_ID));
          expect(body.settings).toMatchObject({
            channel_email: true,
            channel_sms: true,
            kind_marketing: false,
            region: 'eu',
            timezone_offset: 180,
          });
        });
    });

    it('GET /user/:id returns updated user', () => {
      return request(app.getHttpServer())
        .get(`/user/${USER_ID}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body.id).toBe(String(USER_ID));
          expect(body.settings).toMatchObject({
            channel_email: true,
            channel_sms: true,
            kind_marketing: false,
          });
        });
    });

    it('DELETE /user/:id removes the user', () => {
      return request(app.getHttpServer())
        .delete(`/user/${USER_ID}`)
        .expect(200);
    });

    it('GET /user/:id returns 404 after deletion', () => {
      return request(app.getHttpServer()).get(`/user/${USER_ID}`).expect(404);
    });
  });
});
