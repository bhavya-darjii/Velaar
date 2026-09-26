import express from 'express';
import { 
  getAdminSummary, 
  getAdminLogs, 
  inviteUser, 
  updateUser, 
  claimInvite, 
  getAdminUsers 
} from '../controllers/adminController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication
router.use(requireAuth);

router.get('/summary',      getAdminSummary);
router.get('/logs',         getAdminLogs);
router.post('/invite-user', inviteUser);
router.patch('/user/:id',   updateUser);
router.post('/claim-invite', claimInvite);
router.get('/users',        getAdminUsers);

export default router;
