import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  JoinColumn,
  OneToMany,
  OneToOne,
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
  getCustomRepository
} from 'typeorm';
import config from '@/config/server';
import * as jwt from 'jsonwebtoken';
import * as salthash from '@/lib/salthash';
import * as moment from 'moment';
import * as mailer from '@/lib/mailer';
import { redisBase } from '@/lib/redis/base';
import * as Authorization from './Authorization';
import * as _ from 'lodash';
import { Image } from './Image';
import Bs58 from '@/lib/bs58';

export enum UserRole {
  Guest = 'guest',
  User = 'user',
  Admin = 'admin',
}

export class UserJwt {
  userId: string;
  role: UserRole = null;
  token: string = '';
  uid: string;

  constructor (token: string) {
    this.token = token;
  }

  async logout() {
    let authorization = await Authorization.getRepository().findOne(
      {
        where: {
          userId: this.userId,
          tokenUid: this.uid,
        },
      }
    );
    await Authorization.getRepository().remove(authorization);

    const redisClient = redisBase.getClient();
    const redisKey = 'auth:' + this.userId + ':' + this.uid;
    await redisClient.del(redisKey);
  }

  getUser(): Promise<User> {
    return getRepository().findOne(this.userId, {relations: ['avatarImage']});
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

    let authorization = await Authorization.getRepository().findOne({
      where: {
        userId: this.userId,
        tokenUid: this.uid,
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

  @Column({ default: '' })
  firstName: string;

  @Column({ default: '' })
  lastName: string;

  @OneToOne(type => Image, { nullable: true })
  @JoinColumn()
  avatarImage: Image;

  @OneToMany(type => Authorization.Authorization, authorization => authorization.user)
  authorizations: Authorization.Authorization[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  public async generateAuthorization(expiresInSec?: number) {
    expiresInSec = expiresInSec || 60 * 60;

    const uid = Bs58.uuid();

    let token = jwt.sign(
      {
        uid,
        userId: this.id,
        role: this.role,
      },
      config.node.jwtSecret,
      { expiresIn: expiresInSec }
    );

    let expirationAt = new Date(Math.floor(Date.now() + expiresInSec * 1000));
    let authorization = Authorization.getRepository().create({
      user: this,
      tokenUid: uid,
      expirationAt,
    });
    await Authorization.getRepository().save(authorization);

    return {token, authorization};
  }

  public publicInfo() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      avatar: this.avatarImage ? this.avatarImage.getPublicPath() : null,
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
