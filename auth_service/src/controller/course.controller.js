const { ZodError } = require("zod");
const { User } = require("../model/model.js");
const { Institution } = require("../model/model.js");
const CourseModel = require("../model/course.model.js");
const CourseSchema = require("../schema/course.schema.js");
const uploadSingleImage = require("../helper/upload.js")
const mongoose = require("mongoose");

const createCourse = async (req, res) => {
    try {
        const parsedData = CourseSchema.parse(req.body);
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const institutionUser = await User.findById(userId);
        if (!institutionUser || institutionUser.role !== "institution") {
            return res.status(403).json({
                message: "Only institutions can create courses",
            });
        }
        const institution = await Institution.findOne({
            adminUser: institutionUser._id,
        });
        if (!institution) {
            return res.status(404).json({
                message: "Institution not found",
            });
        }
        if (!req.file) {
            return res.status(400).json({ message: "Course image is required" });
        }
        const existingCourse = await CourseModel.findOne({
            name: { $regex: `^${parsedData.name}$`, $options: "i" }, // case-insensitive
            institution: institution._id,
            isDeleted: false,
        });
        if (existingCourse) {
            return res.status(400).json({ message: "Course with the same name already exists for this institution" });
        }
        const imageUrl = await uploadSingleImage(req.file);
        const course = await CourseModel.create({
            name: parsedData.name,
            duration: parsedData.duration,
            fee: Number(parsedData.fee),
            image: imageUrl,
            institution: institution._id,
            description: parsedData.description
        });
        return res.status(200).json({
            message: "Course created successfully",
            course,
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message: "Validation failed",
                errors: error.issues.map(err => ({
                    field: err.path.join("."),
                    message: err.message
                }))
            });
        }
        console.error(error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }

};

const getMyCourses = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const institutionUser = await User.findById(userId);

    if (!institutionUser || institutionUser.role !== "institution") {
      return res.status(403).json({
        message: "Only institutions can access courses",
      });
    }

    const institution = await Institution.findOne({
      adminUser: institutionUser._id,
    });

    if (!institution) {
      return res.status(404).json({
        message: "Institution not found",
      });
    }

    /* ================= Pagination ================= */
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    /* ============================================== */

    /* ================= Search ================= */
    const { name } = req.query;

    const matchStage = {
      institution: institution._id,
      isDeleted: false,
    };

    if (name) {
      matchStage.name = {
        $regex: name,
        $options: "i", // case-insensitive
      };
    }
    /* =========================================== */

    const courses = await CourseModel.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "institutions",
          localField: "institution",
          foreignField: "_id",
          as: "institution",
        },
      },
      { $unwind: "$institution" },
      {
        $project: {
          name: 1,
          duration: 1,
          fee: 1,
          image: 1,
          description: 1,
          createdAt: 1,
          institution: {
            _id: "$institution._id",
            name: "$institution.name",
            email: "$institution.email",
          },
        },
      },
      { $skip: skip },
      { $limit: limit },
    ]);

    /* ===== Total Count (search aware) ===== */
    const totalCourses = await CourseModel.countDocuments(matchStage);

    return res.status(200).json({
      message: "My courses fetched successfully",
      data: courses,
      pagination: {
        total: totalCourses,
        page,
        limit,
        totalPages: Math.ceil(totalCourses / limit),
      },
    });
  } catch (error) {
    console.error("Get my courses error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



const courseDetails = async (req, res) => {
    try {
        const courseId = req.params.id;
        if (!courseId) {
            return res.status(400).json({ message: "Course ID is required" });
        }
        const course = await CourseModel.findById(courseId)
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }
        res.status(200).json({
            message: "Course details fetched successfully",
            data: course
        });
    } catch (err) {
        console.log("error", err)
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
};

const updateCourse = async (req, res) => {
    try {
        const courseId = req.params.id
        const parsedData = CourseSchema.parse(req.body)
        if (!courseId) {
            return res.status(404).json({ message: "courseId user not found" });
        }
        const course = await CourseModel.findByIdAndUpdate(courseId, {
            name: parsedData.name,
            duration: parsedData.duration,
            fee: Number(parsedData.fee),
            description: parsedData.description
        }, { new: true })
        return res.status(200).json({
            message: "Course updated successfully",
            course,
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message: "Validation failed",
                errors: error.issues.map(err => ({
                    field: err.path.join("."),
                    message: err.message
                }))
            });
        }
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
        });

    }
}

const deleteCourse = async (req, res) => {
    try {
        const courseId = req.params.id;

        if (!courseId) {
            return res.status(400).json({
                message: "Course id is required",
            });
        }

        const course = await CourseModel.findOne({
            _id: courseId,
            isDeleted: false,
        });

        if (!course) {
            return res.status(404).json({
                message: "Course not found or already deleted",
            });
        }

        await CourseModel.findByIdAndUpdate(
            courseId,
            { isDeleted: true },
            { new: true }
        );

        return res.status(200).json({
            message: "Course deleted successfully (soft delete)",
        });
    } catch (error) {
        console.error("Delete course error:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

module.exports = { createCourse, getMyCourses, courseDetails, updateCourse, deleteCourse }


