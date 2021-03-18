import { Request, Response } from 'express';
import * as db from '../db';

export async function getFrontCollection (req: Request, res: Response) {
  const settingsFrontCollection = await db.models.Setting.getRepository().getSettingsCollection(
    db.models.Setting.SettingColection.Front
  );
  res.json(settingsFrontCollection);
}
