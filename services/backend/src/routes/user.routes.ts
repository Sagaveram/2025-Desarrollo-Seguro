import { Router } from 'express';
import routes from '../controllers/authController';
import authenticateJWT from '../middleware/authenticateJWT';

const router = Router();

// MITIGACIÓN: proteger rutas sensibles con autenticación
// Registro de usuario sigue siendo público (no requiere autenticación)
router.post('/', routes.createUser);

// Actualización de usuario protegida con JWT
router.put('/:id', authenticateJWT, routes.updateUser);

// Si en el futuro agregas rutas de perfil, también deben ir protegidas:
// router.get('/:id/picture', authenticateJWT, routes.getUser);
// router.post('/:id/picture', authenticateJWT, routes.getUser);
// router.delete('/:id/picture', authenticateJWT, routes.getUser);

export default router;
