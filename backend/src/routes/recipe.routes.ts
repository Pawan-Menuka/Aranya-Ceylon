import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { listRecipes, getRecipeBySlug } from '../controllers/recipe.controller.js';

const router = Router();

router.get('/', asyncHandler(listRecipes));
router.get('/:slug', asyncHandler(getRecipeBySlug));

export default router;
