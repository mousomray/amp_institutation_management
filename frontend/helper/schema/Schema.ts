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

  website: zod
    .string().min(4, 'Invalid website URL')
    .optional()
    .or(zod.literal('')),

  registrationNo: zod
    .string()
    .min(3, 'Registration number is required'),

  establishDate: zod.string().refine(
    (date) => !isNaN(Date.parse(date)),
    'Invalid establish date'
  ),

  address: zod.string().min(5, 'Address must be at least 5 characters'),
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
  studentId: zod.string().min(1, "Student ID is required"),
  name: zod.string().min(1, "Name is required"),
  email: zod.string().email("Invalid email address"),
  phone: zod
    .string()
    .min(10, "Phone must be at least 10 digits")
    .max(10, "Phone number too long"),
  dob: zod.date().refine((val) => val instanceof Date && !isNaN(val.getTime()), {
    message: "Date of birth is required",
  }),
  fatherName: zod.string().min(1, "Father name is required"),
  bloodGroup: zod.string().min(1, "Blood group is required"),
  admissionDate: zod.date().refine((val) => val instanceof Date && !isNaN(val.getTime()), {
    message: "Admission date is required",
  }),
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
});
