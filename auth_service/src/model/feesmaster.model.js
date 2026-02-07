const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const feesMasterSchema = new Schema(
    {
        name: {
            type: String,
            required: true
        },

        isActive: {
            type: Boolean,
            default: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

const FeesMaster = model("FeesMaster", feesMasterSchema);
module.exports = FeesMaster;