const zod = require("zod");

const FeesMasterSchema = zod.object({
  name: zod
    .string()
    .min(1, "Fees head name is required")
    .trim(),

  isActive: zod
    .boolean()
    .optional(),

  userId: zod
    .string()
    .min(1, "User ID is required"),

  isDeleted: zod
    .boolean()
    .optional()
});

module.exports = FeesMasterSchema;
