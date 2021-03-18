import { Request, Response } from 'express';
import * as db from '../db';

export async function getByName (req: Request, res: Response) {
  const pageName = req.params['name'] || null;
  if (pageName) {
    const pageData = await db.models.Page.getRepository().getPage(pageName);
    if (!pageData) {
      return res.status(404).send();
    }
    res.send(pageData);
  }
}
