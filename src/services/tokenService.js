// In-memory token blacklist (consider using Redis in production)
const tokenBlacklist = new Set();

export const addToBlacklist = (token) => {
  tokenBlacklist.add(token);
};

export const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

export const clearBlacklist = () => {
  tokenBlacklist.clear();
}; 