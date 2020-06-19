import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
  MoreThan,
  MoreThanOrEqual,
  LessThan,
  LessThanOrEqual,
  Not,
  Equal,
  In,
  Any,
  Raw,
  IsNull,
  Like,
  Between,
  EntityRepository,
  Repository,
  getCustomRepository,
} from 'typeorm';
import config from '../../config/server';
import * as jwt from 'jsonwebtoken';
import * as salthash from '../../lib/salthash';
import * as moment from 'moment';
import * as mailer from '../../lib/mailer';
import redis from '../../lib/redis';
import * as Authorization from './Authorization';
import * as _ from 'lodash';

export class UserJwt {
  userId: string;
  role: UserRole = null;
  token: string = '';

  constructor (token: string) {
    this.token = token;
  }

  async logout() {
    let authorization = await Authorization.getRepository().findOne(
      {
        where: {
          userId: this.userId,
          token: this.token,
        },
      }
    );
    await Authorization.getRepository().remove(authorization);

    const redisClient = redis.getClient();
    const redisKey = 'auth:' + this.userId + ':' + this.token;
    await redisClient.del(redisKey);
  }

  async getUser(): Promise<User> {
    return await getRepository().findOne(this.userId);
  }

  async isAuth() {
    const redisClient = redis.getClient();

    const redisAuth = await redisClient.get(
      'auth:' + this.userId + ':' + this.token
    );
    if (!!redisAuth) {
      try {
        const cacheData = JSON.parse(redisAuth);
        this.role = cacheData.role || null;
      } catch (error) {}
      return true;
    }

    let authorization = await Authorization.getRepository().findOne({
      where: {
        userId: this.userId,
        token: this.token,
        expirationAt: MoreThanOrEqual(new Date()),
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
        'auth:' + this.userId + ':' + this.token,
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
  userId: string;
  email: string;

  public async checkAndActivate() {
    const user = await getRepository().findOne(this.userId);
    if (user) {
      if (!user.emailActivatedAt && user.email === this.email) {
        user.emailActivatedAt = new Date();
        await getRepository().save(user);
        return 'success';
      }
      return 'activated';
    }
    return 'error';
  }
}

export class UserResetPasswordJwt {
  userId: string;
  passwordHash: string;

  public async getUser() {
    const user = await getRepository().findOne({
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
      user.passwordHash = salthash.generateSaltHash(newPassword);
      await getRepository().save(user);
      return true;
    }
    return false;
  }
}

export enum UserRole {
  Guest = 'guest',
  User = 'user',
  Admin = 'admin',
}

@Entity({
  name: 'users',
})
@Unique(['email'])
export class User {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column('enum', { enumName: 'users_user_role_enum', enum: UserRole })
  role: UserRole;

  @Column()
  email: string;

  @Column('timestamp', { nullable: true })
  emailActivatedAt: Date;

  @Column()
  passwordHash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column('varchar', { nullable: true })
  avatar: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  public async generateAuthorization(expiresInSec?: number) {
    expiresInSec = expiresInSec || 60 * 60;

    let token = jwt.sign(
      {
        userId: this.id,
        role: this.role,
      },
      config.node.jwtSecret,
      { expiresIn: expiresInSec }
    );

    let expirationAt = new Date(Math.floor(Date.now() + expiresInSec * 1000));
    let authorization = Authorization.getRepository().create({
      user: this,
      token,
      expirationAt,
    });
    await Authorization.getRepository().save(authorization);

    return authorization;
  }

  public publicInfo() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      avatar: this.avatar,
      createdAt: this.createdAt,
      isActivated: !!this.emailActivatedAt,
    };
  }

  public privateInfo() {
    const info = this.publicInfo();
    return info;
  }

  public async sendRegisterNotify() {
    const activateEmailCode = jwt.sign(
      {
        userId: this.id,
        email: this.email,
      },
      config.node.jwtSecret
    );

    const activateEmailLink =
      config.node.protocol +
      '//' +
      config.node.host +
      '/api/user/activate/' +
      activateEmailCode;

    await mailer.sendEmail(
      'register.ejs',
      { activateEmailLink },
      {
        to: this.email,
        subject: 'Регистрация',
      }
    );
  }

  public async sendResetPasswordLinkNotify() {
    const resetPasswordCode = jwt.sign(
      {
        userId: this.id,
        passwordHash: this.passwordHash,
      },
      config.node.jwtSecret
    );

    const resetPasswordLink =
      config.node.protocol +
      '//' +
      config.node.host +
      '/password/reset/' +
      resetPasswordCode;

    await mailer.sendEmail(
      'reset_password_link.ejs',
      { resetPasswordLink },
      {
        to: this.email,
        subject: 'Сброс пароля',
      }
    );
  }
}

@EntityRepository(User)
export class UserRepository extends Repository<User> {
  public async createUser(email, password, options?): Promise<User> {
    options = options || {};

    const passwordHash = salthash.generateSaltHash(password);
    const createUserParams = <User>_.merge(
      {
        email,
        passwordHash,
      },
      options.params || {}
    );
    const newUser = await this.create(createUserParams);

    await this.save(newUser);

    return newUser;
  }
}

export function getRepository() {
  return getCustomRepository(UserRepository);
}
