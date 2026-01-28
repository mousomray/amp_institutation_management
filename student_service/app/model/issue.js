const mongoose = require('mongoose')
const Schema = mongoose.Schema

/* ========= HELPER FUNCTION ========= */

function calculateDuration(startDate, endDate) {
  if (!startDate || !endDate) return 'N/A';

  let start = new Date(startDate);
  let end = new Date(endDate);

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonth;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  let result = [];
  if (years > 0) result.push(`${years} year${years > 1 ? 's' : ''}`);
  if (months > 0) result.push(`${months} month${months > 1 ? 's' : ''}`);
  if (days > 0) result.push(`${days} day${days > 1 ? 's' : ''}`);

  return result.length ? result.join(' ') : '0 days';
}

/* ========= SCHEMA ========= */

const IssueSchema = new Schema({

  book_id: {
    type: Schema.Types.ObjectId,
    ref: 'book',
    required: true
  },

  student_id: {
    type: Schema.Types.ObjectId,
    required: true
  },
  userId: {
    type: String,
  },

  issue_date: {
    type: Date,
    default: Date.now
  },

  return_date: {
    type: Date,
    required: true
  },

  actual_return_date: {
    type: Date
  },

  base_rate: {
    type: Number,
    required: true,
    min: 0
  },

  fine: {
    type: Number,
    default: 0,
    min: 0
  },

  total_amount: {
    type: Number,
    default: 0,
    min: 0
  },

  status: {
    type: String,
    enum: ['issued', 'returned'],
    default: 'issued'
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

/* ========= VIRTUALS ========= */

// Issue duration (issue ➜ expected return)
IssueSchema.virtual('issue_duration').get(function () {
  return calculateDuration(this.issue_date, this.return_date);
});

// Delay duration (expected return ➜ actual return)
IssueSchema.virtual('delay_duration').get(function () {
  if (!this.actual_return_date) return 'No delay';
  return calculateDuration(this.return_date, this.actual_return_date);
});

const IssueModel = mongoose.model('issue', IssueSchema)
module.exports = IssueModel
