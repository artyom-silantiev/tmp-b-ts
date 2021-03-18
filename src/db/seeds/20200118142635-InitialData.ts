// seed file: 20200118142635-InitialData.ts

import * as db from '@/db';

export async function up() {
  await db.models.User.getRepository().createUser(
    'admin@example.com',
    'password',
    {
      params: {
        role: db.models.User.UserRole.Admin,
        firstName: 'Admin',
        lastName: 'Power',
        emailActivatedAt: new Date(),
      },
    }
  );
  await db.models.Setting.getRepository().insert({
    name: db.models.Setting.Settings.userRegistrationDisabled,
    collection: db.models.Setting.SettingColection.Front,
    type: db.models.Setting.SettingType.Bool,
    value: '0',
  });
}
