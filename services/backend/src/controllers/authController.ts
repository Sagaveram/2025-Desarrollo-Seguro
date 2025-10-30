import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/authService';
import { User } from '../types/user';

const ping = async (req: Request, res: Response, next: NextFunction) => {
  const { username, password } = req.body;
  try {
    res.json({ "msg": "ok" });
  } catch (err) {
    next(err);
  }
};

//inicia sesion de un usuario ya registrado y activado
 //  - Valida credenciales contra la base de datos mediante AuthService
 //  - Si son correctas, genera y devuelve un JWT y los datos del usuario
const login = async (req: Request, res: Response, next: NextFunction) => {
  const { username, password } = req.body;
  try {
    const user = await AuthService.authenticate(username, password);
    const token = await AuthService.generateJwt(user.id);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
};

//Envia un correo de restablecimiento de contraseña
 //  - Busca al usuario por email
 //  - Genera un token temporal y lo asocia al usuario
 //  - Envia un email con un link para restablecer la contraseña
const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  try {
    await AuthService.sendResetPasswordEmail(email);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
};

//Permite al usuario restablecer su contraseña utilizando el token recibido por correo
const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { token, newPassword } = req.body;
  try {
    await AuthService.resetPassword(token, newPassword);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
};

//Asigna una contraseña inicial al usuario invitado
 //  - Utiliza el token de invitacion enviado por correo
const setPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { token, newPassword } = req.body;
  try {
    await AuthService.setPassword(token, newPassword);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
};

//Crea un nuevo usuario en el sistema
 //  - Inserta el registro en la base de datos
 //  - Envia un correo de invitacion con un link para activar la cuenta
const createUser = async (req: Request, res: Response, next: NextFunction) => {
  const { username, password, email, first_name, last_name } = req.body;
  try {
    const user: User = {
      username,
      password,
      email,
      first_name,
      last_name
    };
    const userDB = await AuthService.createUser(user);
    res.status(201).json(userDB);
  } catch (err) {
    next(err);
  }
};

//actualiza los datos de un usuario existente
const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.id;
  const { username, password, email, first_name, last_name } = req.body;
  try {
    const user: User = {
      id: userId,
      username,
      password,
      email,
      first_name,
      last_name
    };
    const userDB = await AuthService.updateUser(user);
    res.status(201).json(userDB);
  } catch (err) {
    next(err);
  }
};

export default {
  ping,
  login,
  forgotPassword,
  resetPassword,
  setPassword,
  createUser,
  updateUser,
};