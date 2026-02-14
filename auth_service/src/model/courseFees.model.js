const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const courseFeesSchema = new Schema(
    {
        courseId: {
            type: Schema.Types.ObjectId,
            ref: "Course",
            required: true,
            index: true
        },

        feesMasterId: {
            type: Schema.Types.ObjectId,
            ref: "FeesMaster",
            required: true
        },

        amount: {
            type: Number,
            required: true,
            min: 0
        },

        isActive: {
            type: Boolean,
            default: true
        },

        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    { timestamps: true }
);

courseFeesSchema.index(
    { courseId: 1, feesMasterId: 1 },
    { unique: true }
);

const CourseFees = model("CourseFees", courseFeesSchema);

module.exports = CourseFees;
