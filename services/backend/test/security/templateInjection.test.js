/**
 * Test de seguridad - Template Injection
 * Verifica que el motor de plantillas NO ejecute código malicioso proveniente de datos de usuario.
 * Este test debe FALLAR en main porque el código es vulnerable.
 */
process.env.JWT_SECRET = 'secreto_super_seguro';

//Mock de la capa de DB para que createUser pueda ejecutar sin BD real.
//Se devuelve un objeto con metodos encadenables (where, orWhere, etc)
jest.mock('../../src/db', () => {
  return {
    __esModule: true,
    default: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockResolvedValue([]),
    }))
  };
});

//Mock de nodemailer para capturar el sendMail y no enviar correos reales.
//createTransport devuelve un objeto con sendMail mockeado que resuelve un {}
jest.mock('nodemailer', () => ({
  __esModule: true,
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({}),
  }))
}));

//Requerimos nodemailer y el servicio bajo prueba
const nodemailer = require('nodemailer');
const AuthService = require('../../src/services/authService').default;

describe('Security: Template Injection in user invite email', () => {
  beforeEach(() => {
    //Limpiamos mocks entre tests para evitar contaminacion entre casos
    jest.clearAllMocks();
    // Variables de entorno requeridas por createUser
    process.env.SMTP_HOST = 'localhost';
    process.env.SMTP_PORT = '1025';
    process.env.SMTP_USER = 'seed';
    process.env.SMTP_PASS = 'seed';
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  it('does not execute EJS tags coming from user input in the email HTML', async () => {
    // Simulamos un usuario malicioso que intenta inyectar código
    //usuario con payload malicioso en first_name
    //    - etiqueta EJS: "<%= 7*7 %>" -- si se evalua produce 49
    const maliciousFirstName = "<%= 7*7 %>";
    const user = {
      id: 'u-1',
      username: 'ti-user',
      password: 'Password123!',
      email: 'ti@example.local',
      first_name: maliciousFirstName,
      last_name: 'User',
    };

    //llamar a la funcion vulnerable que crea usuario y envia mail.
    // Debido a los mocks, no habra DB real ni SMTP real
    await AuthService.createUser(user);

    //obtener la instancia del transport mock y su sendMail
    const transport = nodemailer.createTransport();
    const sendMailMock = transport.sendMail;

    //verificamos que se llamo exactamente una vez al envio de correo
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mailArg = sendMailMock.mock.calls[0][0];
    const html = mailArg.html;

    // El HTML NO debe contener "49" (NO se ejecutó la inyección)
    expect(html).not.toContain('49');
  });
});