import express from 'express';
import { authAdmin } from '../controllers/authAdmin.js';
import { activeUser, changePassword, getAllUserInfo, getUserById, getUserProfile, login, register, requestResetPassword, updateUserProfile } from '../controllers/userCtrl.js';
import { protect } from '../middleware/protect.js';


const router = express.Router();

router
  .route('/profile')
  .get(protect,getUserProfile)
  .put(protect, updateUserProfile);

  router.get('all_info',protect,authAdmin, getAllUserInfo)
 
router.post('/register', register);
router.post('/active', activeUser);
router.post('/login', login);
router.post('/forget-password', requestResetPassword);
router.post('/change-password', changePassword);
router.get('/:id', getUserById);
export default router;
