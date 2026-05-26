import { NotificationChannelEnum } from '@global/types/notification-channel.enum';
import { NotificationKindEnum } from '@global/types/notification-kind.enum';
import { GeoSettingsType } from '@global/types/geo-settings.type';

export type UserSettingFieldsType = {
  [K in NotificationKindEnum as `kind_${K}`]: boolean;
} & {
  [K in NotificationChannelEnum as `channel_${K}`]: boolean;
} & GeoSettingsType;
