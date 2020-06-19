import { Router, Request, Response, NextFunction } from 'express';
import * as db from '../../db';

const router = Router();

router.get(
  '/by_name/:name',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pageName = req.params['name'] || null;
      if (pageName) {
        const pageData = await db.models.Page.getRepository().getPage(pageName);
        if (!pageData) {
          return res.status(404).send();
        }
        res.send(pageData);
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;
