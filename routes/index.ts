import * as express from 'express';
import ApiRouter from './api/index';
import ImageRouter from './image';
import * as path from 'path';
import { UserJwt } from '../db/entity/User';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';

const router = express.Router();

declare global {
  namespace Express {
    interface Request {
      authorization: UserJwt;
      language: string | undefined;
    }
  }
}

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
router.use(cookieParser());

router.get('/', (req, res, next) => {
  res.sendFile(path.resolve(__dirname, '..', '..', 'frontend/dist/index.html'));
});

router.use('/api', ApiRouter);
router.use('/image', ImageRouter);

router.use(express.static(path.resolve(__dirname, '..', 'public')));

router.use(
  express.static(path.resolve(__dirname, '..', '..', 'frontend/dist'))
);

router.get('/404', (req, res, next) => {
  // trigger a 404 since no other middleware
  // will match /404 after this one, and we're not
  // responding here
  next();
});

router.use((req, res, next) => {
  res.sendFile(path.resolve(__dirname, '..', '..', 'frontend/dist/index.html'));
});

export default router;
