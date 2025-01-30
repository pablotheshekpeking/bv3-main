import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import { Database, Resource, getModelByName } from '@adminjs/prisma';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
AdminJS.registerAdapter({ Database, Resource });

const adminOptions = {
  resources: [
    {
      resource: { model: getModelByName('User'), client: prisma },
      options: {
        navigation: { name: 'Users & Access' },
        properties: {
          password: { isVisible: false },
          profileImage: { isVisible: true }
        }
      }
    },
    {
      resource: { model: getModelByName('Listing'), client: prisma },
      options: {
        navigation: { name: 'Marketplace' },
        properties: {
          description: { type: 'richtext' },
          features: { type: 'mixed' },
          location: { type: 'mixed' }
        }
      }
    },
    {
      resource: { model: getModelByName('Image'), client: prisma },
      options: {
        navigation: { name: 'Marketplace' },
        properties: {
          url: {
            isTitle: true,
          },
          isPrimary: {
            isVisible: { list: true, filter: true, show: true, edit: true }
          },
          listingId: {
            isVisible: { list: true, filter: true, show: true, edit: true }
          }
        }
      }
    },
    {
      resource: { model: getModelByName('Category'), client: prisma },
      options: {
        navigation: { name: 'Marketplace' },
        properties: {
          slug: { isVisible: false },
          parentId: {
            type: 'reference',
            reference: 'Category'
          }
        }
      }
    },
    {
      resource: { model: getModelByName('Offer'), client: prisma },
      options: {
        navigation: { name: 'Transactions' },
        properties: {
          price: { type: 'currency' }
        }
      }
    },
    {
      resource: { model: getModelByName('Verification'), client: prisma },
      options: {
        navigation: { name: 'Users & Access' },
        properties: {
          data: {
            components: {
              show: 'DocumentShow'
            }
          }
        }
      }
    },
    {
      resource: { model: getModelByName('Review'), client: prisma },
      options: {
        navigation: { name: 'Marketplace' }
      }
    }
  ]
};

const admin = new AdminJS(adminOptions);
const adminRouter = AdminJSExpress.buildRouter(admin);

export { admin as adminJs, adminRouter };