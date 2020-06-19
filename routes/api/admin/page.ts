import { Router, Request, Response, NextFunction } from 'express';
import * as PageModel from '../../../db/entity/Page';

const router = Router();

router.post(
  '/change',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pageName = req.body.name;
      const pageData = req.body.data;
      await PageModel.getRepository().setPage(pageName, pageData);
      res.send('done');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
