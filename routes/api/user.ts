import { Router, Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import config from '../../config/server';
import Validator, { vlChecks } from '../../lib/validator';
import acl from '../../lib/acl';
import * as jwt from 'jsonwebtoken';
import * as salthash from '../../lib/salthash';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as sharp from 'sharp';
import * as multer from 'multer';
import * as db from '../../db';

const router = Router();

router.get(
  '',
  acl.deny(db.models.User.UserRole.Guest),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resData = {
        isAuth: false,
        user: null,
      };

      if (req.authorization) {
        let user = await req.authorization.getUser();
        resData.isAuth = true;
        resData.user = user.privateInfo();
      }

      res.json(resData);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/create',
  acl.allow(db.models.User.UserRole.Guest),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let userRegIsDisabledSetting = await db.models.Setting.getRepository().getSetting(
        db.models.Setting.Settings.userRegistrationDisabled
      );
      if (userRegIsDisabledSetting && userRegIsDisabledSetting.value === '1') {
        return res.status(403).send('disabled');
      }

      let validationResult = await new Validator([
        {
          field: 'email',
          checks: [
            { check: (val) => vlChecks.notEmpty(val), msg: 'fieldRequired' },
            { check: (val) => vlChecks.isEmail(val), msg: 'fieldInvalid' },
          ],
        },
        {
          field: 'password',
          checks: [
            { check: (val) => vlChecks.notEmpty(val), msg: 'fieldRequired' },
          ],
        },
        {
          field: 'passwordConfirmation',
          checks: [
            { check: (val) => vlChecks.notEmpty(val), msg: 'fieldRequired' },
            {
              check: (value, { body }) => value === body['password'],
              msg: 'fieldInvalid',
            },
          ],
        },
        {
          field: 'recaptchaToken',
          checks: [
            {
              check: async (val, { req }) =>
                vlChecks.googleRecaptchaVerify(val, req),
              msg: 'recaptchaNotVerify',
            },
          ],
        },
      ])
        .setRequest(req)
        .validation();
      if (validationResult.getTotalErrors() > 0) {
        return res.status(400).json(validationResult);
      }

      const email = req.body.email;
      const password = req.body.password;

      const user = await db.models.User.getRepository().findOne({
        where: {
          email,
        },
      });
      if (user) {
        return res
          .status(400)
          .json(Validator.singleError('email', 'userIsExists'));
      }

      const newUser = await db.models.User.getRepository().createUser(
        email,
        password
      );
      await newUser.sendRegisterNotify();

      res.status(201).json({ user: newUser.publicInfo() });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/login',
  acl.allow(db.models.User.UserRole.Guest),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let validationResult = await new Validator([
        {
          field: 'email',
          checks: [
            { check: (val) => vlChecks.notEmpty(val), msg: 'fieldRequired' },
            { check: (val) => vlChecks.isEmail(val), msg: 'fieldInvalid' },
          ],
        },
        {
          field: 'password',
          checks: [
            { check: (val) => vlChecks.notEmpty(val), msg: 'fieldRequired' },
          ],
        },
      ])
        .setRequest(req)
        .validation();
      if (validationResult.getTotalErrors() > 0) {
        return res.status(400).json(validationResult);
      }

      const email = req.body.email;
      const password = req.body.password;

      const user = await db.models.User.getRepository().findOne({
        where: {
          email,
        },
      });

      if (!user || !salthash.compare(password, user.passwordHash)) {
        return res
          .status(400)
          .json(Validator.singleError('email', 'userNotFoundOrBadPassword'));
      }

      let authorization = await user.generateAuthorization();

      res.json({
        token: authorization.token,
        user: user.privateInfo(),
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/logout',
  acl.deny(db.models.User.UserRole.Guest),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await req.authorization.logout();
      res.json({});
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/activate/:activateJwt',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const activateJwt = req.params['activateJwt'];
      if (activateJwt) {
        const decoded = jwt.verify(activateJwt, config.node.jwtSecret);
        if (decoded) {
          const activateUserJwt = Object.assign(
            new db.models.User.UserActivateJwt(),
            decoded
          );
          const activateStatus = await activateUserJwt.checkAndActivate();
          return res.redirect('/?activateStatus=' + activateStatus);
        }
      }

      return res.redirect('/');
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/reset_password_info',
  acl.allow(db.models.User.UserRole.Guest),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let validationResult = await new Validator([
        {
          field: 'code',
          checks: [
            { check: (val) => vlChecks.notEmpty(val), msg: 'fieldRequired' },
          ],
        },
      ])
        .setRequest(req)
        .validation();
      if (validationResult.getTotalErrors() > 0) {
        return res.status(400).json(validationResult);
      }

      if (typeof req.query['code'] !== 'string') {
        return res.status(400).send();
      }

      const resetPasswordCode = req.query['code'];
      const decoded = await jwt.verify(
        resetPasswordCode,
        config.node.jwtSecret
      );
      if (decoded) {
        const userResetPasswordJwt = Object.assign(
          new db.models.User.UserResetPasswordJwt(),
          decoded
        );
        const user = await userResetPasswordJwt.getUser();
        if (user) {
          return res.json({
            email: user.email,
          });
        }
      }

      return res.status(400).send('bad password reset code');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Create and send to user password reset link.
 */
router.post(
  '/request_password_reset_link',
  acl.allow(db.models.User.UserRole.Guest),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let validationResult = await new Validator([
        {
          field: 'email',
          checks: [
            { check: (val) => vlChecks.notEmpty(val), msg: 'fieldRequired' },
            { check: (val) => vlChecks.isEmail(val), msg: 'fieldInvalid' },
          ],
        },
      ])
        .setRequest(req)
        .validation();
      if (validationResult.getTotalErrors() > 0) {
        return res.status(400).json(validationResult);
      }

      const email = req.body.email;

      const user = await db.models.User.getRepository().findOne({
        where: {
          email,
        },
      });
      if (!user) {
        return res
          .status(404)
          .json(Validator.singleError('email', 'userNotFound'));
      }

      await user.sendResetPasswordLinkNotify();

      res.json({});
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/reset_password',
  acl.allow(db.models.User.UserRole.Guest),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let validationResult = await new Validator([
        {
          field: 'resetPasswordCode',
          checks: [
            { check: (val) => vlChecks.notEmpty(val), msg: 'fieldRequired' },
          ],
        },
        {
          field: 'password',
          checks: [
            { check: (val) => vlChecks.notEmpty(val), msg: 'fieldRequired' },
          ],
        },
        {
          field: 'passwordConfirmation',
          checks: [
            { check: (val) => vlChecks.notEmpty(val), msg: 'fieldRequired' },
            {
              check: (value, { body }) => value === body['password'],
              msg: 'fieldInvalid',
            },
          ],
        },
      ])
        .setRequest(req)
        .validation();
      if (validationResult.getTotalErrors() > 0) {
        return res.status(400).json(validationResult);
      }

      const password = req.body.password;

      const resetPasswordCode = req.body['resetPasswordCode'];
      const decoded = await jwt.verify(
        resetPasswordCode,
        config.node.jwtSecret
      );
      if (decoded) {
        const userResetPasswordJwt = Object.assign(
          new db.models.User.UserResetPasswordJwt(),
          decoded
        );
        const resetResult = userResetPasswordJwt.checkAndResetPassword(
          password
        );
        if (resetResult) {
          return res.json({});
        }
      }

      res
        .status(422)
        .json(Validator.singleError('resetPasswordCode', 'fieldInvalid'));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/change_password',
  acl.deny(db.models.User.UserRole.Guest),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let validationResult = await new Validator([
        {
          field: 'oldPassword',
          checks: [
            { check: (val) => vlChecks.notEmpty(val), msg: 'fieldRequired' },
          ],
        },
        {
          field: 'newPassword',
          checks: [
            { check: (val) => vlChecks.notEmpty(val), msg: 'fieldRequired' },
          ],
        },
        {
          field: 'newPasswordConfirmation',
          checks: [
            { check: (val) => vlChecks.notEmpty(val), msg: 'fieldRequired' },
            {
              check: (value, { body }) => value === body['newPassword'],
              msg: 'fieldInvalid',
            },
          ],
        },
      ])
        .setRequest(req)
        .validation();
      if (validationResult.getTotalErrors() > 0) {
        return res.status(400).json(validationResult);
      }

      const oldPassword = req.body.oldPassword;
      const newPassword = req.body.newPassword;
      const user = await req.authorization.getUser();

      if (!user) {
        return res.status(404).send();
      }

      if (!salthash.compare(oldPassword, user.passwordHash)) {
        return res
          .status(400)
          .json(Validator.singleError('oldPassword', 'fieldInvalid'));
      }

      user.passwordHash = salthash.generateSaltHash(newPassword);
      await db.models.User.getRepository().save(user);

      res.send('done');
    } catch (error) {
      next(error);
    }
  }
);

const avatarUploader = multer({
  limits: {
    fileSize: 1024 * 1024 * 2, // 2MB
  },
});
router.post(
  '/upload_avatar',
  avatarUploader.single('avatarFile'),
  acl.deny(db.models.User.UserRole.Guest),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (
        req.file &&
        ['png', 'jpeg'].indexOf(
          req.file.mimetype.replace(/^image\/(.*)$/, '$1')
        ) !== -1
      ) {
        const avatarFile = req.file;
        const user = await req.authorization.getUser();

        let userId = req.authorization.userId;

        let oldAvatar = '';
        if (user.avatar) {
          oldAvatar = path.join(process.cwd(), 'public', user.avatar);
        }

        const name = userId + '.' + Date.now() + '.png';
        const file = path.join(
          process.cwd(),
          'public',
          'images',
          'users_avatars',
          name
        );
        const imageUrl = '/images/users_avatars/' + name;

        const image = await sharp(avatarFile.buffer);
        await image.resize(240).png({ quality: 75 }).toFile(file);

        user.avatar = imageUrl;
        await db.models.User.getRepository().save(user);

        if (oldAvatar) {
          await fs.remove(oldAvatar);
        }
      }

      res.status(201).json({});
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/settings_update',
  acl.deny(db.models.User.UserRole.Guest),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let validationResult = await new Validator([
        {
          field: 'firstName',
          checks: [
            { check: (val) => vlChecks.notEmpty(val), msg: 'fieldRequired' },
          ],
        },
        {
          field: 'lastName',
          checks: [
            { check: (val) => vlChecks.notEmpty(val), msg: 'fieldRequired' },
          ],
        }
      ])
        .setRequest(req)
        .validation();
      if (validationResult.getTotalErrors() > 0) {
        return res.status(400).json(validationResult);
      }

      const user = await req.authorization.getUser();

      if (!user) {
        return res.status(404).send();
      }

      if (!!user.firstName && user.firstName !== req.body.firstName) {
        return res
          .status(400)
          .json(Validator.singleError('firstName', 'fieldInvalid'));
      }

      if (!!user.lastName && user.lastName !== req.body.lastName) {
        return res
          .status(400)
          .json(Validator.singleError('lastName', 'fieldInvalid'));
      }

      user.firstName = req.body.firstName;
      user.lastName = req.body.lastName;
      await db.models.User.getRepository().save(user);

      res.send('done');
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/byid/:id',
  acl.deny(db.models.User.UserRole.Guest),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id;

      const user = await db.models.User.getRepository().findOne({
        where: {
          id: userId,
        },
      });

      if (!user) {
        return res.status(404).json({
          error: 'user not found',
        });
      }

      res.json(user.publicInfo());
    } catch (error) {
      next(error);
    }
  }
);

export default router;
