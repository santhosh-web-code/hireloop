import jwt from 'jsonwebtoken';

/**
 * Express middleware to verify JWT token and protect routes.
 * Expects header format: Authorization: Bearer <token>
 */
export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach decoded properties (id and role) to req.user
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };
    
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(401).json({ message: 'Not authorized, token invalid or expired' });
  }
};

/**
 * Role-based authorization middleware generator.
 * Checks if the user's role is permitted to access the resource.
 * 
 * @param {...string} roles - Array of permitted roles (e.g. 'student', 'hr', 'tpo')
 */
export const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied for this role' });
    }
    next();
  };
};
