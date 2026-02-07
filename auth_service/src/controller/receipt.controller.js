const mongoose = require("mongoose");
const { ZodError } = require("zod");

const ReceiptMaster = require("../model/receiptMaster.model");
const ReceiptDetails = require("../model/receiptDetails.model");
const ReceiptSchema = require("../schema/receipt.schema");
const StudentCourseEnrollment = require("../model/studentCourse.model");

const createReceipt = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user.id;
        const {
            enrollmentId,
            receiptDate,
            entryDate,
            isCancelled = false,
            details
        } = req.body;

        // 🔴 Basic validation
        if (!enrollmentId) {
            throw new Error("enrollmentId is required");
        }

        if (!Array.isArray(details) || details.length === 0) {
            throw new Error("Receipt details are required");
        }

        // 1️⃣ Find enrollment
        const enrollment = await StudentCourseEnrollment.findOne({
            _id: enrollmentId,
            userId
        }).session(session);

        if (!enrollment) {
            throw new Error("Enrollment not found");
        }

        // 2️⃣ Calculate total amount
        const totalAmount = details.reduce((sum, item) => {
            if (!item.amount || item.amount <= 0) {
                throw new Error("Invalid receipt amount");
            }
            return sum + item.amount;
        }, 0);

        // 3️⃣ Create receipt master
        const [receipt] = await ReceiptMaster.create(
            [
                {
                    userId,
                    studentId: enrollment.studentId,
                    enrollmentId: enrollment._id,
                    receiptNo: `RCPT-${Date.now()}`,
                    receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
                    entryDate: entryDate ? new Date(entryDate) : new Date(),
                    totalAmount,
                    isCancelled
                }
            ],
            { session }
        );

        // 4️⃣ Create receipt details
        const receiptDetailsPayload = details.map(item => ({
            receiptId: receipt._id,
            feesMasterId: item.feesMasterId,
            amount: item.amount
        }));

        await ReceiptDetails.insertMany(receiptDetailsPayload, { session });

        // 5️⃣ Commit transaction
        await session.commitTransaction();

        return res.status(201).json({
            success: true,
            message: "Receipt created successfully",
            data: {
                receiptId: receipt._id,
                totalAmount
            }
        });

    } catch (error) {
        await session.abortTransaction();

        return res.status(400).json({
            success: false,
            message: error.message
        });

    } finally {
        session.endSession();
    }
};


const getAllReceipts = async (req, res) => {
    try {
        const userId = req.user._id;

        const receipts = await ReceiptMaster.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    isCancelled: false
                }
            },

            // 🔹 Join Enrollment
            {
                $lookup: {
                    from: "studentcourses",
                    localField: "enrollmentId",
                    foreignField: "_id",
                    as: "enrollment"
                }
            },
            { $unwind: "$enrollment" },

            // 🔹 Join Course
            {
                $lookup: {
                    from: "courses",
                    localField: "enrollment.courseId",
                    foreignField: "_id",
                    as: "course"
                }
            },
            { $unwind: "$course" },

            // 🔹 Join Student
            {
                $lookup: {
                    from: "students",
                    localField: "studentId",
                    foreignField: "_id",
                    as: "student"
                }
            },
            { $unwind: "$student" },

            // 🔹 Join Receipt Details
            {
                $lookup: {
                    from: "receiptdetails",
                    localField: "_id",
                    foreignField: "receiptId",
                    as: "details"
                }
            },

            // 🔹 Join Fees Master
            {
                $lookup: {
                    from: "feesmasters",
                    localField: "details.feesMasterId",
                    foreignField: "_id",
                    as: "feesMasters"
                }
            },

            // 🔹 Shape the response
            {
                $project: {
                    receiptNo: 1,
                    receiptDate: 1,
                    receiptMode: 1,
                    totalAmount: 1,

                    student: {
                        _id: "$student._id",
                        name: "$student.name"
                    },

                    course: {
                        _id: "$course._id",
                        name: "$course.name",
                        fees: "$course.fees",
                        duration: "$course.duration"
                    },

                    heads: {
                        $map: {
                            input: "$details",
                            as: "d",
                            in: {
                                amount: "$$d.amount",
                                feesMasterId: "$$d.feesMasterId",
                                feesHeadName: {
                                    $let: {
                                        vars: {
                                            fm: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: "$feesMasters",
                                                            as: "f",
                                                            cond: { $eq: ["$$f._id", "$$d.feesMasterId"] }
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        },
                                        in: "$$fm.name"
                                    }
                                },
                                courseName: "$course.name" // এখানে প্রতিটি head-এ course name add করা হলো
                            }
                        }
                    }
                }
            },

            { $sort: { receiptDate: -1 } }
        ]);

        res.json({
            total: receipts.length,
            data: receipts
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


module.exports = {
    createReceipt,
    getAllReceipts
};
