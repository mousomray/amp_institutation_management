const zod = require("zod");

const StudentSchema = zod.object({
  studentId: zod.string().min(1, "Name is required"),
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
});


module.exports = {
    StudentSchema
}