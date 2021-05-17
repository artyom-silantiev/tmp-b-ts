import { Request, Response } from 'express';
import { SettingColection } from '@prisma/client';
import * as db from '@/models';

export async function getFrontCollection (req: Request, res: Response) {
  const settingsFrontCollection = await db.models.Setting.getSettingsCollection(
    SettingColection.FRONT
  );
  res.json(settingsFrontCollection);
}
