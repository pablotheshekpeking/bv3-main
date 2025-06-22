import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  becomeVendor, 
  addBankAccount, 
  getBankAccounts, 
  deleteBankAccount,
  setDefaultBankAccount 
} from '../controllers/vendorController.js';

const router = express.Router();

router.post('/become-vendor', authenticateToken, becomeVendor);
router.post('/bank-accounts', authenticateToken, addBankAccount);
router.get('/bank-accounts', authenticateToken, getBankAccounts);
router.delete('/bank-accounts/:accountId', authenticateToken, deleteBankAccount);
router.patch('/bank-accounts/:accountId/set-default', authenticateToken, setDefaultBankAccount);

export default router; 