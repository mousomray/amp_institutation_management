const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const courseSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },

        duration: { type: String, required: true },

        fee: { type: Number, required: true },

        image: String,
        description: String,

        institution: {
            type: Schema.Types.ObjectId,
            ref: "Institution",
            required: true,
        },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const CourseModel = model("Course", courseSchema);
module.exports = CourseModel;