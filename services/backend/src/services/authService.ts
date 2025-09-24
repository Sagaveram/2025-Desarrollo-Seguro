
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import db from '../db';
import { User,UserRow } from '../types/user';
import jwtUtils from '../utils/jwt';
import ejs from 'ejs';
import bcrypt from 'bcrypt';

const RESET_TTL = 1000 * 60 * 60;         // 1h
const INVITE_TTL = 1000 * 60 * 60 * 24 * 7; // 7d
const SALT_ROUNDS = 12;

class AuthService {
  static async createUser(user: User) {
    const existing = await db<UserRow>('users')
      .where({ username: user.username })
      .orWhere({ email: user.email })
      .first();
    if (existing) throw new Error('User already exists');

    // 🔒 Hashear la contraseña antes de guardarla
    const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

    const invite_token = crypto.randomBytes(6).toString('hex');
    const invite_token_expires = new Date(Date.now() + INVITE_TTL);
    await db<UserRow>('users').insert({
      username: user.username,
      password: hashedPassword,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      invite_token,
      invite_token_expires,
      activated: false
    });

    // ... (envío de correo con plantilla mitigada)
  }

  static async authenticate(username: string, password: string) {
    const user = await db<UserRow>('users')
      .where({ username })
      .andWhere('activated', true)
      .first();
    if (!user) throw new Error('Invalid email or not activated');

    // 🔒 Comparar usando bcrypt
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) throw new Error('Invalid password');

    return user;
  }

  static async resetPassword(token: string, newPassword: string) {
    const row = await db<UserRow>('users')
      .where('reset_password_token', token)
      .andWhere('reset_password_expires', '>', new Date())
      .first();
    if (!row) throw new Error('Invalid or expired reset token');

    // 🔒 Hash de nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await db('users')
      .where({ id: row.id })
      .update({
        password: hashedPassword,
        reset_password_token: null,
        reset_password_expires: null
      });
  }

  static async setPassword(token: string, newPassword: string) {
    const row = await db<UserRow>('users')
      .where('invite_token', token)
      .andWhere('invite_token_expires', '>', new Date())
      .first();
    if (!row) throw new Error('Invalid or expired invite token');

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await db('users')
      .update({
        password: hashedPassword,
        invite_token: null,
        invite_token_expires: null
      })
      .where({ id: row.id });
  }
}

export default AuthService;
