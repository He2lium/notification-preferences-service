import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { NotificationChannelEnum } from '@global/types/notification-channel.enum';
import { NotificationKindEnum } from '@global/types/notification-kind.enum';
import { RegionEnum } from '@global/types/region.enum';
import { UserService } from '../user/user.service';

function createService(policies: unknown) {
  const mockConfig = {
    getOrThrow: jest.fn().mockReturnValue(JSON.stringify(policies)),
  };
  return new NotificationService(
    mockConfig as unknown as ConfigService,
    null as unknown as UserService,
  );
}

function createServiceWithUser(
  policies: unknown,
  userSettings: Record<string, unknown>,
) {
  const mockConfig = {
    getOrThrow: jest.fn().mockReturnValue(JSON.stringify(policies)),
  };
  const mockUserService = {
    getById: jest.fn().mockResolvedValue({ settings: userSettings }),
  };
  return {
    service: new NotificationService(
      mockConfig as unknown as ConfigService,
      mockUserService as unknown as UserService,
    ),
    mockUserService,
  };
}

const DEFAULT_USER_SETTINGS = {
  quiet_start: '22:00',
  quiet_end: '08:00',
  timezone_offset: 180,
  channel_email: true,
  channel_sms: true,
  channel_push: true,
  channel_telegram: true,
  channel_vk: true,
  kind_transactional: true,
  kind_marketing: true,
  kind_delivery_status: true,
  region: RegionEnum.EU,
};

const DT_OUTSIDE_QUIET = '2026-01-01T09:00:00Z'; // UTC 09:00 + 180min → local 12:00, quiet 22:00-08:00 → outside
const DT_INSIDE_QUIET = '2026-01-01T20:00:00Z'; // UTC 20:00 + 180min → local 23:00, quiet 22:00-08:00 → inside

