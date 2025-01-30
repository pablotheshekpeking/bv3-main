import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware to validate image URLs
export const validateImageUrl = (req, res, next) => {
  try {
    // For profile image
    if (req.body.profileImage) {
      const url = new URL(req.body.profileImage);
      if (!url.href.match(/\.(jpg|jpeg|png|webp|avif|gif)$/i)) {
        return res.status(400).json({ message: 'Invalid image URL format' });
      }
    }

    // For listing images
    if (req.body.images && Array.isArray(req.body.images)) {
      for (const imageUrl of req.body.images) {
        const url = new URL(imageUrl);
        if (!url.href.match(/\.(jpg|jpeg|png|webp|avif|gif)$/i)) {
          return res.status(400).json({ message: 'Invalid image URL format' });
        }
      }
    }

    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid URL format' });
  }
}; 