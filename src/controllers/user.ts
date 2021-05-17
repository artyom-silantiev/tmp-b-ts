import { Router, Request, Response } from 'express';
import Validator, { vlChecks } from '../lib/validator';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from '../lib/bcrypt';
import * as multer from 'multer';
import * as db from '@/models';

const router = Router();
const prisma = db.getPrisma();

export async function getCurrent (req: Request, res: Response) {
  const resData = {
    isAuth: false,
    user: null,
  };

  if (req.authorization) {
    let user = await req.authorization.getUser();
    resData.isAuth = true;
    resData.user = db.models.User.privateInfo(user);
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
    const decoded = db.models.User.verifyJwtToken(activateJwt);
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

  const passwordIsCompare = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!passwordIsCompare) {
    return res
      .status(400)
      .json(Validator.singleError('oldPassword', 'fieldInvalid'));
  }

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      passwordHash: await bcrypt.generatePasswordHash(newPassword)
    }
  });

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
    const putImageRes = await db.models.Image.putImageAndGetRefInfo(imageFile.buffer);
    if (putImageRes.isGood()) {
      await prisma.user.update({
        where: {
          id: user.id
        },
        data: {
          avatarId: putImageRes.data.id
        }
      });
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

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      firstName: req.body.firstName,
      lastName: req.body.lastName
    }
  });

  res.send('done');
}

/**
 * @method post
 * @scheme /:id
 */
export async function getById (req: Request, res: Response) {
  const userId = BigInt(req.params.id);

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    include: {
      Avatar: true
    }
  });

  if (!user) {
    return res.status(404).json({
      error: 'user not found',
    });
  }

  res.json(db.models.User.publicInfo(user));
}
