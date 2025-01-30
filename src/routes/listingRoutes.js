import express from 'express';
import { authenticateToken, isAdmin, isModerator } from '../middleware/auth.js';
import { 
    createListing,
    getAllListings,
    getListing,
    updateListing,
    deleteListing,
    getMyListings,
    searchListings,
    uploadListingImages,
    createListingWithImages
} from '../controllers/listingController.js';
import multer from 'multer';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Public routes
router.get('/', getAllListings);
router.get('/search', searchListings);
router.get('/:id', getListing);

// Protected routes
router.use(authenticateToken); // Apply authentication to all routes below

router.post('/', authenticateToken, createListing);
router.get('/user/me', getMyListings);
router.post('/:id/images', uploadListingImages);
router.put('/:id', updateListing);
router.delete('/:id', deleteListing);

// Admin/Moderator routes
router.use('/:id/approve', isModerator, (req, res) => {
    // Approve listing implementation
});

router.use('/:id/feature', isAdmin, (req, res) => {
    // Feature listing implementation
});

router.post('/with-images', 
  authenticateToken, 
  upload.array('images', 5), // Max 5 images
  createListingWithImages
);

export default router; 