import { Router } from 'express';
import * as blogController from '../controllers/blog.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(blogController.listBlogs));
router.get('/recent', asyncHandler(blogController.getRecentBlogs));
router.get('/:slug', asyncHandler(blogController.getBlog));

export default router;