import {MigrationInterface, QueryRunner} from "typeorm";

export class Initial1589348982811 implements MigrationInterface {
    name = 'Initial1589348982811'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "seeds" ("id" BIGSERIAL NOT NULL, "name" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3ac799e4ece18bc838823bb6a4b" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TYPE "images_image_location_enum" AS ENUM('local')`, undefined);
        await queryRunner.query(`CREATE TABLE "images" ("id" BIGSERIAL NOT NULL, "uuid" character varying(24) NOT NULL, "sha256HashHex" character varying(64) NOT NULL, "location" "images_image_location_enum" NOT NULL DEFAULT 'local', "path" character varying NOT NULL, "meta" jsonb NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1fe148074c6a1a91b63cb9ee3c9" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TYPE "news_news_status_enum" AS ENUM('draft', 'publish')`, undefined);
        await queryRunner.query(`CREATE TABLE "news" ("id" BIGSERIAL NOT NULL, "status" "news_news_status_enum" NOT NULL DEFAULT 'draft', "header" character varying NOT NULL, "annotation" character varying NOT NULL, "content" character varying NOT NULL, "publishAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_39a43dfcb6007180f04aff2357e" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_378f75b661b3564e1543256106" ON "news" ("status") `, undefined);
        await queryRunner.query(`CREATE TABLE "pages" ("id" BIGSERIAL NOT NULL, "name" character varying NOT NULL, "data" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_fd04e631bf857b757e33711e5be" UNIQUE ("name"), CONSTRAINT "PK_8f21ed625aa34c8391d636b7d3b" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TYPE "tasks_task_type_enum" AS ENUM('send_email')`, undefined);
        await queryRunner.query(`CREATE TABLE "tasks" ("id" BIGSERIAL NOT NULL, "type" "tasks_task_type_enum" NOT NULL DEFAULT 'send_email', "data" jsonb NOT NULL, "attempts" smallint NOT NULL DEFAULT 0, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TYPE "settings_setting_colection_enum" AS ENUM('none', 'front')`, undefined);
        await queryRunner.query(`CREATE TYPE "settings_setting_type_enum" AS ENUM('string', 'integer', 'decimal', 'bool', 'text')`, undefined);
        await queryRunner.query(`CREATE TABLE "settings" ("id" BIGSERIAL NOT NULL, "collection" "settings_setting_colection_enum" NOT NULL DEFAULT 'none', "name" character varying NOT NULL, "type" "settings_setting_type_enum" NOT NULL DEFAULT 'string', "value" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_ca7857276d2a30f4dcfa0e42cd4" UNIQUE ("name"), CONSTRAINT "PK_0669fe20e252eb692bf4d344975" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_b99ecb7dd618e87685bdde6940" ON "settings" ("type") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_aa47aa76b577622e10484c8a62" ON "settings" ("collection") `, undefined);
        await queryRunner.query(`CREATE TYPE "users_user_role_enum" AS ENUM('guest', 'user', 'admin')`, undefined);
        await queryRunner.query(`CREATE TABLE "users" ("id" BIGSERIAL NOT NULL, "role" "users_user_role_enum" NOT NULL, "email" character varying NOT NULL, "emailActivatedAt" TIMESTAMP, "passwordHash" character varying NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "avatar" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TABLE "authorizations" ("id" BIGSERIAL NOT NULL, "token" character varying NOT NULL, "userId" bigint NOT NULL, "expirationAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_50014e0960d3e640c94cd59effa" UNIQUE ("token"), CONSTRAINT "PK_03e79e63bef1d024d38b8556b8c" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_52595cd007797520431a676d59" ON "authorizations" ("expirationAt") `, undefined);
        await queryRunner.query(`ALTER TABLE "authorizations" ADD CONSTRAINT "FK_9521f176e4291f940caf9daa70b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "authorizations" DROP CONSTRAINT "FK_9521f176e4291f940caf9daa70b"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_52595cd007797520431a676d59"`, undefined);
        await queryRunner.query(`DROP TABLE "authorizations"`, undefined);
        await queryRunner.query(`DROP TABLE "users"`, undefined);
        await queryRunner.query(`DROP TYPE "users_user_role_enum"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_aa47aa76b577622e10484c8a62"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_b99ecb7dd618e87685bdde6940"`, undefined);
        await queryRunner.query(`DROP TABLE "settings"`, undefined);
        await queryRunner.query(`DROP TYPE "settings_setting_type_enum"`, undefined);
        await queryRunner.query(`DROP TYPE "settings_setting_colection_enum"`, undefined);
        await queryRunner.query(`DROP TABLE "tasks"`, undefined);
        await queryRunner.query(`DROP TYPE "tasks_task_type_enum"`, undefined);
        await queryRunner.query(`DROP TABLE "pages"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_378f75b661b3564e1543256106"`, undefined);
        await queryRunner.query(`DROP TABLE "news"`, undefined);
        await queryRunner.query(`DROP TYPE "news_news_status_enum"`, undefined);
        await queryRunner.query(`DROP TABLE "images"`, undefined);
        await queryRunner.query(`DROP TYPE "images_image_location_enum"`, undefined);
        await queryRunner.query(`DROP TABLE "seeds"`, undefined);
    }

}
