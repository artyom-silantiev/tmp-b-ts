import { createHandyClient, IHandyRedis } from 'handy-redis';
import config from '../config';
import { Interface } from 'readline';

class Redis {
  protected defaultClient: IHandyRedis;
  protected clients: { [key: string]: IHandyRedis } = {};

  public init() {
    if (this.defaultClient) {
      this.defaultClient.quit();
    }
    this.defaultClient = createHandyClient(
      config.redis.port,
      config.redis.host
    );
    this.defaultClient.select(config.redis.database);

    return this;
  }

  protected createClient() {
    let newClient = createHandyClient(config.redis.port, config.redis.host);
    newClient.select(config.redis.database);
    return newClient;
  }

  public getClient(name?): IHandyRedis {
    if (name) {
      if (this.clients[name]) {
        return this.clients[name];
      } else {
        this.clients[name] = this.createClient();
        return this.clients[name];
      }
    }
    return this.defaultClient;
  }
}

export default new Redis();
