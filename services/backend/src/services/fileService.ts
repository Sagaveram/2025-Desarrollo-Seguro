// src/services/fileService.ts
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import db from '../db';

const unlink = promisify(fs.unlink);

class FileService {
  static UPLOAD_DIR = path.resolve('uploads/profile_pictures');

  static async saveProfilePicture(
    userId: string,
    file: Express.Multer.File
  ): Promise<string> {
    //Valida que el archivo sea una imagen permitida
    const allowedExt = ['.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExt.includes(ext)) {
      throw new Error('Invalid file type');
    }

    if (!fs.existsSync(this.UPLOAD_DIR)) {
      fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
    }

    //generar un nombre seguro (UUID)
    const safeFileName = `${randomUUID()}${ext}`;
    const safePath = path.join(this.UPLOAD_DIR, safeFileName);

    //Mover el archivo desde la ubicación temporal a la carpeta segura
    fs.renameSync(file.path, safePath);

    //Obtener el usuario para eliminar foto anterior
    const user = await db('users')
      .select('picture_path')
      .where({ id: userId })
      .first();
    if (!user) throw new Error('User not found');

    if (user.picture_path) {
      try {
        const oldPath = path.resolve(user.picture_path);
        if (oldPath.startsWith(this.UPLOAD_DIR)) {
          await unlink(oldPath);
        }
      } catch {
        /* ignore */
      }
    }

    await db('users')
      .update({ picture_path: safePath })
      .where({ id: userId });

    return `${process.env.API_BASE_URL}/uploads/profile_pictures/${safeFileName}`;
  }

  static async getProfilePicture(userId: string) {
    const user = await db('users')
      .select('picture_path')
      .where({ id: userId })
      .first();
    if (!user || !user.picture_path) throw new Error('No profile picture');

    const filePath = path.resolve(user.picture_path);

    // Verificar que el archivo realmente está en el directorio seguro
    if (!filePath.startsWith(this.UPLOAD_DIR)) {
      throw new Error('Access denied');
    }

    const stream = fs.createReadStream(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === '.png' ? 'image/png' :
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
      'application/octet-stream';

    return { stream, contentType };
  }

  static async deleteProfilePicture(userId: string) {
    const user = await db('users')
      .select('picture_path')
      .where({ id: userId })
      .first();
    if (!user || !user.picture_path) throw new Error('No profile picture');

    try {
      const filePath = path.resolve(user.picture_path);
      if (filePath.startsWith(this.UPLOAD_DIR)) {
        await unlink(filePath);
      }
    } catch {
      /* ignore */
    }

    await db('users')
      .update({ picture_path: null })
      .where({ id: userId });
  }
}

export default FileService;

