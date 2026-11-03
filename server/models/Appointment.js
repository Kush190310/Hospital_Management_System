const mongoose = require('mongoose')

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: String, required: true, trim: true, maxlength: 100 },
    department: { type: String, required: true, trim: true, maxlength: 80 },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: ['Scheduled', 'Checked in', 'Completed', 'Cancelled'],
      default: 'Scheduled',
    },
    reason: { type: String, trim: true, maxlength: 300, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
)

appointmentSchema.index({ createdBy: 1, date: 1, time: 1 })

module.exports = mongoose.model('Appointment', appointmentSchema)
