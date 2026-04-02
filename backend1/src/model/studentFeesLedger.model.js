const mongoose = require("mongoose");
const { Schema } = mongoose;

const studentFeesLedgerSchema = new Schema(
    {
        enrollmentId: {
            type: Schema.Types.ObjectId,
            ref: "StudentCourseEnroll",
            required: true,
            index: true
        },
        receiptMasterId: {
            type: Schema.Types.ObjectId,
            ref: "receiptmasters",
            required: true
        },

        totalAmount: {
            type: Number,
            required: true,
            min: 0
        },

        paidAmount: {
            type: Number,
            default: 0,
            min: 0
        },

        discountAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        dueAmount: {
            type: Number,
            required: true,
            min: 0
        },
        paymentType: {
            type: String,
            enum: ["NORMAL", "INSTALLMENT"],
            default: "NORMAL"
        },
        status: {
            type: String,
            enum: ["DUE", "PARTIAL", "PAID"],
            default: "DUE"
        },
        lastPaymentDate: {
            type: Date
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    { timestamps: true }
);

const StudentFeesLedger = mongoose.model("StudentFeesLedger", studentFeesLedgerSchema);

module.exports = StudentFeesLedger;
