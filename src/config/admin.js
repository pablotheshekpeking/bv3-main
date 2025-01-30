import { User } from '../models/index.js';
import bcrypt from 'bcryptjs';

export default {
  auth: {
    authenticate: async (email, password) => {
      const user = await User.findOne({ where: { email, role: 'admin' } });
      if (!user) return false;

      const matched = await bcrypt.compare(password, user.password);
      if (!matched) return false;

      return user;
    },
    cookiePassword: process.env.ADMIN_COOKIE_SECRET || 'some-secret-password-used-to-secure-cookie',
  },
  sessionOptions: {
    resave: false,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET || 'some-secret-key',
  },
}; 