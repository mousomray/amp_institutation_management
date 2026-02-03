const mongoose = require("mongoose");
const { Schema, model } = mongoose;


const userSchema = new Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "institution", "student"],
      required: true,
    },
    institution: { type: Schema.Types.ObjectId, ref: "Institution" },
    student: { type: Schema.Types.ObjectId, ref: "Student" }
  },
  { timestamps: true }
);


const institutionSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: String,
    website: String,
    registrationNo: {
      type: String,
      default: null,
    },
    establishDate: Date,
    address: String,
    geoLocation: {
      lat: String,
      lng: String,
    },
    institutionImage: { type: String, default: null },
    institutionBanner: String,
    adminUser: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE"
    }
  },
  { timestamps: true }
);


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

    /* make students an explicit array with default so push/update works reliably */
    students: {
      type: [{ type: Schema.Types.ObjectId, ref: "Student" }],
      default: [],
    },
  },
  { timestamps: true }
);




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

    /* 🔗 Student → Multiple Courses (explicit array with default) */
    courses: {
      type: [{ type: Schema.Types.ObjectId, ref: "Course" }],
      default: [],
    },

    /* 🔗 Student ↔ User (1–1) */
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      unique: true,
    },
  },
  { timestamps: true }
);

// Fees Master Schema 
const feesMasterSchema = new Schema(
  {
    name: {
      type: String,
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

    description: {
      type: String
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

// Student Fees Schema 
const studentFeesSchema = new Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
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

    dueAmount: {
      type: Number,
      required: true,
      min: 0
    },

    status: {
      type: String,
      enum: ["DUE", "PARTIAL", "PAID"],
      default: "DUE"
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

const studentFeeItemsSchema = new Schema({
  studentFeesId: {
    type: Schema.Types.ObjectId,
    ref: "StudentFees",
    required: true
  },

  feeType: {
    type: String,
    enum: ["COURSE", "MASTER"],
    required: true
  },

  courseId: {
    type: Schema.Types.ObjectId,
    ref: "Course"
  },

  feeMasterId: {
    type: Schema.Types.ObjectId,
    ref: "FeesMaster"
  },

  amount: {
    type: Number,
    required: true
  }

}, { timestamps: true });

const studentFeePaymentSchema = new Schema({
  studentFeesId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StudentFees",
    required: true
  },

  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  paymentMode: {
    type: String,
    enum: ["CASH", "UPI", "BANK", "CARD"],
    required: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  paymentDate: {
    type: Date,
    default: Date.now
  }
});

// Per-student installment items (linked to StudentFees)
const studentInstallmentItemSchema = new Schema({
  studentFeesId: { type: Schema.Types.ObjectId, ref: "StudentFees", required: true },
  dueDate: { type: Date, required: true },
  amount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ["DUE", "PARTIAL", "PAID"], default: "DUE" },
  sequence: { type: Number }
}, { timestamps: true });



const User = model("User", userSchema);
const Institution = model("Institution", institutionSchema);
const Course = model("Course", courseSchema);
const Student = model("Student", studentSchema);
const FeesMaster = model("FeesMaster", feesMasterSchema);
const StudentFees = model("StudentFees", studentFeesSchema);
const StudentFeeItems = model("StudentFeeItems", studentFeeItemsSchema);
const StudentFeePayment = model("StudentFeePayment", studentFeePaymentSchema);
const StudentInstallmentItem = model("StudentInstallmentItem", studentInstallmentItemSchema);

module.exports = {
  User,
  Institution,
  Course,
  Student,
  FeesMaster,
  StudentFees,
  StudentFeeItems,
  StudentFeePayment,
  StudentInstallmentItem
};
