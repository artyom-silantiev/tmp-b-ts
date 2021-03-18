import { Request, Response } from 'express';
import config from '../config/server';
import Validator, { vlChecks } from '../lib/validator';
import * as jwt from 'jsonwebtoken';
import * as salthash from '../lib/salthash';
import * as multer from 'multer';
import * as db from '../db';
import * as ImageModel from '../db/entity/Image';

/**
 * @method post
 */
export async function create (req: Request, res: Response) {
  let userRegIsDisabledSetting = await db.models.Setting.getRepository().getSetting(
    db.models.Setting.Settings.userRegistrationDisabled
  );
  if (userRegIsDisabledSetting && userRegIsDisabledSetting.value === '1') {
    res.status(403).send('disabled');
    return;
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
    res.status(400).json(validationResult);
    return
  }

  const email = req.body.email;
  const password = req.body.password;

  const user = await db.models.User.getRepository().findOne({
    where: {
      email,
    },
  });
  if (user) {
    res
      .status(400)
      .json(Validator.singleError('email', 'userIsExists'));
    return
  }

  const newUser = await db.models.User.getRepository().createUser(
    email,
    password
  );
  await newUser.sendRegisterNotify();

  res.status(201).json({ user: newUser.publicInfo() });
}

/**
 * @method post
 */
export async function login (req: Request, res: Response) {
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
    relations: ['avatarImage']
  });

  if (!user || !salthash.compare(password, user.passwordHash)) {
    return res
      .status(400)
      .json(Validator.singleError('email', 'userNotFoundOrBadPassword'));
  }

  let authorization = await user.generateAuthorization();

  console.log('asdsad');

  res.json({
    token: authorization.token,
    user: user.privateInfo(),
  });
}

/**
 * @method get
 */
export async function resetPasswordInfo (req: Request, res: Response) {
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
}

/**
 * @method get
 */
export async function requestPasswordResetLink (req: Request, res: Response) {
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
}

/**
 * @method post
 */
export async function resetPassword (req: Request, res: Response) {
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
}
