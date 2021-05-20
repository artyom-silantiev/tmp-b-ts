import * as express from 'express';
import * as path from 'path';
import { UserJwt } from '@/models/User';
import * as cookieParser from 'cookie-parser';
import { cacheControlMiddleware, parseAuthorizationMiddleware } from './lib';
import acl from '../lib/acl';
import { UserRole } from '@prisma/client';

import * as ImageController from '../controllers/image';
import * as SiteMapController from '../controllers/sitemap';

import * as GuestController from '../controllers/guest';
import * as UserController from '../controllers/user';
import * as SettingController from '../controllers/setting';
import * as PageController from '../controllers/page';
import * as PublicationsController from '../controllers/publication';

import * as AdminSystemInfoController from '../controllers/admin/system_info';
import * as AdminSettingController from '../controllers/admin/setting';
import * as AdminUserController from '../controllers/admin/user';
import * as AdminPageController from '../controllers/admin/page';
import * as AdminImageController from '../controllers/admin/image';
import * as AdminPublicationController from '../controllers/admin/publication';

const cwd = process.cwd();

const router = express.Router();

declare global {
  namespace Express {
    interface Request {
      authorization: UserJwt;
      language: string | undefined;
    }
  }
}

router.use(express.urlencoded({ extended: false }));
router.use(express.json());
router.use(cookieParser());

function apiRouter () {
  const apiRouter = express.Router();

  apiRouter.use(cacheControlMiddleware);
  apiRouter.use(parseAuthorizationMiddleware);

  function adminRouter () {
    const router = express.Router();

    router.use(acl.allow(UserRole.ADMIN));

    router.get    ('/system_info', AdminSystemInfoController.getSystemInfo);

    router.get    ('/settings', AdminSettingController.getAll);
    router.post   ('/settings', AdminSettingController.change);
    router.get    ('/settings/:name', AdminSettingController.getByNameParam);

    router.get    ('/users', AdminUserController.getList);
    router.post   ('/users', AdminUserController.create);
    router.get    ('/users/:id', AdminUserController.getById);

    router.put    ('/pages', AdminPageController.put);

    router.get    ('/images', AdminImageController.getList);
    router.post   ('/images', AdminImageController.uploadMiddleware(), AdminImageController.upload);

    router.put    ('/publications', AdminPublicationController.put);
    router.delete ('/publications/:id', AdminPublicationController.deleteById);

    return router;
  }
  apiRouter.use('/admin', adminRouter());

  function guestRouter () {
    const router = express.Router();

    router.use(acl.allow(UserRole.GUEST));

    router.post  ('/user_create', GuestController.userCreate);
    router.post  ('/user_login', GuestController.userLogin);
    router.get   ('/reset_password_info', GuestController.resetPasswordInfo);
    router.get   ('/request_password_reset_link', GuestController.requestPasswordResetLink);
    router.post  ('/reset_password', GuestController.resetPassword);

    return router;
  }
  apiRouter.use('/guest', guestRouter());

  function userRouter () {
    const router = express.Router();

    router.use(acl.deny(UserRole.GUEST));

    router.get   ('', UserController.getCurrent);
    router.post  ('/logout', UserController.logout);
    router.get   ('/activate/:activateJwt', UserController.activateJwt);
    router.post  ('/change_password', UserController.changePassword);
    router.post  ('/upload_avatar', UserController.uploadAvatarMiddleware(), UserController.uploadAvatar);
    router.post  ('/settings_update', UserController.settingsUpdate);
    router.get   ('/user_byid/:id', UserController.getById);

    return router;
  }
  apiRouter.use('/user', userRouter());

  function publicRouter () {
    const router = express.Router();

    router.get  ('/settings/front_collection', SettingController.getFrontCollection);

    router.get  ('/pages/by_name/:name', PageController.getByName);

    router.get  ('/publications', PublicationsController.getFetchList);
    router.get  ('/publications/:id', PublicationsController.getById);

    return router;
  }
  apiRouter.use(publicRouter());

  apiRouter.use((error, req, res, next) => {
    console.log(error);
    res.status(500).send('');
  });

  return apiRouter;
}

router.use('/api', apiRouter());

router.get('/sitemap.xml', SiteMapController.getSiteMapXml);
router.get('/images/:uuid', ImageController.getImageByUuid);

router.use(express.static(path.resolve(cwd, 'public')));

router.use(express.static(path.resolve(cwd, '..', 'frontend/dist/spa')));
router.use('/admin', express.static(path.resolve(cwd, '..', 'frontend_admin/dist/spa')));

router.get('/admin*', (req, res, next) => {
  res.sendFile(path.resolve(cwd, '..', 'frontend_admin/dist/spa/index.html'));
});
router.get('/*', (req, res, next) => {
  res.sendFile(path.resolve(cwd, '..', 'frontend/dist/spa/index.html'));
});

router.get('/404', (req, res, next) => {
  // trigger a 404 since no other middleware
  // will match /404 after this one, and we're not
  // responding here
  next();
});

router.use((error, req, res, next) => {
  console.log(error);
  res.status(500).send('');
});

export default router;
