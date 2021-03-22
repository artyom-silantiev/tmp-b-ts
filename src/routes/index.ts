import * as express from 'express';
import * as path from 'path';
import { UserJwt } from '@/models/User';
import * as cookieParser from 'cookie-parser';
import { wrap, cacheControlMiddleware, parseAuthorizationMiddleware } from './lib';
import acl from '../lib/acl';
import { UserRole } from '@prisma/client';

import * as ImageController from '../controllers/ImageController';
import * as SiteMapController from '../controllers/SiteMapController';

import * as GuestController from '../controllers/GuestController';
import * as UserController from '../controllers/UserController';
import * as SettingController from '../controllers/SettingController';
import * as PageController from '../controllers/PageController';
import * as PublicationsController from '../controllers/PublicationController';

import * as AdminSystemInfoController from '../controllers/admin/SystemInfoController';
import * as AdminSettingController from '../controllers/admin/SettingController';
import * as AdminUserController from '../controllers/admin/UserController';
import * as AdminPageController from '../controllers/admin/PageController';
import * as AdminImageController from '../controllers/admin/ImageController';
import * as AdminPublicationController from '../controllers/admin/PublicationController';

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

    router.get    ('/system_info', wrap(AdminSystemInfoController.getSystemInfo));

    router.get    ('/setting/all', wrap(AdminSettingController.getAll));
    router.get    ('/setting/by_name', wrap(AdminSettingController.getByName));
    router.post   ('/setting/change', wrap(AdminSettingController.change));

    router.get    ('/user/list', wrap(AdminUserController.getList));
    router.post   ('/user/create', wrap(AdminUserController.getList));
    router.get    ('/user/byid/:id', wrap(AdminUserController.getById));

    router.post   ('/page/change', wrap(AdminPageController.change));

    router.get    ('/image/list', wrap(AdminImageController.getList));
    router.post   ('/image/upload', AdminImageController.uploadMiddleware(), wrap(AdminImageController.upload));

    router.put    ('/publication', wrap(AdminPublicationController.put));
    router.delete ('/publication/:id', wrap(AdminPublicationController.deleteById));

    return router;
  }
  apiRouter.use('/admin', adminRouter());

  function guestRouter () {
    const router = express.Router();
    router.use(acl.allow(UserRole.GUEST));

    router.post  ('/create', wrap(GuestController.create));
    router.post  ('/login', wrap(GuestController.login));
    router.get   ('/reset_password_info', wrap(GuestController.resetPasswordInfo));
    router.get   ('/request_password_reset_link', wrap(GuestController.requestPasswordResetLink));
    router.post  ('/reset_password', wrap(GuestController.resetPassword));

    return router;
  }
  apiRouter.use('/guest', guestRouter());

  function userRouter () {
    const router = express.Router();
    router.use(acl.deny(UserRole.GUEST));

    router.get   ('', wrap(UserController.getCurrent));
    router.post  ('/logout', wrap(UserController.logout));
    router.get   ('/activate/:activateJwt', wrap(UserController.activateJwt));
    router.post  ('/change_password', wrap(UserController.changePassword));
    router.post  ('/upload_avatar', UserController.uploadAvatarMiddleware(), wrap(UserController.uploadAvatar));
    router.post  ('/settings_update', wrap(UserController.settingsUpdate));
    router.get   ('/byid/:id', wrap(UserController.getById));

    return router;
  }
  apiRouter.use('/user', userRouter());

  function publicRouter () {
    const router = express.Router();

    router.get  ('/setting/front_collection', wrap(SettingController.getFrontCollection));

    router.get  ('/page/by_name/:name', wrap(PageController.getByName));

    router.get  ('/publication/list', wrap(PublicationsController.getFetchList));
    router.get  ('/publication/:id', wrap(PublicationsController.getById));

    return router;
  }
  apiRouter.use(publicRouter());

  apiRouter.use((error, req, res, next) => {
    console.log(error);  
    res.status(500).json({
      error: error,
    });
  });

  return apiRouter;
}

router.use('/api', apiRouter());

router.get('/sitemap.xml', wrap(SiteMapController.getSiteMapXml));
router.get('/image/:uuid', wrap(ImageController.getImageByUuid));

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

export default router;
