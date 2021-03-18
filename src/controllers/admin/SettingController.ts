import { Request, Response } from 'express';
import * as SettingModel from '@/db/entity/Setting';
import { redisBase } from '@/lib/redis/base';

export async function getAll (req: Request, res: Response) {
  const settings = await SettingModel.getRepository().find();
  res.json(
    settings.map((row) => {
      return row.toShort();
    })
  );
}

export async function getByName (req: Request, res: Response) {
  const settingName = req.query['name'];
  const setting = await SettingModel.getRepository().findOne({
    where: {
      name: settingName,
    },
  });

  if (!setting) {
    return res.status(404).send('not found');
  }

  res.json(setting.toShort());
}

export async function change (req: Request, res: Response) {
  let settingName = req.body.name;
  let settingValue = req.body.value;

  const setting = await SettingModel.getRepository().findOne({
    where: {
      name: settingName,
    },
  });

  if (!setting) {
    return res.status(404).send('not found');
  }

  setting.setValue(settingValue);
  SettingModel.getRepository().save(setting);

  // clear cache
  await redisBase.getClient().del('db:settings:' + setting.name);
  await redisBase
    .getClient()
    .del('db:settings_collections:' + setting.collection);

  res.send('done');
}
