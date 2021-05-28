import * as express from 'express';
import { UserJwt } from '../models/User';

export interface FetchParamsBase {
  page: number | null;
  pageSize: number | null;
  sortBy: string | null;
  sortDesc: boolean | null;
}

interface RouteHandle {
  (req: express.Request, res: express.Response): Promise<void|any> | void|any
}

export function endPoint (route: RouteHandle) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      await route(req, res);
    } catch (error) {
      next(error);
    }
  }
}

export async function cacheControlMiddleware (req: express.Request, res: express.Response, next: express.NextFunction) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  next();
};

export async function parseAuthorizationMiddleware (req: express.Request, res: express.Response, next: express.NextFunction) {
  req.language = req.headers['accept-language'] || 'en';

  let authorization = req.headers['authorization'];
  if (authorization) {
    // Bearer <token>
    let parts = authorization.split(' ');
    if (parts.length === 2) {
      let token = parts[1];

      try {
        let decoded = UserJwt.verifyJwtToken(token);
        if (decoded) {
          let userJwt = Object.assign(new UserJwt(token), decoded);
          if (await userJwt.isAuth()) {
            req.authorization = userJwt;
          }
        }
      } catch (err) {}
    }
  }

  next();
}