import { z as zod } from 'zod'

export const AdminRegisterSchema = zod.object({
  email: zod.string().email('Invalid email address'),
  password: zod.string().min(6, 'Password must be at least 6 characters'),
})

export const AdminLoginSchema = zod.object({
  email: zod.string().email('Invalid email address'),
  password: zod.string().min(6, 'Password must be at least 6 characters'),
})




export const InstitutionSchema = zod.object({
  name: zod.string().min(2, 'Institution name must be at least 2 characters'),
  email: zod.string().email('Invalid institution email'),
  phone: zod
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
})

export const CourseSchema = zod.object({
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

export const StudentSchema = zod.object({
  studentId: zod.string().optional(),
  name: zod.string().min(1, "Name is required"),
  email: zod.string().email("Invalid email address"),
  phone: zod
    .string()
    .min(10, "Phone must be at least 10 digits")
    .max(10, "Phone number too long"),
  dob: zod
    .date()
    .refine((val) => val instanceof Date && !isNaN(val.getTime()), {
      message: "Date of birth is required",
    })
    .optional(), // optional
  fatherName: zod.string().optional(),
  bloodGroup: zod.string().optional(),
  admissionDate: zod
    .date()
    .refine((val) => val instanceof Date && !isNaN(val.getTime()), {
      message: "Admission date is required",
    })
    .optional(),
  course: zod.object({
    _id: zod.string(),
    name: zod.string(),
    fee: zod.number(),
    image: zod.string().optional(),
  }).optional(),

});

// Add FeesSchema here
export const FeesSchema = zod.object({
  name: zod.string().min(1, "Name is required"),
  // coerce to number to handle values from inputs reliably
  amount: zod.coerce.number().nonnegative("Amount must be >= 0"),
  isActive: zod.boolean().optional().default(true),
});

export const BookSchema = zod.object({
  name: zod
    .string()
    .min(3, "Name must be at least 3 characters long"),

  authorName: zod
    .string()
    .min(3, "Author Name must be at least 3 characters long"),

  language: zod
    .string()
    .min(3, "Language must be at least 3 characters long"),

  description: zod
    .string()
    .min(3, "Description must be at least 3 characters long"),

  isAvailable: zod
    .boolean()
    .optional()
    .default(true),

  isDeleted: zod
    .boolean()
    .optional()
    .default(false),
  bookFee: zod.coerce.number().optional(),
  lateFee: zod.coerce.number().optional(),
});

// Add IssueSchema for book issuing
export const IssueSchema = zod.object({
  book_id: zod.string().min(1, "Select a book"),
  student_id: zod.string().min(1, "Select a student"),
  base_rate: zod
    .number({ error: "Base rate must be a number" })
    .min(0, "Base rate cannot be negative"),
  return_date: zod
    .string()
    .refine((d) => !isNaN(Date.parse(d)), "Invalid return date"),
});

export const bookSetting = zod.object({
  bookFee: zod.coerce.number(),
  lateFee: zod.coerce.number(),
});