import { Router, Request, Response } from 'express';
import { UserJwt } from '../../db/entity/User';
import AdminApi from './admin';
import UserApi from './user';
import SettingApi from './setting';
import PageApi from './page';
import NewsApi from './news';
import * as jwt from 'jsonwebtoken';
import config from '../../config/server';

const router = Router();

router.use((req, res, next) => {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  next();
});

// session controll for api
router.use(async (req, res, next) => {
  req.language = req.headers['accept-language'] || 'en';

  let authorization = req.headers['authorization'];
  if (authorization) {
    // Bearer <token>
    let parts = authorization.split(' ');
    if (parts.length === 2) {
      let token = parts[1];

      try {
        let decoded = jwt.verify(token, config.node.jwtSecret);
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
});

router.use('/admin', AdminApi);
router.use('/user', UserApi);
router.use('/setting', SettingApi);
router.use('/page', PageApi);
router.use('/news', NewsApi);

router.get('/hello', async (req, res, next) => {
  try {
    res.json({
      message: 'Hello!',
    });
  } catch (err) {
    next(err);
  }
});

router.use((error, req, res, next) => {
  console.log('error', error);

  res.status(500).json({
    error: error,
  });
});

export default router;
