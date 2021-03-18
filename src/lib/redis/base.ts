import { createHandyClient, IHandyRedis } from 'handy-redis';
import config from '@/config';

export class RedisBase {
  protected defaultClient: IHandyRedis;
  protected defaultClientSubscribe: IHandyRedis;
  protected clients: { [key: string]: IHandyRedis } = {};

  constructor() {
    this.init();
  }

  public init () {
    if (this.defaultClient) {
      this.defaultClient.quit();
    }
    this.defaultClient = this.createClient();
    this.defaultClient.select(config.redis.database);

    if (this.defaultClientSubscribe) {
      this.defaultClientSubscribe.quit();
    }
    this.defaultClientSubscribe = this.createClient();
    this.defaultClientSubscribe.select(config.redis.database);

    return this;
  }

  protected createClient() {
    let newClient = createHandyClient(config.redis.port, config.redis.host);
    newClient.select(config.redis.database);
    return newClient;
  }

  public getClient() {
    return this.defaultClient;
  }

  public getClientSubscribe() {
    return this.defaultClientSubscribe;
  }

  public async getClientByName(name: string) {
    if (this.clients[name]) {
      return this.clients[name];
    } else {
      this.clients[name] = await this.createClient();
      return this.clients[name];
    }
  }
}

export const redisBase = new RedisBase();
