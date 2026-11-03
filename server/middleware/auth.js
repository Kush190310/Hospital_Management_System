const jwt = require('jsonwebtoken')

function requireAuth(req, res, next) {
  const token = req.cookies.hms_session
  if (!token) {
    return res.status(401).json({ message: 'Please sign in to continue.' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = payload.sub
    return next()
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' })
  }
}

module.exports = { requireAuth }
