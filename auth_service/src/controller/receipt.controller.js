const mongoose = require("mongoose");
const { ZodError } = require("zod");
const StudentFeesLedgerModel = require("../model/studentFeesLedger.model");

const ReceiptMaster = require("../model/receiptMaster.model");
const ReceiptDetails = require("../model/receiptDetails.model");
const ReceiptSchema = require("../schema/receipt.schema");
const StudentCourseEnrollment = require("../model/studentCourse.model");

const createReceipt = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;
        const { enrollmentId, details, receiptDate } = req.body;

        /* -----------------------------
           1️⃣ BASIC VALIDATION
        ----------------------------- */
        if (!enrollmentId || !Array.isArray(details) || details.length === 0) {
            throw new Error("Fees heads required");
        }

        /* -----------------------------
           2️⃣ GET ENROLLMENT
        ----------------------------- */
        const enrollment = await StudentCourseEnrollment.findOne({
            _id: enrollmentId,
            userId
        }).session(session);

        if (!enrollment) {
            throw new Error("Enrollment not found");
        }

        /* -----------------------------
           3️⃣ CALCULATE AMOUNT
        ----------------------------- */
        const receiptAmount = details.reduce(
            (sum, h) => sum + Number(h.amount || 0),
            0
        );

        if (receiptAmount <= 0) {
            throw new Error("Invalid receipt amount");
        }

        /* -----------------------------
           4️⃣ CREATE RECEIPT MASTER
        ----------------------------- */
        const [receiptMaster] = await ReceiptMaster.create(
            [
                {
                    userId,
                    studentId: enrollment.studentId,
                    enrollmentId,
                    receiptNo: `RCPT-${Date.now()}`,
                    receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
                    totalAmount: receiptAmount,
                    isCancelled: false
                }
            ],
            { session }
        );

        /* -----------------------------
           5️⃣ CREATE RECEIPT DETAILS
        ----------------------------- */
        const receiptDetailsPayload = details.map(h => ({
            receiptId: receiptMaster._id,
            feesMasterId: h.feesMasterId,
            amount: h.amount,
            userId
        }));

        await ReceiptDetails.insertMany(receiptDetailsPayload, { session });

        /* -----------------------------
           6️⃣ LEDGER UPDATE (ONLY IF EXISTS)
        ----------------------------- */
        const ledger = await StudentFeesLedgerModel.findOne({
            enrollmentId,
            userId
        }).session(session);

        // 🔥 IMPORTANT: First time enrollment → ledger NOT EXISTS
        // So DO NOTHING
        if (ledger) {
            ledger.totalAmount += receiptAmount;
            ledger.dueAmount = ledger.totalAmount - ledger.paidAmount;
            ledger.lastPaymentDate = new Date();

            if (ledger.paidAmount === 0) {
                ledger.status = "DUE";
            } else if (ledger.dueAmount > 0) {
                ledger.status = "PARTIAL";
            } else {
                ledger.status = "PAID";
            }

            await ledger.save({ session });
        }
        await session.commitTransaction();
        session.endSession();
        return res.status(201).json({
            success: true,
            message: ledger
                ? "Receipt added & ledger updated"
                : "Receipt added successfully",
            data: {
                receiptId: receiptMaster._id,
                receiptAmount
            }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error(error);
        return res.status(400).json({
            success: false,
            message: error.message
        });
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
                                courseName: "$course.name"
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

const getReceiptsByEnrollment = async (req, res) => {
    try {
        const userId = req.user._id;
        const { enrollmentId } = req.params;

        if (!enrollmentId) {
            return res.status(400).json({ message: "enrollmentId is required" });
        }

        const receipts = await ReceiptMaster.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    enrollmentId: new mongoose.Types.ObjectId(enrollmentId),
                    isCancelled: false
                }
            },

            {
                $lookup: {
                    from: "receiptdetails",
                    localField: "_id",
                    foreignField: "receiptId",
                    as: "details"
                }
            },

            {
                $lookup: {
                    from: "feesmasters",
                    localField: "details.feesMasterId",
                    foreignField: "_id",
                    as: "feesMasters"
                }
            },

            {
                $project: {
                    receiptNo: 1,
                    receiptDate: 1,
                    totalAmount: 1,
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
                                                            cond: {
                                                                $eq: ["$$f._id", "$$d.feesMasterId"]
                                                            }
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        },
                                        in: "$$fm.name"
                                    }
                                }
                            }
                        }
                    }
                }
            },

            { $sort: { receiptDate: -1 } }
        ]);

        return res.json({
            totalReceipts: receipts.length,
            data: receipts
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};



module.exports = {
    createReceipt,
    getAllReceipts,
    getReceiptsByEnrollment
};
