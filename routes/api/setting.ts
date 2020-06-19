import { Router, Request, Response, NextFunction } from 'express';
import * as db from '../../db';

const router = Router();

router.get(
  '/front_collection',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settingsFrontCollection = await db.models.Setting.getRepository().getSettingsCollection(
        db.models.Setting.SettingColection.Front
      );
      res.json(settingsFrontCollection);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
