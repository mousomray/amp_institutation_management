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

    // 🔹 Pagination
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 🔹 Search (student name)
    const search = req.query.search?.trim();

    const matchUserStage = {
      $match: {
        userId: new mongoose.Types.ObjectId(userId)
      }
    };

    const aggregationPipeline = [
      matchUserStage,

      /* ---------------------------
         ENROLLMENT
      --------------------------- */
      {
        $lookup: {
          from: "studentcourses",
          localField: "enrollmentId",
          foreignField: "_id",
          as: "enrollment"
        }
      },
      { $unwind: "$enrollment" },

      /* ---------------------------
         COURSE
      --------------------------- */
      {
        $lookup: {
          from: "courses",
          localField: "enrollment.courseId",
          foreignField: "_id",
          as: "course"
        }
      },
      { $unwind: "$course" },

      /* ---------------------------
         STUDENT
      --------------------------- */
      {
        $lookup: {
          from: "students",
          localField: "enrollment.studentId",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },

      /* ---------------------------
         🔍 SEARCH BY STUDENT NAME
      --------------------------- */
      ...(search
        ? [
          {
            $match: {
              "student.name": {
                $regex: search,
                $options: "i"
              }
            }
          }
        ]
        : []),

      /* ---------------------------
         RECEIPTS
      --------------------------- */
      {
        $lookup: {
          from: "receiptmasters",
          let: { enrollmentId: "$enrollment._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$enrollmentId", "$$enrollmentId"]
                }
              }
            }
          ],
          as: "receipts"
        }
      },

      /* ---------------------------
         RECEIPT DETAILS
      --------------------------- */
      {
        $lookup: {
          from: "receiptdetails",
          localField: "receipts._id",
          foreignField: "receiptId",
          as: "receiptDetails"
        }
      },

      /* ---------------------------
         FEES MASTER
      --------------------------- */
      {
        $lookup: {
          from: "feesmasters",
          localField: "receiptDetails.feesMasterId",
          foreignField: "_id",
          as: "feesMasters"
        }
      },

      /* ---------------------------
         SORT
      --------------------------- */
      { $sort: { createdAt: -1 } },

      /* ---------------------------
         PAGINATION + COUNT
      --------------------------- */
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $skip: skip },
            { $limit: limit },

            {
              $project: {
                student: {
                  _id: "$student._id",
                  name: "$student.name",
                  photo: "$student.photo"
                },

                course: {
                  _id: "$course._id",
                  name: "$course.name",
                  duration: "$course.duration",
                  fees: "$course.fees"
                },

                enrollment: {
                  _id: "$enrollment._id",
                  discountAmount: "$enrollment.discountAmount",
                  netPayableAmount: "$enrollment.netPayableAmount"
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
                                  cond: {
                                    $eq: [
                                      "$$f._id",
                                      "$$d.feesMasterId"
                                    ]
                                  }
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
                status: 1,
                paymentType: 1,
                lastPaymentDate: 1,
                createdAt: 1
              }
            }
          ]
        }
      }
    ];

    const result = await StudentFeesLedgerModel.aggregate(
      aggregationPipeline
    );

    const total = result[0]?.metadata[0]?.total || 0;
    const data = result[0]?.data || [];

    res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const getSingleStudentFees = async (req, res) => {
  try {
    const ledgerId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(ledgerId)) {
      return res.status(400).json({ message: "Invalid ledger ID" });
    }

    const data = await StudentFeesLedgerModel.aggregate([
      /* 1️⃣ Match Ledger */
      {
        $match: {
          _id: new mongoose.Types.ObjectId(ledgerId)
        }
      },

      /* 2️⃣ Enrollment */
      {
        $lookup: {
          from: "studentcourses",
          localField: "enrollmentId",
          foreignField: "_id",
          as: "enrollment"
        }
      },
      { $unwind: "$enrollment" },

      /* 3️⃣ Student */
      {
        $lookup: {
          from: "students",
          localField: "enrollment.studentId",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },

      /* 4️⃣ Course */
      {
        $lookup: {
          from: "courses",
          localField: "enrollment.courseId",
          foreignField: "_id",
          as: "course"
        }
      },
      { $unwind: "$course" },

      /* 5️⃣ Installment Items */
      {
        $lookup: {
          from: "studentinstallmentitems",
          localField: "_id",              // StudentFeesLedger._id
          foreignField: "studentFeesId",  // Installment.studentFeesId
          as: "installments"
        }
      },

      /* 6️⃣ Sort Installments by Due Date */
      {
        $addFields: {
          installments: {
            $sortArray: {
              input: "$installments",
              sortBy: { dueDate: 1 }
            }
          }
        }
      },

      /* 7️⃣ Final Response */
      {
        $project: {
          ledgerId: "$_id",

          totalAmount: 1,
          paidAmount: 1,
          dueAmount: 1,
          discountAmount: 1,
          paymentType: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,

          student: {
            _id: "$student._id",
            name: "$student.name",
            photo: "$student.photo"
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

          installments: {
            _id: 1,
            dueDate: 1,
            amount: 1,
            paidAmount: 1,
            status: 1
          }
        }
      }
    ]);

    if (!data.length) {
      return res.status(404).json({ message: "Fees record not found" });
    }

    return res.json({
      success: true,
      data: data[0]
    });

  } catch (error) {
    console.error("getSingleStudentFees error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getStudentFinancialReport = async (req, res) => {
  try {
    const userId = req.user._id;
    const { year, month, date, week, page = 1, search } = req.query;

    const limit = 5;
    const skip = (Number(page) - 1) * limit;

    let startDate, endDate;

    /* ================= DATE FILTER ================= */

    if (date) {
      startDate = new Date(date);
      endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
    } 
    else if (week) {
      const current = new Date(week);
      const firstDay = current.getDate() - current.getDay();
      startDate = new Date(current.setDate(firstDay));
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } 
    else if (year && month) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
      endDate.setHours(23, 59, 59, 999);
    } 
    else if (year) {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
      endDate.setHours(23, 59, 59, 999);
    }

    const match = {
      userId: new mongoose.Types.ObjectId(userId)
    };

    if (startDate && endDate) {
      match.createdAt = { $gte: startDate, $lte: endDate };
    }

    const basePipeline = [

      { $match: match },

      {
        $lookup: {
          from: "studentcourses",
          localField: "enrollmentId",
          foreignField: "_id",
          as: "enrollment"
        }
      },
      { $unwind: "$enrollment" },

      {
        $lookup: {
          from: "students",
          localField: "enrollment.studentId",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },

      ...(search ? [{
        $match: {
          "student.name": { $regex: search, $options: "i" }
        }
      }] : []),

      {
        $lookup: {
          from: "courses",
          localField: "enrollment.courseId",
          foreignField: "_id",
          as: "course"
        }
      },
      { $unwind: "$course" },

      {
        $group: {
          _id: "$_id",
          doc: { $first: "$$ROOT" }
        }
      },
      { $replaceRoot: { newRoot: "$doc" } }
    ];

    const result = await StudentFeesLedgerModel.aggregate([
      ...basePipeline,

      {
        $facet: {

          /* ✅ FULL DATA (No Pagination) */
          allData: [
            {
              $project: {
                student: {
                  _id: "$student._id",
                  name: "$student.name",
                  email: "$student.email",
                  photo: "$student.photo"
                },
                course: {
                  _id: "$course._id",
                  name: "$course.name",
                  image: "$course.image"
                },
                enrollmentDate: "$enrollment.createdAt",
                totalAmount: 1,
                paidAmount: 1,
                dueAmount: 1,
                paymentType: 1,
                status: 1,
                createdAt: 1
              }
            }
          ],

          /* ✅ PAGINATED DATA */
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                student: {
                  _id: "$student._id",
                  name: "$student.name",
                  email: "$student.email",
                  photo: "$student.photo"
                },
                course: {
                  _id: "$course._id",
                  name: "$course.name",
                  image: "$course.image"
                },
                enrollmentDate: "$enrollment.createdAt",
                totalAmount: 1,
                paidAmount: 1,
                dueAmount: 1,
                paymentType: 1,
                status: 1,
                createdAt: 1
              }
            }
          ],

          /* ✅ SUMMARY */
          summary: [
            {
              $group: {
                _id: null,
                totalAmount: { $sum: "$totalAmount" },
                totalPaidAmount: { $sum: "$paidAmount" },
                totalDueAmount: { $sum: "$dueAmount" }
              }
            }
          ],

          /* ✅ TOTAL COUNT */
          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ]);

    const total = result[0].totalCount[0]?.count || 0;

    res.json({
      success: true,
      summary: result[0].summary[0] || {
        totalAmount: 0,
        totalPaidAmount: 0,
        totalDueAmount: 0
      },
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        perPage: limit
      },
      data: result[0].data,       // pagination wise
      allData: result[0].allData  // full dataset
    });

  } catch (error) {
    console.error("Report Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


module.exports = { createStudentFees, getAllStudentFees, getSingleStudentFees,getStudentFinancialReport };
