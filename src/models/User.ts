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
import ImageModel from './Image';

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

  static verifyJwtToken (token: string) {
    const decoded = jwt.verify(
      token,
      env.JWT_SECRET
    );
    return decoded;
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

export default class UserModel {
  model: User & { Avatar?: Image };

  constructor (model: User & { Avatar?: Image }) {
    this.model = model;
  }

  static wrap (model: User & { Avatar?: Image }) {
    return new UserModel(model);
  }

  async generateAuthorizationForUser (expiresInSec?: number) {
    expiresInSec = expiresInSec || 60 * 60;

    const uid = Bs58.uuid();

    let token = jwt.sign(
      {
        uid,
        userId: this.model.id,
        role: this.model.role,
      },
      env.JWT_SECRET,
      { expiresIn: expiresInSec }
    );

    const expirationAt = new Date(Math.floor(Date.now() + expiresInSec * 1000));
    const authorization = await prisma.authorization.create({
      data: {
        userId: this.model.id,
        tokenUid: uid,
        expirationAt
      }
    });

    return {token, authorization};
  }

  publicInfo () {
    return {
      id: this.model.id,
      email: this.model.email,
      firstName: this.model.firstName,
      lastName: this.model.lastName,
      role: this.model.role,
      avatar: this.model.Avatar ? ImageModel.wrap(this.model.Avatar).getPublicPath() : null,
      createdAt: this.model.createdAt,
      isActivated: !!this.model.emailActivatedAt,
    };
  }

  privateInfo () {
    const info = this.publicInfo();
    return info;
  }

  async sendRegisterNotify () {
    const activateEmailCode = jwt.sign(
      {
        userId: this.model.id.toString(),
        email: this.model.email,
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
        to: this.model.email,
        subject: 'Регистрация',
      }
    );
  }

  async sendResetPasswordLinkNotify () {
    const resetPasswordCode = jwt.sign(
      {
        userId: this.model.id.toString(),
        passwordHash: this.model.passwordHash,
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
        to: this.model.email,
        subject: 'Сброс пароля',
      }
    );
  }

  static async createUser (email: string, password: string, options?): Promise<User> {
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
}
