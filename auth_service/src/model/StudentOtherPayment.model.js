const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const studentOtherPaymentSchema = new Schema(
    {
        studentId: {
            type: Schema.Types.ObjectId,
            ref: "Student",
            required: true
        },

        otherPaymentId: {
            type: Schema.Types.ObjectId,
            ref: "OtherPaymentMaster",
            required: true
        },

        amount: {
            type: Number,
            required: true,
            min: 0
        },

        paidAmount: {
            type: Number,
            default: 0
        },

        dueAmount: {
            type: Number,
            default: 0
        },

        status: {
            type: String,
            enum: ["pending", "partial", "paid"],
            default: "pending"
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

studentOtherPaymentSchema.index(
    { studentId: 1, otherPaymentId: 1 },
    { unique: true }
);

module.exports = model("StudentOtherPayment", studentOtherPaymentSchema);
