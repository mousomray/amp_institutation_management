const mongoose = require('mongoose')
const Schema = mongoose.Schema

const SettingsSchema = new Schema({

  book_fee: {
    type: Number,
    required: true,
    min: 0
  },

  late_fine: {
    type: Number,
    required: true,
    min: 0
  },

  userId: {
    type: String,
    required: true
  },

  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true })

const SettingsModel = mongoose.model('settings', SettingsSchema)
module.exports = SettingsModel
