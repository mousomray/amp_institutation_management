const mongoose = require('mongoose')
const Schema = mongoose.Schema

const IssueSchema = new Schema({

    book_id: {
        type: Schema.Types.ObjectId,
        ref: 'book',
        required: [true, 'Book is required']
    },

    student_id: {
        type: Schema.Types.ObjectId,
        ref: 'student',
        required: [true, 'Student is required']
    },

    issue_date: {
        type: Date,
        default: Date.now
    },

    return_date: {
        type: Date,
        required: [true, 'Return date is required']
    },

    actual_return_date: {
        type: Date
    },

    base_rate: {
        type: Number,
        required: [true, 'Base rate is required'],
        min: [0, 'Base rate cannot be negative']
    },

    fine: {
        type: Number,
        default: 0,
        min: [0, 'Fine cannot be negative']
    },

    total_amount: {
        type: Number,
        default: 0,
        min: [0, 'Total amount cannot be negative']
    },

    status: {
        type: String,
        enum: ['issued', 'returned'],
        default: 'issued'
    }

}, { timestamps: true })

const IssueModel = mongoose.model('issue', IssueSchema)

module.exports = IssueModel
