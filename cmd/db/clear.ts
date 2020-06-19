import * as db from '../../db';
import { MoreThanOrEqual } from 'typeorm';

export default async function (argv) {
  await db.init();

  const countAuthorizationDeleted = await db.models.Authorization.getRepository().delete(
    {
      expirationAt: MoreThanOrEqual(new Date()),
    }
  );

  console.log(`${countAuthorizationDeleted.affected} authorizations clear`);
}
