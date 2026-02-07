const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const receiptMasterSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },

    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: "StudentCourse",
      required: true
    },

    receiptNo: {
      type: String,
      required: true
    },

    receiptDate: {
      type: Date,
      required: true
    },

    entryDate: {
      type: Date,
      default: Date.now
    },

    totalAmount: {
      type: Number,
      required: true
    },

    isCancelled: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = model("ReceiptMaster", receiptMasterSchema);
