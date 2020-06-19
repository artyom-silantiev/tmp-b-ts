import { Router, Request, Response, NextFunction } from 'express';
import * as UserModel from '../../../db/entity/User';
import acl from '../../../lib/acl';

import SettingApi from './setting';
import UserApi from './user';
import PageApi from './page';
import ImageApi from './image';
import NewsApi from './news';

const router = Router();

router.use(acl.allow(UserModel.UserRole.Admin));

router.use('/setting', SettingApi);
router.use('/user', UserApi);
router.use('/page', PageApi);
router.use('/image', ImageApi);
router.use('/news', NewsApi);

export default router;
