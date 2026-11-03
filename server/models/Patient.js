const mongoose = require('mongoose')

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['Female', 'Male', 'Non-binary', 'Other'], required: true },
    bloodGroup: { type: String, enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], default: '' },
    address: { type: String, trim: true, maxlength: 200, default: '' },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
)

patientSchema.index({ createdBy: 1, name: 1 })

module.exports = mongoose.model('Patient', patientSchema)
