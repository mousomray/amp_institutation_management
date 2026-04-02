const jwt = require('jsonwebtoken'); // For Token
const bcrypt = require('bcryptjs'); // For Password Hashing
const AdminModel = require('../model/admin'); // User Model

// Compare password function
const comparePassword = (password, hashPassword) => {
  return bcrypt.compareSync(password, hashPassword);
};

// Fit token in API header - Works across all microservices
const Auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("auth header", authHeader);
   
    // Support multiple token sources from different services
    const token =
      (authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null) ||
      req.cookies?.["admin-token"] ||
      req.cookies?.["institution-token"] ||
      req.cookies?.["student-token"] ||
      req.cookies?.["user-token"] ||
      req.cookies?.token ||
      req.header('x-auth-token');

    console.log("token, ", token);

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: "Unauthorized request - No token provided" 
      });
    }

    console.log('==>', token);

    // Verify token signature - works for tokens from any microservice
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    // Attach user info from token payload (no DB lookup needed)
    req.user = {
      id: decoded.userId || decoded.id || decoded._id,
      role: decoded.role,
      email: decoded.email,
      serviceType: decoded.serviceType, // admin, institution, student, etc.
      ...decoded // Include any other fields from token
    };
    req.userRole = decoded.role;

    // Token is valid, proceed to next middleware
    next();
  } catch (error) {
    console.error("JWT error:", error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: "Token expired" 
      });
    }
    
    return res.status(401).json({ 
      success: false,
      message: "Invalid or expired token" 
    });
  }
};

// Optional: Auth with database validation (use only when necessary)
const AuthWithDB = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    const token =
      (authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null) ||
      req.cookies?.["admin-token"] ||
      req.cookies?.["institution-token"] ||
      req.cookies?.["student-token"] ||
      req.cookies?.["user-token"] ||
      req.cookies?.token;

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: "Unauthorized request" 
      });
    }

    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    // Only validate against DB if user exists in this service's database
    const user = await AdminModel.findById(decoded.userId).select("-password");

    if (!user) {
      // If not in AdminModel, still allow access with token data
      req.user = {
        id: decoded.userId || decoded.id,
        role: decoded.role,
        email: decoded.email,
        serviceType: decoded.serviceType,
        fromToken: true // Flag to indicate user is from token only
      };
      req.userRole = decoded.role;
    } else {
      // User found in database
      req.user = user;
      req.userRole = user.role;
    }

    next();
  } catch (error) {
    console.error("JWT error:", error.message);
    return res.status(401).json({ 
      success: false,
      message: "Invalid or expired token" 
    });
  }
};

// Role-based authorization middleware
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No user found'
      });
    }

    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - Insufficient permissions'
      });
    }

    next();
  };
};

module.exports = { comparePassword, Auth, AuthWithDB, authorize };