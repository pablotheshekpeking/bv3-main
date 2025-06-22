import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import { Database, Resource, getModelByName } from '@adminjs/prisma';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import slugify from 'slugify';

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
          profileImage: { isVisible: true },
          points: { isVisible: { list: true, filter: true, show: true, edit: true } }
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
      resource: { model: getModelByName('Booking'), client: prisma },
      options: {
        navigation: { name: 'Bookings' },
        properties: {
          status: { isVisible: { list: true, filter: true, show: true, edit: true } },
          totalPrice: { isVisible: { list: true, filter: true, show: true, edit: true } },
          serviceFee: { isVisible: { list: true, filter: true, show: true, edit: true } },
          basePrice: { isVisible: { list: true, filter: true, show: true, edit: true } }
        }
      }
    },
    {
      resource: { model: getModelByName('ApartmentAvailability'), client: prisma },
      options: {
        navigation: { name: 'Marketplace' },
        properties: {
          startDate: { isVisible: { list: true, filter: true, show: true, edit: true } },
          endDate: { isVisible: { list: true, filter: true, show: true, edit: true } },
          pricePerNight: { isVisible: { list: true, filter: true, show: true, edit: true } }
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
        },
        actions: {
          new: {
            before: async (request) => {
              if (request.payload.name) {
                request.payload.slug = slugify(request.payload.name, { lower: true });
              }
              return request;
            }
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
    },
    {
      resource: { model: getModelByName('Payment'), client: prisma },
      options: {
        navigation: { name: 'Payments' },
        properties: {
          status: { isVisible: { list: true, filter: true, show: true, edit: true } },
          amount: { isVisible: { list: true, filter: true, show: true, edit: true } },
          reference: { isVisible: { list: true, filter: true, show: true, edit: false } },
          metadata: { type: 'mixed', isVisible: { list: false, filter: false, show: true, edit: false } }
        }
      }
    },
    {
      resource: { model: getModelByName('VendorBankAccount'), client: prisma },
      options: {
        navigation: { name: 'VendorBankAccount' },
        properties: {
          accountNumber: { isVisible: { list: true, filter: true, show: true, edit: true } },
          accountName: { isVisible: { list: true, filter: true, show: true, edit: true } },
          bankName: { isVisible: { list: true, filter: true, show: true, edit: true } },
          bankCode: { isVisible: { list: true, filter: true, show: true, edit: true } }
        }
      }
    }
  ],
  branding: {
    companyName: 'Your Company Name',
    logo: 'https://yourcompany.com/logo.png',
    softwareBrothers: false
  }
};

const adminJs = new AdminJS(adminOptions);
const adminRouter = AdminJSExpress.buildRouter(adminJs);

export { adminJs, adminRouter };