describe('NotificationService', () => {
  describe('checkGlobalPolicy', () => {
    it('returns true when no policies exist', () => {
      const svc = createService([]);
      expect(
        svc.checkGlobalPolicy(
          NotificationChannelEnum.EMAIL,
          NotificationKindEnum.MARKETING,
          RegionEnum.EU,
        ),
      ).toBe(true);
    });

    it('returns false when a policy matches by region, channel, and kind', () => {
      const svc = createService([
        {
          regions: [RegionEnum.EU],
          channels: [NotificationChannelEnum.EMAIL],
          kinds: [NotificationKindEnum.MARKETING],
        },
      ]);

      expect(
        svc.checkGlobalPolicy(
          NotificationChannelEnum.EMAIL,
          NotificationKindEnum.MARKETING,
          RegionEnum.EU,
        ),
      ).toBe(false);
    });

    it('returns true when region does not match', () => {
      const svc = createService([
        {
          regions: [RegionEnum.US],
          channels: [NotificationChannelEnum.EMAIL],
          kinds: [NotificationKindEnum.MARKETING],
        },
      ]);

      expect(
        svc.checkGlobalPolicy(
          NotificationChannelEnum.EMAIL,
          NotificationKindEnum.MARKETING,
          RegionEnum.EU,
        ),
      ).toBe(true);
    });

    it('returns true when channel does not match', () => {
      const svc = createService([
        {
          regions: [RegionEnum.EU],
          channels: [NotificationChannelEnum.SMS],
          kinds: [NotificationKindEnum.MARKETING],
        },
      ]);

      expect(
        svc.checkGlobalPolicy(
          NotificationChannelEnum.EMAIL,
          NotificationKindEnum.MARKETING,
          RegionEnum.EU,
        ),
      ).toBe(true);
    });

    it('returns true when kind does not match', () => {
      const svc = createService([
        {
          regions: [RegionEnum.EU],
          channels: [NotificationChannelEnum.EMAIL],
          kinds: [NotificationKindEnum.TRANSACTIONAL],
        },
      ]);

      expect(
        svc.checkGlobalPolicy(
          NotificationChannelEnum.EMAIL,
          NotificationKindEnum.MARKETING,
          RegionEnum.EU,
        ),
      ).toBe(true);
    });

    it('matches when optional field is absent (undefined region acts as wildcard)', () => {
      const svc = createService([
        {
          channels: [NotificationChannelEnum.PUSH],
          kinds: [NotificationKindEnum.DELIVERY_STATUS],
        },
      ]);

      expect(
        svc.checkGlobalPolicy(
          NotificationChannelEnum.PUSH,
          NotificationKindEnum.DELIVERY_STATUS,
          RegionEnum.RU,
        ),
      ).toBe(false);
    });

    it('matches when only regions defined (channel and kind act as wildcard)', () => {
      const svc = createService([{ regions: [RegionEnum.CIS, RegionEnum.RU] }]);

      expect(
        svc.checkGlobalPolicy(
          NotificationChannelEnum.VK,
          NotificationKindEnum.TRANSACTIONAL,
          RegionEnum.RU,
        ),
      ).toBe(false);
    });

    it('matches first blocking policy and ignores subsequent ones', () => {
      const svc = createService([
        {
          regions: [RegionEnum.EU],
          channels: [NotificationChannelEnum.EMAIL],
          kinds: [NotificationKindEnum.MARKETING],
        },
        {
          regions: [RegionEnum.EU],
          channels: [NotificationChannelEnum.EMAIL],
          kinds: [NotificationKindEnum.MARKETING],
        },
      ]);

      expect(
        svc.checkGlobalPolicy(
          NotificationChannelEnum.EMAIL,
          NotificationKindEnum.MARKETING,
          RegionEnum.EU,
        ),
      ).toBe(false);
    });

    it('skips non-matching policies and blocks on first match', () => {
      const svc = createService([
        {
          regions: [RegionEnum.US],
          channels: [NotificationChannelEnum.EMAIL],
        },
        {
          regions: [RegionEnum.EU],
          kinds: [NotificationKindEnum.MARKETING],
        },
      ]);

      expect(
        svc.checkGlobalPolicy(
          NotificationChannelEnum.EMAIL,
          NotificationKindEnum.MARKETING,
          RegionEnum.EU,
        ),
      ).toBe(false);
    });
  });

  describe('checkGeoPolicy', () => {
    it('returns true when outside same-day quiet hours', () => {
      const svc = createService([]);
      // UTC 06:00 + offset 180min (UTC+3) → local 09:00, quiet 10:00-18:00
      expect(
        svc.checkGeoPolicy('2026-01-01T06:00:00Z', {
          quiet_start: '10:00',
          quiet_end: '18:00',
          timezone_offset: 180,
        }),
      ).toBe(true);
    });

    it('returns false when inside same-day quiet hours', () => {
      const svc = createService([]);
      // UTC 09:00 + offset 180min (UTC+3) → local 12:00, quiet 10:00-18:00
      expect(
        svc.checkGeoPolicy('2026-01-01T09:00:00Z', {
          quiet_start: '10:00',
          quiet_end: '18:00',
          timezone_offset: 180,
        }),
      ).toBe(false);
    });

    it('returns false when inside cross-midnight quiet hours (after start)', () => {
      const svc = createService([]);
      // UTC 20:00 + offset 180min (UTC+3) → local 23:00, quiet 22:00-08:00
      expect(
        svc.checkGeoPolicy('2026-01-01T20:00:00Z', {
          quiet_start: '22:00',
          quiet_end: '08:00',
          timezone_offset: 180,
        }),
      ).toBe(false);
    });

    it('returns false when inside cross-midnight quiet hours (before end)', () => {
      const svc = createService([]);
      // UTC 03:00 + offset 180min (UTC+3) → local 06:00, quiet 22:00-08:00
      expect(
        svc.checkGeoPolicy('2026-01-01T03:00:00Z', {
          quiet_start: '22:00',
          quiet_end: '08:00',
          timezone_offset: 180,
        }),
      ).toBe(false);
    });

    it('returns true when outside cross-midnight quiet hours', () => {
      const svc = createService([]);
      // UTC 09:00 + offset 180min (UTC+3) → local 12:00, quiet 22:00-08:00
      expect(
        svc.checkGeoPolicy('2026-01-01T09:00:00Z', {
          quiet_start: '22:00',
          quiet_end: '08:00',
          timezone_offset: 180,
        }),
      ).toBe(true);
    });

    it('handles negative timezone offset', () => {
      const svc = createService([]);
      // UTC 15:00 + offset -300min (UTC-5) → local 10:00, quiet 22:00-08:00
      expect(
        svc.checkGeoPolicy('2026-01-01T15:00:00Z', {
          quiet_start: '22:00',
          quiet_end: '08:00',
          timezone_offset: -300,
        }),
      ).toBe(true);
    });

    it('returns false exactly at quiet_start boundary', () => {
      const svc = createService([]);
      // UTC 07:00 + offset 180min (UTC+3) → local 10:00, quiet 10:00-18:00
      expect(
        svc.checkGeoPolicy('2026-01-01T07:00:00Z', {
          quiet_start: '10:00',
          quiet_end: '18:00',
          timezone_offset: 180,
        }),
      ).toBe(false);
    });

    it('returns false exactly at quiet_end boundary', () => {
      const svc = createService([]);
      // UTC 15:00 + offset 180min (UTC+3) → local 18:00, quiet 10:00-18:00
      expect(
        svc.checkGeoPolicy('2026-01-01T15:00:00Z', {
          quiet_start: '10:00',
          quiet_end: '18:00',
          timezone_offset: 180,
        }),
      ).toBe(false);
    });
  });

  describe('evaluate', () => {
    it('returns allow when all checks pass', async () => {
      const { service } = createServiceWithUser([], DEFAULT_USER_SETTINGS);

      const result = await service.evaluate({
        channel: NotificationChannelEnum.EMAIL,
        kind: NotificationKindEnum.MARKETING,
        region: RegionEnum.EU,
        user_id: 1,
        datetime: DT_OUTSIDE_QUIET,
      });

      expect(result).toEqual({ decision: 'allow', reason: undefined });
    });

    it('returns deny when blocked by global policy', async () => {
      const { service } = createServiceWithUser(
        [
          {
            regions: [RegionEnum.EU],
            channels: [NotificationChannelEnum.EMAIL],
            kinds: [NotificationKindEnum.MARKETING],
          },
        ],
        DEFAULT_USER_SETTINGS,
      );

      const result = await service.evaluate({
        channel: NotificationChannelEnum.EMAIL,
        kind: NotificationKindEnum.MARKETING,
        region: RegionEnum.EU,
        user_id: 1,
        datetime: DT_OUTSIDE_QUIET,
      });

      expect(result).toEqual({
        decision: 'deny',
        reason: 'blocked_by_global_policy',
      });
    });

    it('returns deny when blocked by quiet hours policy', async () => {
      const { service } = createServiceWithUser([], DEFAULT_USER_SETTINGS);

      const result = await service.evaluate({
        channel: NotificationChannelEnum.EMAIL,
        kind: NotificationKindEnum.MARKETING,
        region: RegionEnum.EU,
        user_id: 1,
        datetime: DT_INSIDE_QUIET,
      });

      expect(result).toEqual({
        decision: 'deny',
        reason: 'blocked_by_quiet_policy',
      });
    });

    it('returns deny when user channel toggle is off', async () => {
      const { service } = createServiceWithUser([], {
        ...DEFAULT_USER_SETTINGS,
        channel_email: false,
      });

      const result = await service.evaluate({
        channel: NotificationChannelEnum.EMAIL,
        kind: NotificationKindEnum.MARKETING,
        region: RegionEnum.EU,
        user_id: 1,
        datetime: DT_OUTSIDE_QUIET,
      });

      expect(result).toEqual({
        decision: 'deny',
        reason: 'blocked_by_user_channel_policy',
      });
    });

    it('returns deny when user kind toggle is off', async () => {
      const { service } = createServiceWithUser([], {
        ...DEFAULT_USER_SETTINGS,
        kind_marketing: false,
      });

      const result = await service.evaluate({
        channel: NotificationChannelEnum.EMAIL,
        kind: NotificationKindEnum.MARKETING,
        region: RegionEnum.EU,
        user_id: 1,
        datetime: DT_OUTSIDE_QUIET,
      });

      expect(result).toEqual({
        decision: 'deny',
        reason: 'blocked_by_user_kind_policy',
      });
    });

    it('checks global policy before quiet hours (global deny wins)', async () => {
      const { service } = createServiceWithUser(
        [
          {
            regions: [RegionEnum.EU],
            channels: [NotificationChannelEnum.EMAIL],
            kinds: [NotificationKindEnum.MARKETING],
          },
        ],
        DEFAULT_USER_SETTINGS,
      );

      const result = await service.evaluate({
        channel: NotificationChannelEnum.EMAIL,
        kind: NotificationKindEnum.MARKETING,
        region: RegionEnum.EU,
        user_id: 1,
        datetime: DT_INSIDE_QUIET,
      });

      expect(result).toEqual({
        decision: 'deny',
        reason: 'blocked_by_global_policy',
      });
    });

    it('checks quiet hours before user channel (quiet deny wins)', async () => {
      const { service } = createServiceWithUser([], {
        ...DEFAULT_USER_SETTINGS,
        channel_email: false,
      });

      const result = await service.evaluate({
        channel: NotificationChannelEnum.EMAIL,
        kind: NotificationKindEnum.MARKETING,
        region: RegionEnum.EU,
        user_id: 1,
        datetime: DT_INSIDE_QUIET,
      });

      expect(result).toEqual({
        decision: 'deny',
        reason: 'blocked_by_quiet_policy',
      });
    });

    it('checks user channel before user kind (channel deny wins)', async () => {
      const { service } = createServiceWithUser([], {
        ...DEFAULT_USER_SETTINGS,
        channel_email: false,
        kind_marketing: false,
      });

      const result = await service.evaluate({
        channel: NotificationChannelEnum.EMAIL,
        kind: NotificationKindEnum.MARKETING,
        region: RegionEnum.EU,
        user_id: 1,
        datetime: DT_OUTSIDE_QUIET,
      });

      expect(result).toEqual({
        decision: 'deny',
        reason: 'blocked_by_user_channel_policy',
      });
    });

    it('passes user_id to UserService.getById', async () => {
      const { service, mockUserService } = createServiceWithUser(
        [],
        DEFAULT_USER_SETTINGS,
      );

      await service.evaluate({
        channel: NotificationChannelEnum.PUSH,
        kind: NotificationKindEnum.TRANSACTIONAL,
        region: RegionEnum.US,
        user_id: 42,
        datetime: DT_OUTSIDE_QUIET,
      });

      expect(mockUserService.getById).toHaveBeenCalledWith(42);
    });
  });
});
