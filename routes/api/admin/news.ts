import { Router, Request, Response, NextFunction } from 'express';
import * as NewsModel from '../../../db/entity/News';

const router = Router();

router.put('', async (req: Request, res: Response, next: NextFunction) => {
  try {
    /*
        id: null,
        status: '',
        header: '',
        annotation: '',
        content: '',
        publishAt: null
        */

    const id = req.body.id;
    const status = req.body.status;
    const header = req.body.header;
    const annotation = req.body.annotation;
    const content = req.body.content;
    const publishAt = req.body.publishAt;

    if (!id) {
      // create
      const newsNews = NewsModel.getRepository().create();
      newsNews.status = status;
      newsNews.header = header;
      newsNews.annotation = annotation;
      newsNews.content = content;
      newsNews.publishAt = publishAt;
      await NewsModel.getRepository().save(newsNews);

      res.status(201).json({
        id: newsNews.id,
      });
    } else {
      const news = await NewsModel.getRepository().findOne(id);

      if (!news) {
        res.status(404).send('not found');
      }

      news.status = status;
      news.header = header;
      news.annotation = annotation;
      news.content = content;
      news.publishAt = publishAt;
      await NewsModel.getRepository().save(news);

      res.send();
    }
  } catch (error) {
    next(error);
  }
});

router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params['id'];
      const newsToDelRow = await NewsModel.getRepository().findOne(id);

      if (!newsToDelRow) {
        res.status(404).send();
      }

      await NewsModel.getRepository().remove(newsToDelRow);
      res.send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
