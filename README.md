# Description

Project Template (Backend)

Backend technologies:
+ nodejs
+ typescript
+ TypeORM
+ Custom Libs


# first deploy
```sh
cd <project_root>

npm i
cp env.server.default.ts env.server.ts
cp ormconfig.default.json ormconfig.json
docker-compose up -d
npm run db_migration
npm run db_seeder
```

# start backend for dev
```sh
cd <project_root>
docker-compose up -d
npm run server
```

# generate migration
```sh
npx ts-node -r tsconfig-paths/register node_modules/.bin/typeorm migration:generate -n Initial
```

# recreate postgres public schema, only for dev
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
COMMENT ON SCHEMA public IS 'standard public schema';
```
