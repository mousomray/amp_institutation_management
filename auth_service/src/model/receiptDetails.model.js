const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const receiptDetailsSchema = new Schema(
  {
    receiptId: {
      type: Schema.Types.ObjectId,
      ref: "ReceiptMaster",
      required: true
    },

    feesMasterId: {
      type: Schema.Types.ObjectId,
      ref: "FeesMaster",
      required: true
    },

    amount: {
      type: Number,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = model("ReceiptDetails", receiptDetailsSchema);