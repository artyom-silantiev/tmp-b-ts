import * as jwt from 'jsonwebtoken';
import * as bcrypt from '@/lib/bcrypt';
import * as moment from 'moment';
import * as mailer from '@/lib/mailer';
import { redisBase } from '@/lib/redis/base';
import * as _ from 'lodash';
import Bs58 from '@/lib/bs58';
import env from '@/env';

import { UserRole, User, Image } from '@prisma/client';
import { getPrisma } from './index';
import { getPublicPath } from './Image';

export { getPrisma } from './index';

const prisma = getPrisma();

export class UserJwt {
  userId: bigint;
  role: UserRole;
  token: string = '';
  uid: string;

  constructor (token: string) {
    this.token = token;
  }

  async logout() {
    await prisma.authorization.deleteMany(
      {
        where: {
          userId: this.userId,
          tokenUid: this.uid
        }
      }
    );

    const redisClient = redisBase.getClient();
    const redisKey = 'auth:' + this.userId + ':' + this.uid;
    await redisClient.del(redisKey);
  }

  getUser(): Promise<User> {
    return prisma.user.findFirst({
      where: {
        id: this.userId
      },
      include: {
        Avatar: true
      }
    });
  }

  async isAuth() {
    const redisClient = redisBase.getClient();

    const redisAuth = await redisClient.get(
      'auth:' + this.userId + ':' + this.uid
    );
    if (!!redisAuth) {
      try {
        const cacheData = JSON.parse(redisAuth);
        this.role = cacheData.role || null;
      } catch (error) {}
      return true;
    }

    let authorization = await prisma.authorization.findFirst({
      where: {
        userId: this.userId,
        tokenUid: this.uid,
        expirationAt: {
          lt: new Date()
        }
      },
    });

    if (!!authorization) {
      const exSeconds = Math.ceil(
        moment(authorization.expirationAt).diff(new Date()) / 1000
      );
      const user = await this.getUser();
      const cacheData = {
        role: user.role,
      };
      this.role = cacheData.role || null;
      await redisClient.set(
        'auth:' + this.userId + ':' + this.uid,
        JSON.stringify(cacheData),
        ['EX', exSeconds]
      );
      return true;
    } else {
      return false;
    }
  }
}

export class UserActivateJwt {
  userId: bigint;
  email: string;

  public async checkAndActivate() {
    const user = await prisma.user.findFirst({
      where: {
        id: this.userId
      }
    });
    if (user) {
      if (!user.emailActivatedAt && user.email === this.email) {
        await prisma.user.update({
          where: {
            id: user.id
          },
          data: {
            emailActivatedAt: new Date
          }
        });
        return 'success';
      }
      return 'activated';
    }
    return 'error';
  }
}

export class UserResetPasswordJwt {
  userId: bigint;
  passwordHash: string;

  public async getUser() {
    const user = await prisma.user.findFirst({
      where: {
        id: this.userId,
        passwordHash: this.passwordHash,
      },
    });
    return user;
  }

  public async checkAndResetPassword(newPassword: string) {
    const user = await this.getUser();
    if (user) {
      const newPasswordHash = await bcrypt.generatePasswordHash(newPassword);
      await prisma.user.update({
        where: {
          id: user.id
        },
        data: {
          passwordHash: newPasswordHash
        }
      });
      user.passwordHash = newPasswordHash;
      return true;
    }
    return false;
  }
}

export async function generateAuthorizationForUser (user: User, expiresInSec?: number) {
  expiresInSec = expiresInSec || 60 * 60;

  const uid = Bs58.uuid();

  let token = jwt.sign(
    {
      uid,
      userId: user.id,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: expiresInSec }
  );

  const expirationAt = new Date(Math.floor(Date.now() + expiresInSec * 1000));
  const authorization = await prisma.authorization.create({
    data: {
      userId: user.id,
      tokenUid: uid,
      expirationAt
    }
  });

  return {token, authorization};
}

export async function verifyJwtToken (token: string) {
  const decoded = await jwt.verify(
    token,
    env.JWT_SECRET
  );
  return decoded;
}

export function publicInfo (user: User & { Avatar?: Image }) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    avatar: user.Avatar ? getPublicPath(user.Avatar) : null,
    createdAt: user.createdAt,
    isActivated: !!user.emailActivatedAt,
  };
}

export function privateInfo (user: User & { Avatar?: Image }) {
  const info = this.publicInfo(user);
  return info;
}

export async function sendRegisterNotify(user: User) {
  const activateEmailCode = jwt.sign(
    {
      userId: user.id.toString(),
      email: user.email,
    },
    env.JWT_SECRET
  );

  const activateEmailLink =
    env.NODE_PROTOCOL +
    '//' +
    env.NODE_HOST +
    '/api/user/activate/' +
    activateEmailCode;

  await mailer.sendEmail(
    'register.ejs',
    { activateEmailLink },
    {
      to: user.email,
      subject: 'Регистрация',
    }
  );
}

export async function sendResetPasswordLinkNotify (user: User) {
  const resetPasswordCode = jwt.sign(
    {
      userId: user.id.toString(),
      passwordHash: user.passwordHash,
    },
    env.JWT_SECRET
  );

  const resetPasswordLink =
    env.NODE_PROTOCOL +
    '//' +
    env.NODE_HOST +
    '/password/reset/' +
    resetPasswordCode;

  await mailer.sendEmail(
    'reset_password_link.ejs',
    { resetPasswordLink },
    {
      to: user.email,
      subject: 'Сброс пароля',
    }
  );
}

export async function createUser(email, password, options?): Promise<User> {
  options = options || {};

  const passwordHash = await bcrypt.generatePasswordHash(password);
  const createUserParams = <User>_.merge(
    {
      email,
      passwordHash,
    },
    options.params || {}
  );
  const newUser = await prisma.user.create({
    data: createUserParams
  });

  return newUser;
}
