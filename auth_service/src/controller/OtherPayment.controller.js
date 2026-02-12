const OtherPaymentMaster = require("../model/OtherPaymentMaster.model");
const StudentOtherPayment = require("../model/StudentOtherPayment.model");
const StudentModel = require("../model/student.model");
const mongoose = require("mongoose");

const createOtherPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, amount, description } = req.body;

    // Create other payment master entry
    const otherPayment = await OtherPaymentMaster.create({
      name,
      amount,
      description,
      createdBy: userId,
      isActive: true
    });

    // Get all active students (isDeleted: false)
    const activeStudents = await StudentModel.find({ isDeleted: false });

    // Create student other payment entries for all active students
    const studentPayments = activeStudents.map(student => ({
      studentId: student._id,
      otherPaymentId: otherPayment._id,
      amount: amount,
      paidAmount: 0,
      dueAmount: amount,
      status: "pending",
      isActive: true
    }));

    // Bulk insert
    await StudentOtherPayment.insertMany(studentPayments);

    res.status(201).json({
      success: true,
      message: "Other payment created and assigned to all active students",
      data: otherPayment,
      assignedToStudents: activeStudents.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getAllOtherPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    /* -------------------------------
       1️⃣ Match Stage (Only Search)
    -------------------------------- */
    const matchStage = {};

    if (search) {
      matchStage.name = { $regex: search, $options: "i" };
    }

    /* -------------------------------
       2️⃣ Aggregate Data
    -------------------------------- */
    const payments = await OtherPaymentMaster.aggregate([
      { $match: matchStage },

      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdByUser"
        }
      },
      {
        $unwind: {
          path: "$createdByUser",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          name: 1,
          amount: 1,
          description: 1,
          isActive: 1,   // 🔥 এখন false হলেও show করবে
          isDeleted: 1,  // চাইলে এটা রাখতেও পারো
          createdAt: 1,
          updatedAt: 1,
          "createdByUser.name": 1,
          "createdByUser.email": 1
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    const totalCount = await OtherPaymentMaster.countDocuments(matchStage);
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      currentPage: page,
      totalPages,
      totalRecords: totalCount,
      data: payments
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};




const getSingleOtherPayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID"
      });
    }

    const pipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id)
        }
      },

      // 🔹 Join createdBy user
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdByUser"
        }
      },
      {
        $unwind: {
          path: "$createdByUser",
          preserveNullAndEmptyArrays: true
        }
      },

      // 🔹 Join student payments
      {
        $lookup: {
          from: "studentotherpayments",
          localField: "_id",
          foreignField: "otherPaymentId",
          as: "studentPayments"
        }
      },

      // 🔹 Summary calculation (NO isActive / isDeleted filter)
      {
        $addFields: {
          totalStudentsAssigned: { $size: "$studentPayments" },

          totalAmount: {
            $sum: "$studentPayments.amount"
          },

          totalPaid: {
            $sum: "$studentPayments.paidAmount"
          },

          totalDue: {
            $sum: "$studentPayments.dueAmount"
          }
        }
      },

      {
        $project: {
          name: 1,
          amount: 1,
          description: 1,
          isActive: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
          createdBy: {
            name: "$createdByUser.name",
            email: "$createdByUser.email"
          },
          totalStudentsAssigned: 1,
          totalAmount: 1,
          totalPaid: 1,
          totalDue: 1
        }
      }
    ];

    const result = await OtherPaymentMaster.aggregate(pipeline);

    if (!result || result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Other payment not found"
      });
    }

    res.status(200).json({
      success: true,
      data: result[0]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateOtherPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    let { name, amount, description, isActive } = req.body;

    const existingPayment = await OtherPaymentMaster.findById(id).session(session);

    if (!existingPayment) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Other payment not found"
      });
    }

    if (amount !== undefined) {
      amount = Number(amount);
    }

    const oldAmount = existingPayment.amount;
    const oldName = existingPayment.name;
    const oldIsActive = existingPayment.isActive;

    /* ===============================
       1️⃣ Update Master
    =============================== */

    if (name !== undefined) existingPayment.name = name;
    if (amount !== undefined) existingPayment.amount = amount;
    if (description !== undefined) existingPayment.description = description;
    if (isActive !== undefined) existingPayment.isActive = isActive;

    await existingPayment.save({ session });

    /* ===============================
       2️⃣ Name Update
    =============================== */

    if (name !== undefined && name !== oldName) {
      await StudentOtherPayment.updateMany(
        { otherPaymentId: id },
        { $set: { feeName: name } },
        { session }
      );
    }

    /* ===============================
       3️⃣ Amount Update
    =============================== */

    if (amount !== undefined && amount !== oldAmount) {

      const difference = amount - oldAmount;

      const studentPayments = await StudentOtherPayment.find({
        otherPaymentId: id
      }).session(session);

      for (let payment of studentPayments) {

        payment.amount = amount;
        const paid = payment.paidAmount || 0;
        payment.dueAmount = amount - paid;

        await payment.save({ session });

        await StudentModel.findByIdAndUpdate(
          payment.studentId,
          { $inc: { totalFees: difference } },
          { session }
        );
      }
    }

    /* ===============================
       4️⃣ Deactivate (isActive false)
    =============================== */

    if (isActive === false && oldIsActive === true) {

      const studentPayments = await StudentOtherPayment.find({
        otherPaymentId: id
      }).session(session);

      for (let payment of studentPayments) {

        await StudentModel.findByIdAndUpdate(
          payment.studentId,
          {
            $inc: {
              totalFees: -payment.amount
            }
          },
          { session }
        );

        await StudentOtherPayment.findByIdAndDelete(payment._id, { session });
      }
    }

    /* ===============================
       5️⃣ Reactivate (isActive true)
    =============================== */

    if (isActive === true && oldIsActive === false) {

      // 🔥 সব active student খুঁজে বের করো
      const students = await StudentModel.find({ isActive: true }).session(session);

      for (let student of students) {

        // Create new payment record
        await StudentOtherPayment.create([{
          studentId: student._id,
          otherPaymentId: id,
          feeName: existingPayment.name,
          amount: existingPayment.amount,
          paidAmount: 0,
          dueAmount: existingPayment.amount
        }], { session });

        // Increase student totalFees
        await StudentModel.findByIdAndUpdate(
          student._id,
          {
            $inc: {
              totalFees: existingPayment.amount
            }
          },
          { session }
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Other payment updated successfully",
      data: existingPayment
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.log("Error in updateOtherPayment:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const deleteOtherPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID"
      });
    }

    const studentPayments = await StudentOtherPayment.find({
      otherPaymentId: id
    }).session(session);

    for (let payment of studentPayments) {

      await StudentModel.findByIdAndUpdate(
        payment.studentId,
        {
          $inc: {
            totalFees: -payment.amount,
            totalDue: -payment.dueAmount,
            totalPaid: -payment.paidAmount
          }
        },
        { session }
      );
    }

    await StudentOtherPayment.deleteMany(
      { otherPaymentId: id },
      { session }
    );

    await OtherPaymentMaster.findByIdAndDelete(id).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Other payment permanently deleted and student balances adjusted"
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.log("Error in deleteOtherPayment:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const getStudentOtherPaymentList = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 5 } = req.query;

    // Convert to numbers
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build match conditions
    let matchConditions = {
      isDeleted: false
    };

    if (search) {
      matchConditions.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } }
      ];
    }

    // Count total documents pipeline
    const countPipeline = [
      {
        $match: matchConditions
      },
      {
        $count: "total"
      }
    ];

    const pipeline = [
      // Match active students
      {
        $match: matchConditions
      },
      // Lookup student payments
      {
        $lookup: {
          from: "studentotherpayments",
          localField: "_id",
          foreignField: "studentId",
          as: "payments"
        }
      },
      // Unwind payments array
      {
        $unwind: {
          path: "$payments",
          preserveNullAndEmptyArrays: true
        }
      },
      // Filter active payments and status
      {
        $match: {
          $or: [
            { "payments.isActive": true },
            { "payments": { $exists: false } }
          ],
          ...(status && { "payments.status": status })
        }
      },
      // Lookup payment master details
      {
        $lookup: {
          from: "otherpaymentmasters",
          localField: "payments.otherPaymentId",
          foreignField: "_id",
          as: "paymentDetails"
        }
      },
      // Unwind payment details
      {
        $unwind: {
          path: "$paymentDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      // Group back by student
      {
        $group: {
          _id: "$_id",
          studentName: { $first: "$name" },
          email: { $first: "$email" },
          phone: { $first: "$phone" },
          studentId: { $first: "$studentId" },
          photo: { $first: "$photo" },
          signature: { $first: "$signature" },
          dob: { $first: "$dob" },
          fatherName: { $first: "$fatherName" },
          bloodGroup: { $first: "$bloodGroup" },
          admissionDate: { $first: "$admissionDate" },
          fees: {
            $push: {
              $cond: [
                { $ifNull: ["$payments._id", false] },
                {
                  paymentId: "$payments._id",
                  name: "$paymentDetails.name",
                  amount: "$payments.amount",
                  paidAmount: "$payments.paidAmount",
                  dueAmount: "$payments.dueAmount",
                  status: "$payments.status"
                },
                "$$REMOVE"
              ]
            }
          },
          totalAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ifNull: ["$payments.amount", false] },
                    { $eq: ["$payments.isActive", true] }
                  ]
                },
                "$payments.amount",
                0
              ]
            }
          },
          totalPaid: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ifNull: ["$payments.paidAmount", false] },
                    { $eq: ["$payments.isActive", true] }
                  ]
                },
                "$payments.paidAmount",
                0
              ]
            }
          },
          totalDue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ifNull: ["$payments.dueAmount", false] },
                    { $eq: ["$payments.isActive", true] }
                  ]
                },
                "$payments.dueAmount",
                0
              ]
            }
          }
        }
      },
      // Project final structure
      {
        $project: {
          _id: 0,
          studentId: "$_id",
          studentName: 1,
          email: 1,
          phone: 1,
          photo: 1,
          signature: 1,
          dob: 1,
          fatherName: 1,
          bloodGroup: 1,
          admissionDate: 1,
          fees: {
            $cond: [
              { $eq: [{ $size: "$fees" }, 0] },
              [],
              "$fees"
            ]
          },
          totalAmount: 1,
          totalPaid: 1,
          totalDue: 1
        }
      },
      // Sort by student name
      {
        $sort: { studentName: 1 }
      },
      // Pagination - Skip
      {
        $skip: skip
      },
      // Pagination - Limit
      {
        $limit: limitNum
      }
    ];

    // Execute both pipelines
    const [result, countResult] = await Promise.all([
      StudentModel.aggregate(pipeline),
      StudentModel.aggregate(countPipeline)
    ]);

    const totalDocuments = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(totalDocuments / limitNum);

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalDocuments: totalDocuments,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error("Error in getStudentOtherPaymentList:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

const getStudentOtherPayments = async (req, res) => {
  try {
    const { studentId } = req.params;

    const pipeline = [
      // Match specific student
      {
        $match: {
          _id: mongoose.Types.ObjectId(studentId),
          isDeleted: false
        }
      },
      // Lookup student payments
      {
        $lookup: {
          from: "studentotherpayments",
          localField: "_id",
          foreignField: "studentId",
          as: "payments"
        }
      },
      // Unwind payments
      {
        $unwind: {
          path: "$payments",
          preserveNullAndEmptyArrays: false
        }
      },
      // Match active payments only
      {
        $match: {
          "payments.isActive": true
        }
      },
      // Lookup payment master details
      {
        $lookup: {
          from: "otherpaymentmasters",
          localField: "payments.otherPaymentId",
          foreignField: "_id",
          as: "paymentDetails"
        }
      },
      // Unwind payment details
      {
        $unwind: "$paymentDetails"
      },
      // Group to get student info and all payments
      {
        $group: {
          _id: "$_id",
          studentName: { $first: "$name" },
          email: { $first: "$email" },
          phone: { $first: "$phone" },
          payments: {
            $push: {
              id: "$payments._id",
              name: "$paymentDetails.name",
              description: "$paymentDetails.description",
              amount: "$payments.amount",
              paidAmount: "$payments.paidAmount",
              dueAmount: "$payments.dueAmount",
              status: "$payments.status",
              createdAt: "$payments.createdAt"
            }
          },
          totalAmount: { $sum: "$payments.amount" },
          totalPaid: { $sum: "$payments.paidAmount" },
          totalDue: { $sum: "$payments.dueAmount" }
        }
      },
      // Project final structure
      {
        $project: {
          _id: 0,
          student: {
            name: "$studentName",
            email: "$email",
            phone: "$phone"
          },
          payments: 1,
          summary: {
            totalAmount: "$totalAmount",
            totalPaid: "$totalPaid",
            totalDue: "$totalDue"
          }
        }
      }
    ];

    const result = await StudentModel.aggregate(pipeline);

    if (!result || result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found or no payments available"
      });
    }

    res.status(200).json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const makePayment = async (req, res) => {
  try {
    const { id } = req.params; // StudentOtherPayment ID
    const { paidAmount } = req.body;

    const payment = await StudentOtherPayment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found"
      });
    }

    const newPaidAmount = payment.paidAmount + paidAmount;
    const newDueAmount = payment.amount - newPaidAmount;

    let status = "pending";
    if (newDueAmount === 0) {
      status = "paid";
    } else if (newPaidAmount > 0 && newDueAmount > 0) {
      status = "partial";
    }

    payment.paidAmount = newPaidAmount;
    payment.dueAmount = newDueAmount;
    payment.status = status;

    await payment.save();

    res.status(200).json({
      success: true,
      message: "Payment recorded successfully",
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getPaymentStatistics = async (req, res) => {
  try {
    const stats = await StudentOtherPayment.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          totalPaid: { $sum: "$paidAmount" },
          totalDue: { $sum: "$dueAmount" }
        }
      },
      {
        $project: {
          _id: 0,
          status: "$_id",
          count: 1,
          totalAmount: 1,
          totalPaid: 1,
          totalDue: 1
        }
      }
    ]);

    // Overall statistics
    const overall = await StudentOtherPayment.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: null,
          totalStudents: { $addToSet: "$studentId" },
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          totalPaid: { $sum: "$paidAmount" },
          totalDue: { $sum: "$dueAmount" }
        }
      },
      {
        $project: {
          _id: 0,
          totalStudents: { $size: "$totalStudents" },
          totalPayments: 1,
          totalAmount: 1,
          totalPaid: 1,
          totalDue: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus: stats,
        overall: overall[0] || {}
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createOtherPayment,
  getAllOtherPayments,
  getSingleOtherPayment,
  updateOtherPayment,
  deleteOtherPayment,
  getStudentOtherPaymentList,
  getStudentOtherPayments,
  makePayment,
  getPaymentStatistics
};