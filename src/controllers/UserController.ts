import { Router, Request, Response, NextFunction } from 'express';
import config from '../config/server';
import Validator, { vlChecks } from '../lib/validator';
import * as jwt from 'jsonwebtoken';
import * as salthash from '../lib/salthash';
import * as multer from 'multer';
import * as db from '../db';
import * as ImageModel from '../db/entity/Image';

const router = Router();

export async function getCurrent (req: Request, res: Response) {
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
}

/**
 * @method post
 */
export async function logout (req: Request, res: Response) {
  await req.authorization.logout();
  res.json({});
}

/**
 * @method get
 * @scheme :activateJwt
 */
export async function activateJwt (req: Request, res: Response) {
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
}

/**
 * @method post
 */
export async function changePassword (req: Request, res: Response) {
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
}

export function uploadAvatarMiddleware () {
  return multer({
    limits: {
      fileSize: 1024 * 1024 * 2 // 2MB
    },
  }).any();
}

/**
 * @method post
 */
export async function uploadAvatar (req: Request, res: Response) {
  if (
    req.files && req.files.length === 1 &&
    ['png', 'jpeg'].indexOf(
      req.files[0].mimetype.replace(/^image\/(.*)$/, '$1')
    ) !== -1
  ) {
    const user = await req.authorization.getUser();
    const imageFile = req.files[0];
    const putImageRes = await ImageModel.getRepository().putImageAndGetRefInfo(imageFile.buffer);
    if (putImageRes.isGood()) {
      user.avatarImage = putImageRes.data;
      await db.models.User.getRepository().save(user);
      res.status(putImageRes.code).json({
        uuid: putImageRes.data.uuid,
        meta: putImageRes.data.meta
      });
    } else {
      res.status(200).send();
    }
  } else {
    res.status(400).send();
  }
}

/**
 * @method post
 */
export async function settingsUpdate (req: Request, res: Response) {
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
}

/**
 * @method post
 * @scheme /:id
 */
export async function getById (req: Request, res: Response) {
  const userId = req.params.id;

  const user = await db.models.User.getRepository().findOne({
    where: {
      id: userId,
    },
    relations: ['avatarImage']
  });

  if (!user) {
    return res.status(404).json({
      error: 'user not found',
    });
  }

  res.json(user.publicInfo());
}
