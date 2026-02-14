const zod = require("zod");

const AdminRegisterSchema = zod.object({
  email: zod.string().email("invalid email address"),
  password: zod.string().min(6, "password must be at least 6 characters")
})

const AdminLoginSchema = zod.object({
  email: zod.string().email("invalid email address"),
  password: zod.string().min(6, "password must be at least 6 characters")
})




const institutionSchema = zod.object({
  name: zod.string().min(2, 'Institution name must be at least 2 characters'),
  email: zod.string().email('Invalid institution email'),
  phone: zod
    .string()
    .min(10, "Phone must be at least 10 digits")
    .max(10, "Phone number too long"),
  whatsAppNo: zod
      .string()
      .min(10, "Phone must be at least 10 digits")
      .max(10, "Phone number too long"),

  // Optional fields
  website: zod.string().optional(),
  registrationNo: zod.string().optional(),
  establishDate: zod
    .string()
    .refine((date) => !date || !isNaN(Date.parse(date)), 'Invalid establish date')
    .optional(),
  address: zod
    .string()
    .optional(),
});

const CourseSchema = zod.object({
  name: zod
    .string()
    .min(1, "Course name is required"),

  duration: zod
    .string()
    .min(1, "Duration is required"),

  fee: zod
    .string()
    .min(1, "Fee is required"),
  description: zod.string()
    .min(5, "description is required"),
});

const StudentSchema = zod.object({
  studentId: zod.string().optional(),
  name: zod.string().min(1, "Name is required"),
  email: zod.string().email("Invalid email address"),
  phone: zod
    .string()
    .min(10, "Phone must be at least 10 digits")
    .max(10, "Phone number too long"),
  dob: zod
    .string()
    .refine((date) => !date || !isNaN(Date.parse(date)), 'Invalid establish date')
    .optional(),
  fatherName: zod.string().optional(),
  bloodGroup: zod.string().optional(),
  admissionDate: zod
    .string()
    .refine((date) => !date || !isNaN(Date.parse(date)), 'Invalid establish date')
    .optional(),
  courseId: zod.array(zod.string()).optional()
});

const EditStudentSchema = zod.object({
  studentId: zod.string().optional(),

  name: zod.string().min(1, "Name is required"),

  email: zod.string().email("Invalid email address"),

  phone: zod
    .string()
    .regex(/^[0-9]{10,15}$/, "Phone number must be 10–15 digits"),

  dob: zod
    .union([zod.string(), zod.date()])
    .optional()
    .transform((val) => (val ? new Date(val) : undefined))
    .refine(
      (date) => date === undefined || !isNaN(date.getTime()),
      { message: "Invalid date of birth" }
    ),

  fatherName: zod.string().optional(),

  bloodGroup: zod.string().optional(),

  admissionDate: zod
    .union([zod.string(), zod.date()])
    .optional()
    .transform((val) => (val ? new Date(val) : undefined))
    .refine(
      (date) => date === undefined || !isNaN(date.getTime()),
      { message: "Invalid admission date" }
    ),
  courseId: zod.array(zod.string()).optional()
})

const FeesMasterSchema = zod.object({
  name: zod
    .string()
    .min(1, "Fee name is required"),

  amount: zod
    .number({
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number"
    })
    .min(0, "Amount cannot be negative"),

  isActive: zod
    .boolean()
    .optional()
    .default(true),

  description: zod
    .string()
    .optional()
});

const EditFeesMasterSchema = zod.object({
  name: zod
    .string()
    .min(1, "Fee name is required"),

  amount: zod
    .number({
      invalid_type_error: "Amount must be a number"
    })
    .min(0, "Amount cannot be negative"),

  isActive: zod
    .boolean()
    .optional(),

  description: zod
    .string()
    .optional()
});

const createStudentFeesSchema = zod.object({
  studentId: zod.string().min(1, "Student ID is required"),

  courseId: zod.string().min(1, "Course ID is required"),

  totalAmount: zod.number().min(0, "Total amount must be positive"),

  paidAmount: zod.number().min(0).optional(),

  dueAmount: zod.number().min(0, "Due amount must be positive"),

  status: zod.enum(["DUE", "PARTIAL", "PAID"]).optional()
});

const editStudentFeesSchema = zod.object({
  studentId: zod.string().min(1, "Student ID is required"),

  courseId: zod.string().min(1, "Course ID is required"),

  totalAmount: zod.number().min(0, "Total amount must be positive"),

  paidAmount: zod.number().min(0).optional(),

  dueAmount: zod.number().min(0, "Due amount must be positive"),

  status: zod.enum(["DUE", "PARTIAL", "PAID"]).optional()
});


const RsetPasswordSchema = zod.object({
  currentPassword: zod.string().min(6, "password must be at least 6 characters"),
   newPassword: zod.string().min(6, "password must be at least 6 characters")
})


module.exports = {
  AdminRegisterSchema,
  AdminLoginSchema,
  institutionSchema,
  CourseSchema,
  StudentSchema,
  EditStudentSchema,
  FeesMasterSchema,
  EditFeesMasterSchema,
  createStudentFeesSchema,
  editStudentFeesSchema,
  RsetPasswordSchema
}