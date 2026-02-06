const zod = require("zod");

const CourseSchema = zod.object({
    name: zod
        .string()
        .min(1, "Course name is required"),

    duration: zod
        .string()
        .min(5, "Duration is required"),
    fee: zod
        .string()
        .min(1, "Fee is required"),
    description: zod.string()
        .min(5, "description is required"),
});

module.exports = CourseSchema;