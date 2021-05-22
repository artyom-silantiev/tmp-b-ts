import { getPrisma } from './index';
import { Publication } from '@prisma/client';

export default class PublicationModel {
  model: Publication;

  constructor (model: Publication) {
    this.model = model;
  }

  static wrap (model: Publication) {
    return new PublicationModel(model);
  }
}