const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const studentSchema = new Schema(
  {
    studentId: {
      type: String,
      trim: true,
    },
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: String,
    dob: Date,
    fatherName: String,
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
    },

    admissionDate: {
      type: Date,
      default: Date.now,
    },

    photo: String,
    signature: String,

    institution: {
      type: Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      unique: true,
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const StudentModel = model("Student", studentSchema);


module.exports = StudentModel;
