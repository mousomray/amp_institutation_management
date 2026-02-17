const mongoose = require("mongoose");
const StudentFeesLedgerModel = require("../model/studentFeesLedger.model.js");
const ReceiptMasterModel = require("../model/receiptMaster.model.js");
const EnrollmentModel = require("../model/studentCourse.model.js");
const ReceiptDetailsModel = require("../model/receiptDetails.model.js");
const puppeteer = require("puppeteer-core");
const ejs = require("ejs");
const path = require("path");

const createStudentFees = async (req, res) => {
  try {
    const { enrollmentId, receiptMasterId } = req.body;

    // 🔹 Logged-in user
    const userId = req.user.id;

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

      {
        $match: {
          _id: new mongoose.Types.ObjectId(ledgerId)
        }
      },


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
        $lookup: {
          from: "studentinstallmentitems",
          localField: "_id",              // StudentFeesLedger._id
          foreignField: "studentFeesId",  // Installment.studentFeesId
          as: "installments"
        }
      },


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

const getSingleStudentFeesData = async (ledgerId) => {

  if (!mongoose.Types.ObjectId.isValid(ledgerId)) {
    throw new Error("Invalid ledger ID");
  }

  const data = await StudentFeesLedgerModel.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(ledgerId)
      }
    },

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
      $lookup: {
        from: "studentinstallmentitems",
        localField: "_id",
        foreignField: "studentFeesId",
        as: "installments"
      }
    },

    {
      $addFields: {
        installments: {
          $sortArray: {
            input: "$installments",
            sortBy: { dueDate: 1 }
          }
        }
      }
    }
  ]);

  if (!data.length) {
    throw new Error("Fees record not found");
  }

  return data[0];
};


