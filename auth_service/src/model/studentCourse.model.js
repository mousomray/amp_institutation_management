const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const StudentCourseSchema = new Schema(
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

    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true
    },

    invoiceNo: {
      type: String,
      required: true,
      unique: true
    },

    enrollmentDate: {
      type: Date,
      required: true
    },

    entryDate: {
      type: Date,
      default: Date.now
    },

    totalFees: {
      type: Number,
      required: true,
      min: 0
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    netPayableAmount: {
      type: Number,
      min: 0
    },

    status: {
      type: String,
      enum: ["ACTIVE", "CANCELLED", "COMPLETED"],
      default: "ACTIVE"
    }
  },
  { timestamps: true }
);

StudentCourseSchema.pre("save", function () {
  const discount = this.discountAmount || 0;
  this.netPayableAmount = Math.max(
    this.totalFees - discount,
    0
  );
});

module.exports = model("StudentCourse", StudentCourseSchema);
