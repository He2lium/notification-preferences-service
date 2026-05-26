import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RegionEnum } from '@global/types/region.enum';
import { UserSettingFieldsType } from '@global/types/user-setting-fields.type';
import { UserEntity } from './user.entity';
import { GeoSettingsType } from '@global/types/geo-settings.type';

const BoolColumn = () => Column({ type: 'bool' });
@Entity('user_settings')
export class UserSettingsEntity
  implements UserSettingFieldsType, GeoSettingsType
{
  @PrimaryColumn({ type: 'bigint' })
  user_id: number;

  @Column({ type: 'time' })
  quiet_start: string;

  @Column({ type: 'time' })
  quiet_end: string;

  @Column({ type: 'smallint' })
  timezone_offset: number;

  @BoolColumn()
  kind_delivery_status: boolean;

  @BoolColumn()
  kind_marketing: boolean;

  @BoolColumn()
  kind_transactional: boolean;

  @BoolColumn()
  channel_email: boolean;

  @BoolColumn()
  channel_push: boolean;

  @BoolColumn()
  channel_sms: boolean;

  @BoolColumn()
  channel_telegram: boolean;

  @BoolColumn()
  channel_vk: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => UserEntity, (user) => user.settings, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;
}
