import {
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserSettingsEntity } from './user-settings.entity';

@Entity('users')
export class UserEntity {
  @PrimaryColumn({ type: 'bigint' })
  id: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => UserSettingsEntity, (settings) => settings.user, {
    cascade: true,
    nullable: true,
  })
  settings?: UserSettingsEntity;
}
