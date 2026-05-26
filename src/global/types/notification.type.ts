import { NotificationKindEnum } from '@global/types/notification-kind.enum';
import { NotificationChannelEnum } from '@global/types/notification-channel.enum';

export type NotificationType =
  `${NotificationKindEnum}_${NotificationChannelEnum}`;
