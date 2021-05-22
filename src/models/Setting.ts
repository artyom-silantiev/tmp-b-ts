import { SettingColection, SettingType, Setting } from '@prisma/client';
import { redisBase } from '@/lib/redis/base';
import { getPrisma } from './index';

const prisma = getPrisma();

export interface SettingShort {
  name: string;
  collection: SettingColection;
  type: SettingType;
  value: string;
}
  
export interface SettingCollection {
  [key: string]: SettingShort;
}

export default class SettingModel {
  model: Setting;

  constructor (model: Setting) {
    this.model = model;
  }

  static wrap (model: Setting) {
    return new SettingModel(model);
  }

  toShort () {
    return {
      collection: this.model.collection,
      name: this.model.name,
      type: this.model.type,
      value: this.model.value
    };
  }

  static async getSetting(settingName): Promise<SettingShort | null> {
    const redisClient = redisBase.getClient();
    let result;
    const setting = await redisClient.get('db:settings:' + settingName);

    if (setting) {
      result = JSON.parse(setting);
    } else {
      const settingRow = await prisma.setting.findFirst({
        where: {
          name: settingName
        }
      });

      if (settingRow) {
        result = SettingModel.wrap(settingRow).toShort();
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

  static async getSettingsCollection (collection: SettingColection): Promise<SettingCollection> {
    const redisClient = redisBase.getClient();
    let result;
    const settingsCollection = await redisClient.get(
      'db:settings_collections:' + collection
    );

    if (settingsCollection) {
      result = JSON.parse(settingsCollection);
    } else {
      const settingsCollectionRows = await prisma.setting.findMany({
        where: {
          collection
        }
      });

      result = {};
      for (let setting of settingsCollectionRows) {
        result[setting.name] = SettingModel.wrap(setting).toShort();
      }

      await redisClient.set(
        'db:settings_collections:' + collection,
        JSON.stringify(result)
      );
    }

    return result;
  }
}
