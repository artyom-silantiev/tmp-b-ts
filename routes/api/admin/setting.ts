import { Router, Request, Response, NextFunction } from 'express';
import * as SettingModel from '../../../db/entity/Setting';
import redis from '../../../lib/redis';

const router = Router();

router.get('/all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await SettingModel.getRepository().find();
    res.json(
      settings.map((row) => {
        return row.toShort();
      })
    );
  } catch (error) {
    next(error);
  }
});

router.get(
  '/by_name',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
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
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/change',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
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
      await redis.getClient().del('db:settings:' + setting.name);
      await redis
        .getClient()
        .del('db:settings_collections:' + setting.collection);

      res.send('done');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
