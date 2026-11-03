const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { z } = require('zod')
const User = require('../models/User')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72).refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 72,
    'Password must be 72 bytes or fewer.',
  ),
})
const signupSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(80),
})

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}

function setSessionCookie(res, user) {
  const token = jwt.sign({}, process.env.JWT_SECRET, {
    subject: user.id,
    expiresIn: '7d',
  })
  res.cookie('hms_session', token, cookieOptions)
}

router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message })
  }

  const { name, email, password } = parsed.data
  const existingUser = await User.findOne({ email: email.toLowerCase() })
  if (existingUser) {
    return res.status(409).json({ message: 'An account with this email already exists.' })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await User.create({ name, email, passwordHash })
  setSessionCookie(res, user)
  return res.status(201).json({ user: { id: user.id, name: user.name, email: user.email } })
})

router.post('/login', async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message })
  }

  const { email, password } = parsed.data
  const user = await User.findOne({ email: email.toLowerCase() })
  const passwordMatches = user && (await bcrypt.compare(password, user.passwordHash))
  if (!passwordMatches) {
    return res.status(401).json({ message: 'Email or password is incorrect.' })
  }

  setSessionCookie(res, user)
  return res.json({ user: { id: user.id, name: user.name, email: user.email } })
})

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).select('name email')
  if (!user) {
    return res.status(401).json({ message: 'Your account could not be found. Please sign in again.' })
  }
  return res.json({ user: { id: user.id, name: user.name, email: user.email } })
})

router.post('/logout', (_req, res) => {
  res.clearCookie('hms_session', { ...cookieOptions, maxAge: undefined })
  return res.json({ message: 'Signed out.' })
})

module.exports = router
