const express = require('express')
const mongoose = require('mongoose')
const { z } = require('zod')
const Appointment = require('../models/Appointment')
const Patient = require('../models/Patient')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

const patientSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.union([z.string().trim().email().max(254), z.literal('')]).optional(),
  phone: z.string().trim().min(5).max(30),
  dateOfBirth: z.coerce.date().max(new Date(), 'Date of birth cannot be in the future.'),
  gender: z.enum(['Female', 'Male', 'Non-binary', 'Other']),
  bloodGroup: z.enum(['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  address: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
})

router.get('/', async (req, res) => {
  const search = String(req.query.search || '').trim().slice(0, 100)
  const filter = { createdBy: req.userId }
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.$or = [
      { name: { $regex: escapedSearch, $options: 'i' } },
      { email: { $regex: escapedSearch, $options: 'i' } },
      { phone: { $regex: escapedSearch, $options: 'i' } },
    ]
  }
  const patients = await Patient.find(filter).sort({ createdAt: -1 }).limit(250)
  return res.json({ patients })
})

router.post('/', async (req, res) => {
  const parsed = patientSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message })
  }
  const patient = await Patient.create({ ...parsed.data, createdBy: req.userId })
  return res.status(201).json({ patient })
})

router.patch('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid patient ID.' })
  }
  const parsed = patientSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message })
  }
  const patient = await Patient.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.userId },
    parsed.data,
    { new: true, runValidators: true },
  )
  if (!patient) {
    return res.status(404).json({ message: 'Patient not found.' })
  }
  return res.json({ patient })
})

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid patient ID.' })
  }
  const patient = await Patient.findOne({ _id: req.params.id, createdBy: req.userId })
  if (!patient) {
    return res.status(404).json({ message: 'Patient not found.' })
  }
  const appointmentCount = await Appointment.countDocuments({
    patient: patient._id,
    createdBy: req.userId,
  })
  if (appointmentCount > 0) {
    return res.status(409).json({
      message: 'This patient has appointments. Remove or reassign those appointments first.',
    })
  }
  await patient.deleteOne()
  return res.json({ message: 'Patient deleted.' })
})

module.exports = router
