import express from 'express';
import { activeUser, changePassword, login, register, requestResetPassword } from '../controllers/userCtrl.js';

const router = express.Router();

router.post('/register', register);
router.post('/active', activeUser);
router.post('/forget-password', requestResetPassword);
router.post('/change-password', changePassword);
router.post('/login', login);
export default router;
