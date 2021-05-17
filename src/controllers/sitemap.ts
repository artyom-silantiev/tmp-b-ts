import * as express from 'express';
import * as sitemap from 'sitemap';
import { createGzip } from 'zlib';
import * as moment from 'moment';

const dtmRangeMonthly = 1000 * 60 * 60 * 24 * 7;
const dtmRangeWeekly = 1000 * 60 * 60 * 24 * 1;

let sitemapCache;
let lastCacheSave = 0;
const cacheTTL = 1000 * 60 * 60; // 1 hour

/**
 * @method get
 * @scheme /sitemap.xml
 **/
export async function getSiteMapXml (req: express.Request, res: express.Response) {
  res.header('Content-Type', 'application/xml');
  res.header('Content-Encoding', 'gzip');

  if (sitemapCache && (Date.now() - lastCacheSave) < cacheTTL) {
    res.send(sitemapCache)
    return;
  }

  const smStream = new sitemap.SitemapStream({ hostname: 'https://example.com/' });
  const pipeline = smStream.pipe(createGzip());

  smStream.write({ url: '/', changefreq: 'daily', priority: 0.5 });

  sitemap.streamToPromise(pipeline).then(sm => sitemapCache = sm);
  smStream.end();
  lastCacheSave = Date.now();

  pipeline.pipe(res).on('error', (e) => {throw e});
}
