import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
  EntityRepository,
  Repository,
  getCustomRepository,
} from 'typeorm';
import redis from '../../lib/redis';

export enum SettingColection {
  None = 'none',
  Front = 'front',
}

export enum SettingType {
  String = 'string',
  Integer = 'integer',
  Decimal = 'decimal',
  Bool = 'bool',
  Text = 'text',
}

export enum Settings {
  userRegistrationDisabled = 'userRegistrationDisabled',
}

export interface ISettingShort {
  name: string;
  collection: SettingColection;
  type: SettingType;
  value: string;
}

export interface ISettingCollection {
  [key: string]: ISettingShort;
}

@Entity({
  name: 'settings',
})
@Index(['collection'])
@Index(['type'])
@Unique(['name'])
export class Setting {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column('enum', {
    enumName: 'settings_setting_colection_enum',
    enum: SettingColection,
    default: SettingColection.None,
  })
  collection: SettingColection;

  @Column()
  name: string;

  @Column('enum', {
    enumName: 'settings_setting_type_enum',
    enum: SettingType,
    default: SettingType.String,
  })
  type: SettingType;

  @Column('text')
  value: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  public setValue(value) {
    this.value = value;
  }

  public toShort(): ISettingShort {
    return {
      collection: this.collection,
      name: this.name,
      type: this.type,
      value: this.value,
    };
  }
}

@EntityRepository(Setting)
export class SettingRepository extends Repository<Setting> {
  public async getSetting(settingName): Promise<ISettingShort | null> {
    const redisClient = redis.getClient();
    let result;
    let setting = await redisClient.get('db:settings:' + settingName);

    if (setting) {
      result = JSON.parse(setting);
    } else {
      const settingRow = await this.findOne({
        where: {
          name: settingName,
        },
      });

      if (settingRow) {
        result = {
          name: settingRow.name,
          collection: settingRow.collection,
          type: settingRow.type,
          value: settingRow.value,
        };
      } else {
        result = null;
      }

      await redisClient.set(
        'db:settings:' + settingName,
        JSON.stringify(result)
      );
    }

    return result;
  }

  public async getSettingsCollection(
    collection: SettingColection
  ): Promise<ISettingCollection> {
    const redisClient = redis.getClient();
    let result;
    let settingsCollection = await redisClient.get(
      'db:settings_collections:' + collection
    );

    if (settingsCollection) {
      result = JSON.parse(settingsCollection);
    } else {
      const settingsCollectionRows = await this.find({
        where: {
          collection,
        },
      });

      result = {};
      for (let setting of settingsCollectionRows) {
        result[setting.name] = {
          collection,
          name: setting.name,
          type: setting.type,
          value: setting.value,
        };
      }

      await redisClient.set(
        'db:settings_collections:' + collection,
        JSON.stringify(result)
      );
    }

    return result;
  }
}

export function getRepository() {
  return getCustomRepository(SettingRepository);
}
