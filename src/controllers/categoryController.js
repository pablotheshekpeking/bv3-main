import { PrismaClient } from '@prisma/client';
import { APIError, NotFoundError } from '../utils/errors.js';
import slugify from 'slugify';

const prisma = new PrismaClient();

export const createCategory = async (req, res, next) => {
  try {
    const { name, description, parentId, image } = req.body;
    
    const category = await prisma.category.create({
      data: {
        name,
        slug: slugify(name, { lower: true }),
        description,
        parentId,
        image
      }
    });

    res.status(201).json({
      status: 'success',
      category
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, parentId, image, active } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug: name ? slugify(name, { lower: true }) : undefined,
        description,
        parentId,
        image,
        active
      }
    });

    res.json({
      status: 'success',
      category
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if category has listings
    const hasListings = await prisma.listing.findFirst({
      where: { categoryId: id }
    });

    if (hasListings) {
      throw new APIError('Cannot delete category with existing listings', 400);
    }

    await prisma.category.delete({
      where: { id }
    });

    res.json({
      status: 'success',
      message: 'Category deleted'
    });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    const where = includeInactive ? {} : { active: true };

    const categories = await prisma.category.findMany({
      where,
      include: {
        children: {
          where,
          select: {
            id: true,
            name: true,
            slug: true,
            image: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      categories
    });
  } catch (error) {
    next(error);
  }
}; 