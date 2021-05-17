import { Request, Response } from 'express';
import * as db from '@/models';
import { redisBase } from '@/lib/redis/base';

const prisma = db.getPrisma();

export async function getAll (req: Request, res: Response) {
  const settings = await prisma.setting.findMany();
  res.json(
    settings.map((row) => {
      return db.models.Setting.toShort(row);
    })
  );
}

export async function getByName (req: Request, res: Response) {
  const settingName = req.query.name as string;
  const setting = await prisma.setting.findFirst({
    where: {
      name: settingName
    }
  });

  if (!setting) {
    return res.status(404).send('not found');
  }

  res.json(db.models.Setting.toShort(setting));
}

export async function change (req: Request, res: Response) {
  let settingName = req.body.name;
  let settingValue = req.body.value;

  const setting = await prisma.setting.findFirst({
    where: {
      name: settingName
    }
  });

  if (!setting) {
    return res.status(404).send('not found');
  }

  await prisma.setting.update({
    where: {
      id: setting.id
    },
    data: {
      value: settingValue
    }
  })

  // clear cache
  await redisBase.getClient().del('db:settings:' + setting.name);
  await redisBase
    .getClient()
    .del('db:settings_collections:' + setting.collection);

  res.send('done');
}
