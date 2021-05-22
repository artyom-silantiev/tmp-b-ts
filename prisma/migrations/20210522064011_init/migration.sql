-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GUEST', 'USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ImageLocation" AS ENUM ('LOCAL');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('SEND_EMAIL');

-- CreateEnum
CREATE TYPE "SettingColection" AS ENUM ('NONE', 'FRONT');

-- CreateEnum
CREATE TYPE "SettingType" AS ENUM ('STRING', 'INTEGER', 'DESIMAL', 'BOOL', 'TEXT');

-- CreateEnum
CREATE TYPE "PublicationType" AS ENUM ('NONE', 'NEWS', 'ARTICLE');

-- CreateTable
CREATE TABLE "User" (
    "id" BIGSERIAL NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT E'USER',
    "email" VARCHAR(255) NOT NULL,
    "emailActivatedAt" TIMESTAMP(3),
    "passwordHash" VARCHAR(72) NOT NULL,
    "firstName" VARCHAR(64) NOT NULL DEFAULT E'',
    "lastName" VARCHAR(64) NOT NULL DEFAULT E'',
    "avatarId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" BIGSERIAL NOT NULL,
    "uuid" VARCHAR(24) NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "location" "ImageLocation" NOT NULL DEFAULT E'LOCAL',
    "path" VARCHAR(255) NOT NULL,
    "meta" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" BIGSERIAL NOT NULL,
    "type" "TaskType" NOT NULL DEFAULT E'SEND_EMAIL',
    "data" JSONB NOT NULL,
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" BIGSERIAL NOT NULL,
    "collection" "SettingColection" NOT NULL DEFAULT E'NONE',
    "type" "SettingType" NOT NULL DEFAULT E'STRING',
    "name" VARCHAR(255) NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" BIGSERIAL NOT NULL,
    "type" "PublicationType" NOT NULL DEFAULT E'NONE',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "header" VARCHAR(255) NOT NULL,
    "annotation" JSONB NOT NULL,
    "content" JSONB NOT NULL,
    "publishAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Authorization" (
    "id" BIGSERIAL NOT NULL,
    "tokenUid" VARCHAR(24) NOT NULL,
    "expirationAt" TIMESTAMP(3) NOT NULL,
    "userId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User.email_unique" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Image.uuid_unique" ON "Image"("uuid");

-- CreateIndex
CREATE INDEX "Image.sha256_index" ON "Image"("sha256");

-- CreateIndex
CREATE INDEX "Setting.collection_index" ON "Setting"("collection");

-- CreateIndex
CREATE INDEX "Setting.name_index" ON "Setting"("name");

-- CreateIndex
CREATE INDEX "Publication.type_index" ON "Publication"("type");

-- CreateIndex
CREATE INDEX "Publication.isPublished_index" ON "Publication"("isPublished");

-- CreateIndex
CREATE INDEX "Publication.publishAt_index" ON "Publication"("publishAt");

-- CreateIndex
CREATE UNIQUE INDEX "Authorization.tokenUid_unique" ON "Authorization"("tokenUid");

-- AddForeignKey
ALTER TABLE "User" ADD FOREIGN KEY ("avatarId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Authorization" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
