import * as bcrypt from 'bcrypt';
import env from '@/env';

export async function generatePasswordHash(passwordText: string, passwordSalt?: string) {
  passwordSalt = passwordSalt || env.PASSWORD_SALT;
  passwordText += passwordSalt;
  return await bcrypt.hash(passwordText, 8);
}

export async function compare(
  passwordText: string,
  passwordHash: string,
  passwordSalt?: string
) {
  passwordSalt = passwordSalt || env.PASSWORD_SALT;
  passwordText += passwordSalt;
  return bcrypt.compare(passwordText, passwordHash);
}
