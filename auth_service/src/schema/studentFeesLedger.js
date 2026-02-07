const zod = require("zod");

const StudentFeesSchema = zod.object({

  totalAmount: zod
    .number({
      required_error: "Total amount is required",
      invalid_type_error: "Total amount must be a number"
    })
    .min(0, "Total amount cannot be negative"),

  paidAmount: zod
    .number({
      invalid_type_error: "Paid amount must be a number"
    })
    .min(0, "Paid amount cannot be negative")
    .optional()
    .default(0),

  dueAmount: zod
    .number({
      required_error: "Due amount is required",
      invalid_type_error: "Due amount must be a number"
    })
    .min(0, "Due amount cannot be negative"),

  paymentType: zod
    .enum(["NORMAL", "INSTALLMENT"])
    .optional()
    .default("NORMAL"),

  status: zod
    .enum(["DUE", "PARTIAL", "PAID"])
    .optional()
    .default("DUE"),

  userId: zod
    .string({
      required_error: "User ID is required",
      invalid_type_error: "User ID must be a string"
    })
    .min(1, "User ID cannot be empty")
});

module.exports = StudentFeesSchema;
