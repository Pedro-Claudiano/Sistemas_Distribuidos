function authorizeRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      console.log(`[RBAC] Access denied. User: ${req.user?.userId}, Role: ${req.user?.role}`);
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authorizeRole };
