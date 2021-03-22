import { createNodeRedisClient, WrappedNodeRedisClient } from 'handy-redis';

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = parseInt(process.env.REDIS_PORT);
const REDIS_DB = parseInt(process.env.REDIS_DB);

export class RedisBase {
  protected defaultClient: WrappedNodeRedisClient;
  protected defaultClientSubscribe: WrappedNodeRedisClient;
  protected clients: { [key: string]: WrappedNodeRedisClient } = {};

  constructor() {
    this.init();
  }

  public init () {
    if (this.defaultClient) {
      this.defaultClient.quit();
    }
    this.defaultClient = this.createClient();
    this.defaultClient.select(REDIS_DB);

    if (this.defaultClientSubscribe) {
      this.defaultClientSubscribe.quit();
    }
    this.defaultClientSubscribe = this.createClient();
    this.defaultClientSubscribe.select(REDIS_DB);

    return this;
  }

  protected createClient() {
    let newClient = createNodeRedisClient(REDIS_PORT, REDIS_HOST);
    newClient.select(REDIS_DB);
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
