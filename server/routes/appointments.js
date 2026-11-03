const express = require('express')
const mongoose = require('mongoose')
const { z } = require('zod')
const Appointment = require('../models/Appointment')
const Patient = require('../models/Patient')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

const appointmentSchema = z.object({
  patient: z.string().refine(mongoose.isValidObjectId, 'Choose a valid patient.'),
  doctor: z.string().trim().min(2).max(100),
  department: z.string().trim().min(2).max(80),
  date: z.coerce.date(),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Choose a valid appointment time.'),
  status: z.enum(['Scheduled', 'Checked in', 'Completed', 'Cancelled']).optional(),
  reason: z.string().trim().max(300).optional(),
})

router.get('/', async (req, res) => {
  const dateFilter = {}
  if (req.query.from || req.query.to) {
    dateFilter.date = {}
    if (req.query.from) dateFilter.date.$gte = new Date(String(req.query.from))
    if (req.query.to) dateFilter.date.$lte = new Date(String(req.query.to))
  }
  const appointments = await Appointment.find({ createdBy: req.userId, ...dateFilter })
    .populate('patient', 'name phone')
    .sort({ date: 1, time: 1 })
    .limit(250)
  return res.json({ appointments })
})

router.post('/', async (req, res) => {
  const parsed = appointmentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message })
  }
  const patientExists = await Patient.exists({
    _id: parsed.data.patient,
    createdBy: req.userId,
  })
  if (!patientExists) {
    return res.status(400).json({ message: 'Choose a patient from your patient records.' })
  }
  const appointment = await Appointment.create({ ...parsed.data, createdBy: req.userId })
  await appointment.populate('patient', 'name phone')
  return res.status(201).json({ appointment })
})

router.patch('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid appointment ID.' })
  }
  if (req.body.status && Object.keys(req.body).length === 1) {
    const parsedStatus = z.enum(['Scheduled', 'Checked in', 'Completed', 'Cancelled'])
      .safeParse(req.body.status)
    if (!parsedStatus.success) {
      return res.status(400).json({ message: 'Choose a valid appointment status.' })
    }
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.userId },
      { status: parsedStatus.data },
      { new: true, runValidators: true },
    ).populate('patient', 'name phone')
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' })
    }
    return res.json({ appointment })
  }

  const parsed = appointmentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message })
  }
  const patientExists = await Patient.exists({ _id: parsed.data.patient, createdBy: req.userId })
  if (!patientExists) {
    return res.status(400).json({ message: 'Choose a patient from your patient records.' })
  }
  const appointment = await Appointment.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.userId },
    parsed.data,
    { new: true, runValidators: true },
  ).populate('patient', 'name phone')
  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found.' })
  }
  return res.json({ appointment })
})

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid appointment ID.' })
  }
  const appointment = await Appointment.findOneAndDelete({
    _id: req.params.id,
    createdBy: req.userId,
  })
  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found.' })
  }
  return res.json({ message: 'Appointment deleted.' })
})

module.exports = router
