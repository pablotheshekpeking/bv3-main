import express from 'express';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import * as categoryController from '../controllers/categoryController.js';

const router = express.Router();

// Public routes
router.get('/', categoryController.getCategories);

// Admin routes
router.use(authenticateToken, isAdmin);
router.post('/', categoryController.createCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

export default router; 