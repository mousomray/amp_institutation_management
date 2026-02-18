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
    appPassword: {
      type: String,
      select: false
    },
    whatsAppNo: String,
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

    paymentType: {
      type: String,
      enum: ["NORMAL", "INSTALLMENT"],
      default: "NORMAL"
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
    enum: ["CASH", "UPI", "BANK", "CARD", "CHEQUE"],
    required: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  paymentDate: {
    type: Date,
    default: Date.now
  },
  instrumentId: {
    type: String,
    default: null,
  },
  instrumentDate: {
    type: Date,
    default: null
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
const StudentFees = model("StudentFees", studentFeesSchema);
const StudentFeeItems = model("StudentFeeItems", studentFeeItemsSchema);
const StudentFeePayment = model("StudentFeePayment", studentFeePaymentSchema);
const StudentInstallmentItem = model("StudentInstallmentItem", studentInstallmentItemSchema);

module.exports = {
  User,
  Institution,
  StudentFees,
  StudentFeeItems,
  StudentFeePayment,
  StudentInstallmentItem
};
