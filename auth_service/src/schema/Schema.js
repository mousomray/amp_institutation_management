const zod = require("zod");

const AdminRegisterSchema = zod.object({
    email : zod.string().email("invalid email address"),
    password : zod.string().min(6 , "password must be at least 6 characters")
})

const AdminLoginSchema = zod.object({
    email : zod.string().email("invalid email address"),
    password : zod.string().min(6 , "password must be at least 6 characters")
})




const institutionSchema = zod.object({
  name: zod.string().min(2, "Institution name must be at least 2 characters"),

  email: zod.string().email("Invalid institution email"),

  phone: zod
    .string()
    .regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),

  website: zod.preprocess(
    (val) => (val === "" ? undefined : val),
    zod.string()
  ),

  registrationNo: zod.string().min(3, "Registration number is required"),

  establishDate: zod
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid establish date"),

  address: zod.string().min(5, "Address must be at least 5 characters"),
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
    description: zod .string()
    .min(5, "description is required"),
});

 const StudentSchema = zod.object({
  studentId: zod.string().min(1, "Student ID is required"),

  name: zod.string().min(1, "Name is required"),

  email: zod.string().email("Invalid email address"),

  phone: zod
    .string()
    .regex(/^[0-9]{10,15}$/, "Phone number must be 10–15 digits"),

  dob: zod
    .union([zod.string(), zod.date()])
    .transform((val) => new Date(val))
    .refine(
      (date) => !isNaN(date.getTime()),
      "Invalid date of birth"
    )
    .refine(
      (date) => date < new Date(),
      "Date of birth must be in the past"
    ),

  fatherName: zod.string().min(1, "Father name is required"),

  bloodGroup: zod.enum([
    "A+",
    "A-",
    "B+",
    "B-",
    "O+",
    "O-",
    "AB+",
    "AB-",
  ]),

 admissionDate: zod
    .union([zod.string(), zod.date()])
    .transform((val) => new Date(val))
    .refine(
      (date) => !isNaN(date.getTime()),
      "Invalid admission date"
    )
    .refine(
      (date) => date <= new Date(),
      "Admission date cannot be in the future"
    ),
});

const EditSthudentSchm = zod.object({
    studentId: zod.string().min(1, "Student ID is required"),

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

  fatherName: zod.string().min(1, "Father name is required"),

  bloodGroup: zod.enum([
    "A+",
    "A-",
    "B+",
    "B-",
    "O+",
    "O-",
    "AB+",
    "AB-",
  ]),

  admissionDate: zod
    .union([zod.string(), zod.date()])
    .optional()
    .transform((val) => (val ? new Date(val) : undefined))
    .refine(
      (date) => date === undefined || !isNaN(date.getTime()),
      { message: "Invalid admission date" }
    ),
})





module.exports = {
    AdminRegisterSchema,
    AdminLoginSchema,
    institutionSchema,
    CourseSchema,
    StudentSchema,
    EditSthudentSchm
}