const OtherPaymentMaster = require("../model/OtherPaymentMaster.model");
const StudentOtherPayment = require("../model/StudentOtherPayment.model");
const StudentModel = require("../model/student.model");
const mongoose = require("mongoose");
const puppeteer = require("puppeteer-core");
const ejs = require("ejs");
const path = require("path");
const { User, Institution } = require("../model/model.js");
const createTransporter = require("../helper/institute.email.service.js");

const createOtherPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, amount, description } = req.body;

    // Validation
    if (!name || !amount) {
      return res.status(400).json({
        success: false,
        message: "Name and amount are required"
      });
    }

    const otherPayment = await OtherPaymentMaster.create({
      name,
      amount,
      description,
      createdBy: userId,
      isActive: true
    });

    const activeStudents = await StudentModel.find({ isDeleted: false });

    if (activeStudents.length === 0) {
      return res.status(201).json({
        success: true,
        message: "Other payment created but no active students found",
        data: otherPayment,
        assignedToStudents: 0
      });
    }

    const studentPayments = activeStudents.map(student => ({
      studentId: student._id,
      otherPaymentId: otherPayment._id,
      amount: amount,
      paidAmount: 0,
      dueAmount: amount,
      status: "pending",
      isActive: true,
      createdBy: userId
    }));

    await StudentOtherPayment.insertMany(studentPayments);

    res.status(201).json({
      success: true,
      message: "Other payment created and assigned to all active students",
      data: otherPayment,
      assignedToStudents: activeStudents.length
    });

  } catch (error) {
    console.error("Error in createOtherPayment:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const getAllOtherPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    const matchStage = {
      createdBy: new mongoose.Types.ObjectId(userId)
    };

    if (search) {
      matchStage.name = { $regex: search, $options: "i" };
    }

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
          isActive: 1,
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

const sendOtherPayment = async (req, res) => {
  try {
    const { id } = req.params; // studentId
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const institutionUser = await User.findById(userId);
    console.log("==>", institutionUser)

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

    const student = await StudentModel.findById(id)
    if(!student){
      return res.status(403).json({
        message: "Student is not found",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid student ID");
    }

    const pipeline = [
      {
        $match: {
          studentId: new mongoose.Types.ObjectId(id)
        }
      },
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },

      {
        $lookup: {
          from: "otherpaymentmasters",
          localField: "otherPaymentId",
          foreignField: "_id",
          as: "paymentDetails"
        }
      },
      { $unwind: "$paymentDetails" },

      {
        $group: {
          _id: "$studentId",
          student: { $first: "$student" },
          challanDate: { $first: "$createdAt" },

          totalAmount: { $sum: "$amount" },
          totalPaid: { $sum: "$paidAmount" },
          totalDue: { $sum: "$dueAmount" },

          payments: {
            $push: {
              name: "$paymentDetails.name",
              amount: "$amount",
              paidAmount: "$paidAmount",
              dueAmount: "$dueAmount",
              status: {
                $cond: [
                  { $eq: ["$dueAmount", 0] },
                  "PAID",
                  {
                    $cond: [
                      { $gt: ["$paidAmount", 0] },
                      "PARTIAL",
                      "PENDING"
                    ]
                  }
                ]
              }
            }
          }
        }
      }
    ];

    const result = await StudentOtherPayment.aggregate(pipeline);

    if (!result.length) {
      throw new Error("No payment found for this student");
    }

    const data = {
      ...result[0],
      institution: {
        name: institution.name,
        email: institution.email,
        phone: institution.phone || "",
        address: institution.address || "",
      },
    };

    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: process.env.CHROME_PATH,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    const html = await ejs.renderFile(
      path.join(__dirname, "../views/otherPaymentReport.ejs"),
      { data }
    );

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" }
    });

    await browser.close();
    const transporter = await createTransporter(institutionUser._id);
    await transporter.sendMail({
      from: institutionUser.email,
      to: student.email,
      subject: "Your Student Fees Receipt",
      html: `
            <div style="font-family:Arial,sans-serif">
              <h2>Hello ${student.name},</h2>
              <p>Please find attached your fees receipt.</p>
              <p>Regards,<br/>${institutionUser.email}</p>
            </div>
          `,
      attachments: [
        {
          filename: `student-fees-${student._id}.pdf`,
          content: pdf,
          contentType: "application/pdf"
        }
      ]
    });
    return res.status(200).json({
      message: "PDF generated and sent successfully",
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

const getSingleOtherPaymentPDF = async (req, res) => {
  try {
    const { id } = req.params; // studentId
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const institutionUser = await User.findById(userId);
    console.log("==>", institutionUser)

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


    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid student ID");
    }

    const pipeline = [
      {
        $match: {
          studentId: new mongoose.Types.ObjectId(id)
        }
      },
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },

      {
        $lookup: {
          from: "otherpaymentmasters",
          localField: "otherPaymentId",
          foreignField: "_id",
          as: "paymentDetails"
        }
      },
      { $unwind: "$paymentDetails" },

      {
        $group: {
          _id: "$studentId",
          student: { $first: "$student" },
          challanDate: { $first: "$createdAt" },

          totalAmount: { $sum: "$amount" },
          totalPaid: { $sum: "$paidAmount" },
          totalDue: { $sum: "$dueAmount" },

          payments: {
            $push: {
              name: "$paymentDetails.name",
              amount: "$amount",
              paidAmount: "$paidAmount",
              dueAmount: "$dueAmount",
              status: {
                $cond: [
                  { $eq: ["$dueAmount", 0] },
                  "PAID",
                  {
                    $cond: [
                      { $gt: ["$paidAmount", 0] },
                      "PARTIAL",
                      "PENDING"
                    ]
                  }
                ]
              }
            }
          }
        }
      }
    ];

    const result = await StudentOtherPayment.aggregate(pipeline);

    if (!result.length) {
      throw new Error("No payment found for this student");
    }

    const data = {
      ...result[0],
      institution: {
        name: institution.name,
        email: institution.email,
        phone: institution.phone || "",
        address: institution.address || "",
      },
    };

    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: process.env.CHROME_PATH,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    const html = await ejs.renderFile(
      path.join(__dirname, "../views/otherPaymentReport.ejs"),
      { data }
    );

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" }
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=other-payment-report.pdf"
    });

    return res.send(pdf);

  } catch (error) {
    return res.status(500).json({
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

    if (name !== undefined) existingPayment.name = name;
    if (amount !== undefined) existingPayment.amount = amount;
    if (description !== undefined) existingPayment.description = description;
    if (isActive !== undefined) existingPayment.isActive = isActive;

    await existingPayment.save({ session });

    if (name !== undefined && name !== oldName) {
      await StudentOtherPayment.updateMany(
        { otherPaymentId: id },
        { $set: { feeName: name } },
        { session }
      );
    }

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

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { status, search, page = 1, limit = 5 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    /* ============================
       1️⃣ Student Match (NO createdBy here)
    ============================ */

    let studentMatch = {
      isDeleted: false
    };

    if (search) {
      studentMatch.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } }
      ];
    }

    /* ============================
       2️⃣ Aggregation Pipeline
    ============================ */

    const pipeline = [

      { $match: studentMatch },

      {
        $lookup: {
          from: "studentotherpayments",
          let: { studentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$studentId", "$$studentId"] },
                    { $eq: ["$createdBy", userId] }, // ✅ correct filtering here
                    { $eq: ["$isActive", true] }
                  ]
                }
              }
            }
          ],
          as: "payments"
        }
      },

      // 🔥 only show students who have payment for this user
      {
        $match: {
          "payments.0": { $exists: true }
        }
      },

      { $unwind: "$payments" },

      ...(status ? [{
        $match: { "payments.status": status }
      }] : []),

      {
        $lookup: {
          from: "otherpaymentmasters",
          localField: "payments.otherPaymentId",
          foreignField: "_id",
          as: "paymentDetails"
        }
      },
      { $unwind: "$paymentDetails" },

      {
        $group: {
          _id: "$_id",
          studentName: { $first: "$name" },
          email: { $first: "$email" },
          phone: { $first: "$phone" },
          photo: { $first: "$photo" },
          admissionDate: { $first: "$admissionDate" },

          fees: {
            $push: {
              paymentId: "$payments._id",
              name: "$paymentDetails.name",
              amount: "$payments.amount",
              paidAmount: "$payments.paidAmount",
              dueAmount: "$payments.dueAmount",
              status: "$payments.status"
            }
          },

          totalAmount: { $sum: "$payments.amount" },
          totalPaid: { $sum: "$payments.paidAmount" },
          totalDue: { $sum: "$payments.dueAmount" }
        }
      },

      {
        $project: {
          _id: 0,
          studentId: "$_id",
          studentName: 1,
          email: 1,
          phone: 1,
          photo: 1,
          admissionDate: 1,
          fees: 1,
          totalAmount: 1,
          totalPaid: 1,
          totalDue: 1
        }
      },

      { $sort: { studentName: 1 } },
      { $skip: skip },
      { $limit: limitNum }
    ];

    /* ============================
       Count (Correct Way)
    ============================ */

    const countPipeline = [
      { $match: studentMatch },
      {
        $lookup: {
          from: "studentotherpayments",
          let: { studentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$studentId", "$$studentId"] },
                    { $eq: ["$createdBy", userId] },
                    { $eq: ["$isActive", true] }
                  ]
                }
              }
            }
          ],
          as: "payments"
        }
      },
      { $match: { "payments.0": { $exists: true } } },
      { $count: "total" }
    ];

    const [result, countResult] = await Promise.all([
      StudentModel.aggregate(pipeline),
      StudentModel.aggregate(countPipeline)
    ]);

    const totalDocuments = countResult.length ? countResult[0].total : 0;
    const totalPages = Math.ceil(totalDocuments / limitNum);

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalDocuments,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
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

    const userId = new mongoose.Types.ObjectId(req.user.id);

    /* =========================
       1️⃣ Status Wise Statistics
    ========================== */

    const stats = await StudentOtherPayment.aggregate([
      {
        $match: {
          isActive: true,
          createdBy: userId   // ✅ user isolation
        }
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

    /* =========================
       2️⃣ Overall Statistics
    ========================== */

    const overall = await StudentOtherPayment.aggregate([
      {
        $match: {
          isActive: true,
          createdBy: userId   // ✅ user isolation
        }
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
        overall: overall[0] || {
          totalStudents: 0,
          totalPayments: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalDue: 0
        }
      }
    });

  } catch (error) {
    console.error("Error in getPaymentStatistics:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


module.exports = {
  getSingleOtherPaymentPDF,
  createOtherPayment,
  getAllOtherPayments,
  getSingleOtherPayment,
  updateOtherPayment,
  deleteOtherPayment,
  getStudentOtherPaymentList,
  getStudentOtherPayments,
  makePayment,
  getPaymentStatistics,
  sendOtherPayment
};