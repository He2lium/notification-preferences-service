import { RegionEnum } from '@global/types/region.enum';
import { NotificationKindEnum } from '@global/types/notification-kind.enum';
import { NotificationChannelEnum } from '@global/types/notification-channel.enum';

export type GlobalPolicyType = {
  regions?: RegionEnum[];
  kinds?: NotificationKindEnum[];
  channels?: NotificationChannelEnum[];
};
