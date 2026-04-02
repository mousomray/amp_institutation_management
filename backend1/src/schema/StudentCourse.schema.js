const zod = require("zod");

const objectId = zod
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

const dateFrom = zod.preprocess((arg) => {
  if (arg instanceof Date) return arg;
  if (typeof arg === "string" || typeof arg === "number") {
    const d = new Date(arg);
    return isNaN(d.getTime()) ? arg : d;
  }
  return arg;
}, zod.date());

const StudentCourseSchema = zod
  .object({
    userId: objectId,
    courseId: objectId,
    studentId: objectId,
    invoiceNo: zod.string().min(1, "Invoice number is required"),
    enrollmentDate: dateFrom,
    entryDate: dateFrom.optional(), // model has default Date.now
    totalFees: zod
      .number()
      .min(0, "Total fees must be >= 0"),
    discountAmount: zod
      .number()
      .min(0, "Discount cannot be negative")
      .optional()
      .default(0),
    netPayableAmount: zod
      .number()
      .min(0, "Net payable must be >= 0")
      .optional(),
    status: zod
      .enum(["ACTIVE", "CANCELLED", "COMPLETED"])
      .optional(),
  })
  .refine(
    (obj) => {
      const disc = obj.discountAmount ?? 0;
      if (obj.netPayableAmount === undefined) return true;
      // allow small float tolerance
      return Math.abs(obj.netPayableAmount - (obj.totalFees - disc)) < 0.0001;
    },
    {
      message: "netPayableAmount must equal totalFees - discountAmount",
      path: ["netPayableAmount"],
    }
  );

module.exports = StudentCourseSchema;

