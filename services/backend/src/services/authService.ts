import crypto from 'crypto';
import nodemailer from 'nodemailer';
import db from '../db';
import { User, UserRow } from '../types/user';
import jwtUtils from '../utils/jwt';
import ejs from 'ejs';

// Constantes de tiempo para tokens
// RESET_TTL  -> token de reseteo de contraseña
// INVITE_TTL -> token de invitación 
const RESET_TTL = 1000 * 60 * 60;
const INVITE_TTL = 1000 * 60 * 60 * 24 * 7;

class AuthService {
  /**
   * Crea un usuario y envía el mail de invitación. 
   * Vulnerabilidad:
   *    - En el cuerpo del correo HTML, se interpolan directamente 
   *      valores del usuario sin sanitizacion
   *    - Esto permite una potencial Template Injection si un atacante
   *      logra inyectar codigo o expresiones en los campos del usuario
   */
  static async createUser(user: User) {
    const existing = await db<UserRow>('users')
      .where({ username: user.username })
      .orWhere({ email: user.email })
      .first();
    if (existing) throw new Error('User already exists with that username or email');
    const invite_token = crypto.randomBytes(6).toString('hex');
    const invite_token_expires = new Date(Date.now() + INVITE_TTL);
    await db<UserRow>('users')
      .insert({
        username: user.username,
        password: user.password,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        invite_token,
        invite_token_expires,
        activated: false
      });

    // VULNERABLE: inserta datos de usuario directo en HTML (template injection posible)
    // Configurar el transporte de correo (SMTP)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const link = `${process.env.FRONTEND_URL}/activate-user?token=${invite_token}&username=${user.username}`;
    // OJO: Esto ejecuta código EJS si viene en el dato
    // Generar el HTML del correo
    // Vulnerable: se interpolan directamente datos de usuario.
    // Si el atacante introduce expresiones como {{7*7}} o <%= %>, 
    // podrian ejecutarse si el motor de templates las interpreta
    const htmlBody = `
      <html>
        <body>
          <h1>Hello ${user.first_name} ${user.last_name}</h1>
          <p>Click <a href="${link}">here</a> to activate your account.</p>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: "info@example.com",
      to: user.email,
      subject: 'Activate your account',
      html: htmlBody
    });
  }

  /**
   * Autentica a un usuario activo mediante usuario y contraseña.
   *  - Incluye logs de depuracion para validar parametros y estado
   */
  static async updateUser(user: User) {
    const existing = await db<UserRow>('users')
      .where({ id: user.id })
      .first();
    if (!existing) throw new Error('User not found');
    await db<UserRow>('users')
      .where({ id: user.id })
      .update({
        username: user.username,
        password: user.password,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      });
    return existing;
  }

  static async authenticate(username: string, password: string) {
    const user = await db<UserRow>('users')
      .where({ username })
      .andWhere('activated', true)
      .first();

    // Log de diagnostico 
    console.log('[DEBUG auth]', {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_NAME: process.env.DB_NAME,
      username,
      found: !!user,
      activated: user?.activated,
      storedPwd: user?.password,
      providedPwd: password
    });

    if (!user) throw new Error('Invalid email or not activated');
    if (password != user.password) throw new Error('Invalid password');
    return user;
  }

  //Envia un correo para restablecer contraseña a un usuario activo
  static async sendResetPasswordEmail(email: string) {
    const user = await db<UserRow>('users')
      .where({ email })
      .andWhere('activated', true)
      .first();
    if (!user) throw new Error('No user with that email or not activated');

    const token = crypto.randomBytes(6).toString('hex');
    const expires = new Date(Date.now() + RESET_TTL);

    //Actualiza el token de reset en la base de datos
    await db('users')
      .where({ id: user.id })
      .update({
        reset_password_token: token,
        reset_password_expires: expires
      });

    //Configura transporte SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    //Construye link de reseteo
    const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    //Envia el correo con el enlace
    await transporter.sendMail({
      to: user.email,
      subject: 'Your password reset link',
      html: `Click <a href="${link}">here</a> to reset your password.`
    });
  }

  //Restablece la contraseña del usuario, validando token y expiracion
  static async resetPassword(token: string, newPassword: string) {
    const row = await db<UserRow>('users')
      .where('reset_password_token', token)
      .andWhere('reset_password_expires', '>', new Date())
      .first();
    if (!row) throw new Error('Invalid or expired reset token');

    await db('users')
      .where({ id: row.id })
      .update({
        password: newPassword,
        reset_password_token: null,
        reset_password_expires: null
      });
  }

  //Asigna una contraseña a un usuario invitado, validando token de invitacion
  static async setPassword(token: string, newPassword: string) {
    const row = await db<UserRow>('users')
      .where('invite_token', token)
      .andWhere('invite_token_expires', '>', new Date())
      .first();
    if (!row) throw new Error('Invalid or expired invite token');

    await db('users')
      .update({
        password: newPassword,
        invite_token: null,
        invite_token_expires: null
      })
      .where({ id: row.id });
  }

  //Genera un JWT para un usuario autenticado
  static generateJwt(userId: string): string {
    return jwtUtils.generateToken(userId);
  }
}

export default AuthService;