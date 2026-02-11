const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const otherPaymentMasterSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    description: {
      type: String,
      default: ""
    },

    isActive: {
      type: Boolean,
      default: true
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = model("OtherPaymentMaster", otherPaymentMasterSchema);
