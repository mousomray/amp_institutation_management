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

const ReceiptSchema = zod.object({
  userId: objectId,
  studentId: objectId,
  enrollmentId: objectId,
  receiptNo: zod.string().min(1, "Receipt number is required"),
  receiptDate: dateFrom,
  entryDate: dateFrom.optional(),
  totalAmount: zod.number().min(0, "Total amount must be >= 0"),
  isCancelled: zod.boolean().optional().default(false)
});

module.exports = ReceiptSchema;
