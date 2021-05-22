import { getPrisma } from './index';
import { Authorization } from '@prisma/client';

export default class AuthorizationModel {
  model: Authorization;

  constructor (model: Authorization) {
    this.model = model;
  }

  static wrap (model: Authorization) {
    return new AuthorizationModel(model);
  }
}