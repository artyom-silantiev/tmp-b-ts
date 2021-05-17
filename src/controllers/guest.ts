import { Request, Response } from 'express';
import Validator, { vlChecks } from '../lib/validator';
import * as bcrypt from '../lib/bcrypt';
import * as db from '../models';
import { Image, User } from '.prisma/client';

const prisma = db.getPrisma();

/**
 * @method post
 */
export async function userCreate (req: Request, res: Response) {
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

  const user = await prisma.user.findFirst({
    where: {
      email
    }
  });
  
  if (user) {
    res
      .status(400)
      .json(Validator.singleError('email', 'userIsExists'));
    return
  }

  const newUser = await db.models.User.createUser(
    email,
    password
  );
  await db.models.User.sendRegisterNotify(newUser);
  res.status(201).json({ user: db.models.User.publicInfo(newUser) });
}

/**
 * @method post
 */
export async function userLogin (req: Request, res: Response) {
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

  const user = await prisma.user.findFirst({
    where: {
      email
    },
    include: {
      Avatar: true
    }
  }) as User & { Avatar?: Image };

  const passwordIsCompare = await bcrypt.compare(password, user.passwordHash);
  if (!user || !passwordIsCompare) {
    return res
      .status(400)
      .json(Validator.singleError('email', 'userNotFoundOrBadPassword'));
  }

  let authorization = await db.models.User.generateAuthorizationForUser(user);

  res.json({
    token: authorization.token,
    user: db.models.User.privateInfo(user)
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
  const decoded = db.models.User.verifyJwtToken(resetPasswordCode);
  if (decoded) {
    const userResetPasswordJwt = Object.assign(
      new db.models.User.UserResetPasswordJwt(),
      decoded
    );
    const user = await userResetPasswordJwt.getUser();
    if (user) {
      return res.json({
        email: user.email
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

  const user = await prisma.user.findFirst({
    where: {
      email
    }
  });
  
  if (!user) {
    return res
      .status(404)
      .json(Validator.singleError('email', 'userNotFound'));
  }

  await db.models.User.sendResetPasswordLinkNotify(user);

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
  const decoded = db.models.User.verifyJwtToken(resetPasswordCode);
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
