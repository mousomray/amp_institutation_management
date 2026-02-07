const mongoose = require("mongoose");
const StudentFeesLedgerModel = require("../model/studentFeesLedger.model.js");
const ReceiptMasterModel = require("../model/receiptMaster.model.js");
const EnrollmentModel = require("../model/studentCourse.model.js");
const ReceiptDetailsModel = require("../model/receiptDetails.model.js");

const createStudentFees = async (req, res) => {
  try {
    const { enrollmentId, receiptMasterId } = req.body;

    // 🔹 Logged-in user
    const userId = req.user._id;

    // 1️⃣ Fetch Enrollment
    const enrollment = await EnrollmentModel.findOne({
      _id: enrollmentId,
      userId
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found"
      });
    }

    const studentId = enrollment.studentId;
    const enrollmentFees = enrollment.totalFees || 0;
    const enrollmentDiscount = enrollment.discountAmount || 0;

    // 2️⃣ Fetch Receipt Master
    const receiptMaster = await ReceiptMasterModel.findOne({
      _id: receiptMasterId,
      userId,
      isCancelled: false
    });

    if (!receiptMaster) {
      return res.status(404).json({
        success: false,
        message: "Receipt master not found"
      });
    }

    // 3️⃣ Fetch Receipt Details (Library Fees, Birthroom etc.)
    const receiptDetails = await ReceiptDetailsModel.find({
      receiptId: receiptMasterId
    });

    let otherFeesTotal = 0;
    if (receiptDetails && receiptDetails.length > 0) {
      receiptDetails.forEach(d => {
        otherFeesTotal += d.amount;
      });
    }

    // 4️⃣ Total amount calculation
    const totalAmount = enrollmentFees - enrollmentDiscount + otherFeesTotal;

    // Initial ledger values
    const paidAmount = 0;
    const dueAmount = totalAmount;
    const status = dueAmount === 0 ? "PAID" : "DUE";

    // 5️⃣ Create Student Fees Ledger
    const studentFees = await StudentFeesLedgerModel.create({
      studentId,
      enrollmentId,
      receiptMasterId,
      totalAmount,
      discountAmount: enrollmentDiscount,
      paidAmount,
      dueAmount,
      paymentType: enrollment.paymentType || "NORMAL",
      status,
      userId
    });

    return res.status(201).json({
      success: true,
      message: "Student fees ledger created successfully",
      data: studentFees
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getAllStudentFees = async (req, res) => {
  try {
    const userId = req.user._id;

    const ledgers = await StudentFeesLedgerModel.aggregate([
      // 1️⃣ Filter by user
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId)
        }
      },

      // 2️⃣ Join Enrollment
      {
        $lookup: {
          from: "studentcourses",
          localField: "enrollmentId",
          foreignField: "_id",
          as: "enrollment"
        }
      },
      { $unwind: "$enrollment" },

      // 3️⃣ Join Course
      {
        $lookup: {
          from: "courses",
          localField: "enrollment.courseId",
          foreignField: "_id",
          as: "course"
        }
      },
      { $unwind: "$course" },

      // 4️⃣ Join Student
      {
        $lookup: {
          from: "students",
          localField: "enrollment.studentId",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },

      // 5️⃣ Join Receipt Master
      {
        $lookup: {
          from: "receiptmasters",
          localField: "receiptMasterId",
          foreignField: "_id",
          as: "receiptMaster"
        }
      },
      { $unwind: "$receiptMaster" },

      // 6️⃣ Join Receipt Details
      {
        $lookup: {
          from: "receiptdetails",
          localField: "receiptMaster._id",
          foreignField: "receiptId",
          as: "receiptDetails"
        }
      },

      // 7️⃣ Join FeesMasters (for head names)
      {
        $lookup: {
          from: "feesmasters",
          localField: "receiptDetails.feesMasterId",
          foreignField: "_id",
          as: "feesMasters"
        }
      },

      // 8️⃣ Project final response
      {
        $project: {
          student: {
            _id: "$student._id",
            name: "$student.name"
          },
          course: {
            _id: "$course._id",
            name: "$course.name",
            duration: "$course.duration",
            fees: "$enrollment.totalFees"
          },
          enrollment: {
            _id: "$enrollment._id",
            discountAmount: "$enrollment.discountAmount",
            netPayableAmount: "$enrollment.netPayableAmount"
          },
          receipt: {
            _id: "$receiptMaster._id",
            receiptNo: "$receiptMaster.receiptNo",
            receiptDate: "$receiptMaster.receiptDate",
            receiptMode: "$receiptMaster.receiptMode"
          },
          heads: {
            $map: {
              input: "$receiptDetails",
              as: "d",
              in: {
                feesHeadId: "$$d.feesMasterId",
                amount: "$$d.amount",
                feesHeadName: {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: {
                          $filter: {
                            input: "$feesMasters",
                            as: "f",
                            cond: { $eq: ["$$f._id", "$$d.feesMasterId"] }
                          }
                        },
                        as: "f",
                        in: "$$f.name"
                      }
                    },
                    0
                  ]
                }
              }
            }
          },

          // Ledger fields
          totalAmount: "$totalAmount",
          discountAmount: "$discountAmount",
          paidAmount: "$paidAmount",
          dueAmount: "$dueAmount",
          paymentType: "$paymentType",
          status: "$status",
          lastPaymentDate: "$lastPaymentDate",
          userId: "$userId",
          createdAt: 1,
          updatedAt: 1
        }
      },

      { $sort: { createdAt: -1 } }
    ]);

    return res.json({
      success: true,
      total: ledgers.length,
      data: ledgers
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getSingleStudentFees = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; // student fees ledger _id

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID"
      });
    }

    const ledgerData = await StudentFeesLedgerModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(userId) } },

      // Join Enrollment
      {
        $lookup: {
          from: "studentcourses",
          localField: "enrollmentId",
          foreignField: "_id",
          as: "enrollment"
        }
      },
      { $unwind: "$enrollment" },

      // Join Course
      {
        $lookup: {
          from: "courses",
          localField: "enrollment.courseId",
          foreignField: "_id",
          as: "course"
        }
      },
      { $unwind: "$course" },

      // Join Student
      {
        $lookup: {
          from: "students",
          localField: "enrollment.studentId",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },

      // Join ReceiptMaster
      {
        $lookup: {
          from: "receiptmasters",
          localField: "receiptMasterId",
          foreignField: "_id",
          as: "receiptMaster"
        }
      },
      { $unwind: "$receiptMaster" },

      // Join ReceiptDetails
      {
        $lookup: {
          from: "receiptdetails",
          localField: "receiptMaster._id",
          foreignField: "receiptId",
          as: "receiptDetails"
        }
      },

      // Join FeesMasters for head names
      {
        $lookup: {
          from: "feesmasters",
          localField: "receiptDetails.feesMasterId",
          foreignField: "_id",
          as: "feesMasters"
        }
      },

      // Project final response
      {
        $project: {
          ledgerId: "$_id",
          student: {
            _id: "$student._id",
            name: "$student.name"
          },
          course: {
            _id: "$course._id",
            name: "$course.name",
            duration: "$course.duration",
            fees: "$enrollment.totalFees"
          },
          enrollment: {
            _id: "$enrollment._id",
            discountAmount: "$enrollment.discountAmount",
            netPayableAmount: "$enrollment.netPayableAmount"
          },
          receipt: {
            _id: "$receiptMaster._id",
            receiptNo: "$receiptMaster.receiptNo",
            receiptDate: "$receiptMaster.receiptDate",
            receiptMode: "$receiptMaster.receiptMode"
          },
          heads: {
            $map: {
              input: "$receiptDetails",
              as: "d",
              in: {
                feesHeadId: "$$d.feesMasterId",
                amount: "$$d.amount",
                feesHeadName: {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: {
                          $filter: {
                            input: "$feesMasters",
                            as: "f",
                            cond: { $eq: ["$$f._id", "$$d.feesMasterId"] }
                          }
                        },
                        as: "f",
                        in: "$$f.name"
                      }
                    },
                    0
                  ]
                }
              }
            }
          },
          totalAmount: 1,
          paidAmount: 1,
          dueAmount: 1,
          discountAmount: 1,
          paymentType: 1,
          status: 1,
          lastPaymentDate: 1,
          userId: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    ]);

    if (!ledgerData || ledgerData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student fees not found"
      });
    }

    return res.json({
      success: true,
      data: ledgerData[0]
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


module.exports = { createStudentFees, getAllStudentFees,getSingleStudentFees };
