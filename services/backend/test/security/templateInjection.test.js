/**
 * Test de seguridad - Template Injection
 * Verifica que el motor de plantillas NO ejecute código malicioso proveniente de datos de usuario.
 * Este test debe FALLAR en main porque el código es vulnerable.
 */
process.env.JWT_SECRET = 'secreto_super_seguro';

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

jest.mock('nodemailer', () => ({
  __esModule: true,
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({}),
  }))
}));

const nodemailer = require('nodemailer');
const AuthService = require('../../src/services/authService').default;

describe('Security: Template Injection in user invite email', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SMTP_HOST = 'localhost';
    process.env.SMTP_PORT = '1025';
    process.env.SMTP_USER = 'seed';
    process.env.SMTP_PASS = 'seed';
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  it('does not execute EJS tags coming from user input in the email HTML', async () => {
    // Simulamos un usuario malicioso que intenta inyectar código
    const maliciousFirstName = "<%= 7*7 %>";
    const user = {
      id: 'u-1',
      username: 'ti-user',
      password: 'Password123!',
      email: 'ti@example.local',
      first_name: maliciousFirstName,
      last_name: 'User',
    };

    await AuthService.createUser(user);

    const transport = nodemailer.createTransport();
    const sendMailMock = transport.sendMail;

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mailArg = sendMailMock.mock.calls[0][0];
    const html = mailArg.html;

    // El HTML NO debe contener "49" (NO se ejecutó la inyección)
    expect(html).not.toContain('49');
  });
});