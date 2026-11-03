require('dotenv').config()

const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const authRoutes = require('./routes/auth')
const patientRoutes = require('./routes/patients')
const appointmentRoutes = require('./routes/appointments')

const requiredEnvironment = ['MONGODB_URI', 'JWT_SECRET']
const missingEnvironment = requiredEnvironment.filter((key) => !process.env[key])
if (missingEnvironment.length) {
  throw new Error(`Missing required environment variables: ${missingEnvironment.join(', ')}`)
}

const app = express()
app.disable('x-powered-by')
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '20kb' }))
app.use(cookieParser())
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}))

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', authRoutes)
app.use('/api/patients', patientRoutes)
app.use('/api/appointments', appointmentRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  if (err.code === 11000) {
    return res.status(409).json({ message: 'A record with that email already exists.' })
  }
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ message: err.message })
  }
  return res.status(500).json({ message: 'Something went wrong. Please try again.' })
})

const port = Number(process.env.PORT || 4000)
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(port, () => console.log(`Hospital management API listening on port ${port}`))
  })
  .catch((error) => {
    console.error('Could not connect to MongoDB:', error.message)
    process.exitCode = 1
  })