const generateSingleStudentFeesPDF = async (req, res) => {
  try {
    const ledgerId = req.params.id;

    const reportData = await getSingleStudentFeesData(ledgerId);

    const chromePath = process.env.CHROME_PATH
    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: chromePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();

    const html = await ejs.renderFile(
      path.join(__dirname, "../views/singleStudentFeesReport.ejs"),
      { data: reportData }
    );

    await page.setContent(html, { waitUntil: "networkidle2" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,

      margin: {
        top: "110px",
        bottom: "70px",
        left: "20px",
        right: "20px"
      },

      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width:100%;font-family:Inter, Arial, sans-serif;font-size:12px;padding:12px 24px;border-bottom:1px solid #e6e6e6;display:flex;justify-content:space-between;align-items:center;height:100%;box-sizing:border-box;">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:56px;height:56px;border-radius:8px;background:linear-gradient(135deg,#4f46e5,#06b6d4);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700">IL</div>
            <div>
              <div style="font-size:16px;font-weight:700;color:#0f172a">Your Institute Name</div>
              <div style="font-size:12px;color:#6b7280">Student Fees Report</div>
            </div>
          </div>
          <div style="text-align:right;font-size:12px;color:#374151">
            <div>Date: ${new Date().toLocaleDateString()}</div>
            <div>Ledger ID: ${ledgerId}</div>
          </div>
        </div>
      `,
      footerTemplate: `
        <div style="width:100%;font-family:Inter, Arial, sans-serif;font-size:10px;padding:8px 24px;border-top:1px solid #e6e6e6;display:flex;justify-content:space-between;align-items:center;height:100%;box-sizing:border-box;">
          <div style="color:#6b7280">This is a system generated report — ${req.user?.email || ''}</div>
          <div style="color:#374151">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>
        </div>
      `,
      preferCSSPageSize: true
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=student-fees-${ledgerId}.pdf`
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error("Single Fees PDF Error:", error);
    res.status(500).json({ message: error.message });
  }
};


const getStudentFinancialReport = async (req, res) => {
  try {
    const userId = req.user._id;

    const {
      year,
      month,
      date,
      week,
      page = 1,
      search,
      course,
      paymentType
    } = req.query;

    const limit = 5;
    const skip = (Number(page) - 1) * limit;

    let startDate, endDate;

    /* ================= DATE FILTER ================= */

    if (date) {
      startDate = new Date(date);
      endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
    } else if (week) {
      const current = new Date(week);
      const firstDay = current.getDate() - current.getDay();
      startDate = new Date(current.setDate(firstDay));
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (year && month) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (year) {
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

    if (paymentType) {
      match.paymentType = paymentType.toUpperCase();
    }

    const pipeline = [
      { $match: match },

      /* ================= ENROLLMENT ================= */
      {
        $lookup: {
          from: "studentcourses",
          localField: "enrollmentId",
          foreignField: "_id",
          as: "enrollment"
        }
      },
      { $unwind: "$enrollment" },

      /* ================= STUDENT ================= */
      {
        $lookup: {
          from: "students",
          localField: "enrollment.studentId",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },

      ...(search
        ? [{
          $match: {
            "student.name": { $regex: search, $options: "i" }
          }
        }]
        : []),

      /* ================= COURSE ================= */
      {
        $lookup: {
          from: "courses",
          localField: "enrollment.courseId",
          foreignField: "_id",
          as: "course"
        }
      },
      { $unwind: "$course" },

      ...(course
        ? [{
          $match: {
            "course.name": { $regex: course, $options: "i" }
          }
        }]
        : []),

      /* ================= INSTALLMENTS ================= */
      {
        $lookup: {
          from: "studentinstallmentitems",
          localField: "_id",
          foreignField: "studentFeesId",
          as: "installments"
        }
      },

      /* ================= RECEIPT MASTER ================= */
      {
        $lookup: {
          from: "receiptmasters",
          localField: "receiptMasterId",
          foreignField: "_id",
          as: "receiptMaster"
        }
      },
      {
        $unwind: {
          path: "$receiptMaster",
          preserveNullAndEmptyArrays: true
        }
      },

      /* ================= RECEIPT DETAILS ================= */
      {
        $lookup: {
          from: "receiptdetails",
          localField: "receiptMaster._id",
          foreignField: "receiptId",
          as: "receiptDetails"
        }
      },

      /* ================= FEES MASTER ================= */
      {
        $lookup: {
          from: "feesmasters",
          localField: "receiptDetails.feesMasterId",
          foreignField: "_id",
          as: "feesMasters"
        }
      },

      { $sort: { createdAt: -1 } },

      {
        $facet: {

          /* ================= PAGINATED DATA ================= */
          paginatedData: [
            { $skip: skip },
            { $limit: limit }
          ],

          /* ================= ALL DATA (NO PAGINATION) ================= */
          allData: [],

          /* ================= SUMMARY ================= */
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

          /* ================= COURSE vs OTHER ================= */
          courseAndOtherSummary: [
            {
              $group: {
                _id: null,
                courseFeesTotal: {
                  $sum: {
                    $cond: [
                      { $eq: ["$paymentType", "INSTALLMENT"] },
                      "$totalAmount",
                      0
                    ]
                  }
                },
                otherFeesTotal: {
                  $sum: {
                    $cond: [
                      { $eq: ["$paymentType", "NORMAL"] },
                      "$totalAmount",
                      0
                    ]
                  }
                }
              }
            }
          ],

          /* ================= HEAD WISE TOTAL ================= */
          otherFeesHeadSummary: [
            { $match: { paymentType: "NORMAL" } },
            { $unwind: "$receiptDetails" },
            {
              $lookup: {
                from: "feesmasters",
                localField: "receiptDetails.feesMasterId",
                foreignField: "_id",
                as: "feesMaster"
              }
            },
            { $unwind: "$feesMaster" },
            {
              $group: {
                _id: "$feesMaster.name",
                totalAmount: { $sum: "$receiptDetails.amount" }
              }
            },
            {
              $project: {
                _id: 0,
                feesHeadName: "$_id",
                totalAmount: 1
              }
            }
          ],

          totalCount: [{ $count: "count" }]
        }
      }
    ];

    const result = await StudentFeesLedgerModel.aggregate(pipeline);

    const total = result[0]?.totalCount[0]?.count || 0;

    res.json({
      success: true,

      summary: result[0]?.summary[0] || {},

      breakdown: result[0]?.courseAndOtherSummary[0] || {},

      otherFeesHeadSummary: result[0]?.otherFeesHeadSummary || [],

      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        perPage: limit
      },

      paginatedData: result[0]?.paginatedData || [],

      allData: result[0]?.allData || []
    });
  } catch (error) {
    console.error("Report Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// studentFinancialReport.service.js বা controller file এ
const getFinancialDataForPDF = async (req) => {
  const userId = req.user._id;

  const { year, month, date, week, search, course, paymentType } = req.query;

  let startDate, endDate;

  // ================= DATE FILTER =================
  if (date) {
    startDate = new Date(date);
    endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
  } else if (week) {
    const current = new Date(week);
    const firstDay = current.getDate() - current.getDay();
    startDate = new Date(current.setDate(firstDay));
    startDate.setHours(0, 0, 0, 0);

    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else if (year && month) {
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (year) {
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

  if (paymentType) {
    match.paymentType = paymentType.toUpperCase();
  }

  // ================= AGGREGATION PIPELINE =================
  const pipeline = [
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

    ...(search
      ? [{ $match: { "student.name": { $regex: search, $options: "i" } } }]
      : []),

    {
      $lookup: {
        from: "courses",
        localField: "enrollment.courseId",
        foreignField: "_id",
        as: "course"
      }
    },
    { $unwind: "$course" },

    ...(course
      ? [{ $match: { "course.name": { $regex: course, $options: "i" } } }]
      : []),

    {
      $lookup: {
        from: "studentinstallmentitems",
        localField: "_id",
        foreignField: "studentFeesId",
        as: "installments"
      }
    },

    {
      $lookup: {
        from: "receiptmasters",
        localField: "receiptMasterId",
        foreignField: "_id",
        as: "receiptMaster"
      }
    },
    {
      $unwind: { path: "$receiptMaster", preserveNullAndEmptyArrays: true }
    },

    {
      $lookup: {
        from: "receiptdetails",
        localField: "receiptMaster._id",
        foreignField: "receiptId",
        as: "receiptDetails"
      }
    },

    {
      $lookup: {
        from: "feesmasters",
        localField: "receiptDetails.feesMasterId",
        foreignField: "_id",
        as: "feesMasters"
      }
    },

    { $sort: { createdAt: -1 } },

    {
      $facet: {
        // ================= SUMMARY =================
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

        // ================= COURSE vs OTHER =================
        courseAndOtherSummary: [
          {
            $group: {
              _id: null,
              courseFeesTotal: {
                $sum: {
                  $cond: [{ $eq: ["$paymentType", "INSTALLMENT"] }, "$totalAmount", 0]
                }
              },
              otherFeesTotal: {
                $sum: {
                  $cond: [{ $eq: ["$paymentType", "NORMAL"] }, "$totalAmount", 0]
                }
              }
            }
          }
        ],

        // ================= HEAD WISE TOTAL =================
        otherFeesHeadSummary: [
          { $match: { paymentType: "NORMAL" } },
          { $unwind: "$receiptDetails" },
          {
            $lookup: {
              from: "feesmasters",
              localField: "receiptDetails.feesMasterId",
              foreignField: "_id",
              as: "feesMaster"
            }
          },
          { $unwind: "$feesMaster" },
          {
            $group: {
              _id: "$feesMaster.name",
              totalAmount: { $sum: "$receiptDetails.amount" }
            }
          },
          { $project: { _id: 0, feesHeadName: "$_id", totalAmount: 1 } }
        ],

        allData: [{ $match: {} }] // সব record for PDF
      }
    }
  ];

  const result = await StudentFeesLedgerModel.aggregate(pipeline);

  return {
    summary: result[0]?.summary[0] || {},
    breakdown: result[0]?.courseAndOtherSummary[0] || {},
    otherFeesHeadSummary: result[0]?.otherFeesHeadSummary || [],
    allData: result[0]?.allData || []
  };
};


const generateStudentFinancialPDF = async (req, res) => {
  try {
    const reportData = await getFinancialDataForPDF(req);
    const chromePath = process.env.CHROME_PATH
    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: chromePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    const html = await ejs.renderFile(
      path.join(__dirname, "../views/studentFinancialReport.ejs"),
      { data: reportData }
    );
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "100px", bottom: "80px", left: "20px", right: "20px" },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width:100%;font-family:Inter, Arial, sans-serif;font-size:12px;padding:12px 20px;border-bottom:1px solid #e6e6e6;display:flex;justify-content:space-between;align-items:center;height:100%;box-sizing:border-box;">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:44px;height:44px;border-radius:8px;background:linear-gradient(135deg,#4f46e5,#06b6d4);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700">IL</div>
            <div>
              <div style="font-size:14px;font-weight:700;color:#0f172a">My Institute Name</div>
              <div style="font-size:11px;color:#6b7280">Student Financial Report</div>
            </div>
          </div>
          <div style="text-align:right;font-size:12px;color:#374151">
            <div>${req.user?.email || ''}</div>
            <div>${new Date().toLocaleDateString()}</div>
          </div>
        </div>
      `,
      footerTemplate: `
        <div style="width:100%;font-family:Inter, Arial, sans-serif;font-size:10px;padding:8px 20px;border-top:1px solid #e6e6e6;display:flex;justify-content:space-between;align-items:center;height:100%;box-sizing:border-box;">
          <div style="color:#6b7280">Generated by My Institute</div>
          <div style="color:#374151">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>
        </div>
      `,
      preferCSSPageSize: true
    });
    await browser.close();
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=student-financial-report.pdf"
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF Generation Error:", error);
    res.status(500).json({ message: error.message });
  }
};


module.exports = { createStudentFees, getAllStudentFees, getSingleStudentFees, getStudentFinancialReport, generateStudentFinancialPDF, generateSingleStudentFeesPDF };
