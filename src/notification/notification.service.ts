import moment from 'moment';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalPolicyType } from '@global/types/global-policies.type';
import { NotificationChannelEnum } from '@global/types/notification-channel.enum';
import { NotificationKindEnum } from '@global/types/notification-kind.enum';
import { RegionEnum } from '@global/types/region.enum';
import { GeoSettingsType } from '@global/types/geo-settings.type';
import { UserService } from '../user/user.service';
import { NotificationEvaluationDto } from './dto/notification-evaluation.dto';

@Injectable()
export class NotificationService {
  private readonly _global_policies: GlobalPolicyType[];
  constructor(
    private readonly _env: ConfigService,
    private readonly _userService: UserService,
  ) {
    this._global_policies = JSON.parse(
      this._env.getOrThrow('GLOBAL_POLICIES_JSON'),
    ) as GlobalPolicyType[];
  }

  checkGlobalPolicy(
    channel: NotificationChannelEnum,
    kind: NotificationKindEnum,
    region: RegionEnum,
  ): boolean {
    for (const { regions, kinds, channels } of this._global_policies) {
      const regionMatch = !regions || regions.includes(region);
      const channelMatch = !channels || channels.includes(channel);
      const kindMatch = !kinds || kinds.includes(kind);

      if (regionMatch && channelMatch && kindMatch) {
        return false;
      }
    }
    return true;
  }

  checkGeoPolicy(datetime: string, geo: GeoSettingsType): boolean {
    const local = moment.utc(datetime).utcOffset(geo.timezone_offset);
    const localMinutes = local.hours() * 60 + local.minutes();

    const start = moment.duration(geo.quiet_start).asMinutes();
    const end = moment.duration(geo.quiet_end).asMinutes();

    if (start <= end) {
      if (localMinutes >= start && localMinutes <= end) return false;
    } else {
      if (localMinutes >= start || localMinutes <= end) return false;
    }

    return true;
  }

  async evaluate({
    channel,
    user_id,
    region,
    kind,
    datetime,
  }: NotificationEvaluationDto) {
    const make_response = (decision: 'allow' | 'deny', reason?: string) => ({
      decision,
      reason,
    });

    const {
      settings: { quiet_start, quiet_end, timezone_offset, ...user_policy },
    } = await this._userService.getById(user_id);

    if (!this.checkGlobalPolicy(channel, kind, region))
      return make_response('deny', 'blocked_by_global_policy');

    if (
      !this.checkGeoPolicy(datetime, {
        quiet_start,
        quiet_end,
        timezone_offset,
      })
    )
      return make_response('deny', 'blocked_by_quiet_policy');

    if (!user_policy[`channel_${channel}`])
      return make_response('deny', 'blocked_by_user_channel_policy');

    if (!user_policy[`kind_${kind}`])
      return make_response('deny', 'blocked_by_user_kind_policy');

    return make_response('allow');
  }
}
