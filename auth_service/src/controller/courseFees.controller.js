const CourseFees = require("../model/courseFees.model");
const CourseModel = require("../model/course.model");
const FeesMaster = require("../model/feesmaster.model");
const mongoose = require("mongoose");

const createCourseFee = async (req, res) => {
    try {
        const userId = req.user.id;
        const { courseId, fees } = req.body;

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return res.status(400).json({ message: "Invalid course ID" });
        }

        if (!Array.isArray(fees) || fees.length === 0) {
            return res.status(400).json({ message: "Fees array is required" });
        }

        // Check course exist
        const course = await CourseModel.findOne({
            _id: courseId,
            isDeleted: false
        });

        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Validate all feesMasterId
        const feesMasterIds = fees.map(f => f.feesMasterId);

        const existingFeesMasters = await FeesMaster.find({
            _id: { $in: feesMasterIds },
            isDeleted: false
        });

        if (existingFeesMasters.length !== fees.length) {
            return res.status(400).json({
                message: "One or more FeesMaster not found"
            });
        }

        // Prepare bulk data
        const insertData = fees.map(fee => ({
            courseId,
            feesMasterId: fee.feesMasterId,
            amount: fee.amount,
            userId
        }));

        // Insert many
        const result = await CourseFees.insertMany(insertData, {
            ordered: false
        });

        return res.status(201).json({
            message: "Course fees added successfully",
            data: result
        });

    } catch (error) {
        console.error("Error in createCourseFee:", error);
        if (error.code === 11000) {
            return res.status(400).json({
                message: "Duplicate fee type found for this course"
            });
        }
        return res.status(500).json({
            message: "Something went wrong",
            error: error.message
        });
    }
};

const getCourseFeesByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return res.status(400).json({ message: "Invalid course ID" });
        }

        const data = await CourseFees.aggregate([
            {
                $match: {
                    courseId: new mongoose.Types.ObjectId(courseId),
                    isActive: true
                }
            },

            // Join Course
            {
                $lookup: {
                    from: "courses",
                    localField: "courseId",
                    foreignField: "_id",
                    as: "course"
                }
            },
            { $unwind: "$course" },

            // Join FeesMaster
            {
                $lookup: {
                    from: "feesmasters",
                    localField: "feesMasterId",
                    foreignField: "_id",
                    as: "fees"
                }
            },
            { $unwind: "$fees" },

            // Group
            {
                $group: {
                    _id: "$course._id",
                    courseName: { $first: "$course.name" },
                    fees: {
                        $push: {
                            feesMasterId: "$fees._id",   // 🔥 Added ID
                            feesName: "$fees.name",
                            amount: "$amount"
                        }
                    }
                }
            },

            {
                $project: {
                    _id: 0,
                    course: "$courseName",
                    fees: 1
                }
            }
        ]);

        return res.status(200).json({
            message: "Course fees fetched successfully",
            data: data[0] || {}
        });

    } catch (error) {
        return res.status(500).json({
            message: "Something went wrong",
            error: error.message
        });
    }
};

const updateCourseFees = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId, fees } = req.body;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    if (!Array.isArray(fees)) {
      return res.status(400).json({ message: "Fees array is required" });
    }

    // Existing DB fees
    const existingFees = await CourseFees.find({ courseId });

    const existingMap = new Map();
    existingFees.forEach(fee => {
      existingMap.set(fee.feesMasterId.toString(), fee);
    });

    const requestMap = new Map();
    fees.forEach(fee => {
      requestMap.set(fee.feesMasterId, fee);
    });

    /* ========================
       1️⃣ UPDATE + INSERT
    ======================== */

    for (let fee of fees) {

      if (existingMap.has(fee.feesMasterId)) {
        // UPDATE
        await CourseFees.updateOne(
          {
            courseId,
            feesMasterId: fee.feesMasterId
          },
          { amount: fee.amount }
        );
      } else {
        // INSERT
        await CourseFees.create({
          courseId,
          feesMasterId: fee.feesMasterId,
          amount: fee.amount,
          userId
        });
      }
    }

    /* ========================
       2️⃣ DELETE Missing Fees
    ======================== */

    for (let existing of existingFees) {
      if (!requestMap.has(existing.feesMasterId.toString())) {
        await CourseFees.deleteOne({
          _id: existing._id
        });
      }
    }

    return res.status(200).json({
      message: "Course fees updated successfully"
    });

  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
      error: error.message
    });
  }
};

module.exports = { createCourseFee, getCourseFeesByCourse,updateCourseFees };