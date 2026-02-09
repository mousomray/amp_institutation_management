const { ZodError } = require("zod");
const { User } = require("../model/model.js");
const CourseModel = require("../model/course.model.js");
const StudentCourseModel = require("../model/studentCourse.model.js");
const StudentCourseSchema = require("../schema/StudentCourse.schema.js");
const mongoose = require("mongoose");

const enrollStudentToCourse = async (req, res) => {
  try {
    const userId = req.user.id; // logged-in user
    const { courseId } = req.params;
    const { studentId, enrollmentDate, discountAmount } = req.body;

    // 1️⃣ Validate studentId
    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }

    // 2️⃣ Fetch course
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // 3️⃣ Resolve total fees
    const totalFees = course.totalFees ?? course.fees ?? course.fee;
    if (!totalFees) {
      return res.status(400).json({ message: "Course fees not configured" });
    }

    // 4️⃣ Safe enrollmentDate parsing
    let safeEnrollmentDate = new Date();
    if (enrollmentDate) {
      const parsedDate = new Date(enrollmentDate);
      if (isNaN(parsedDate.valueOf())) {
        return res
          .status(400)
          .json({ message: "Invalid enrollmentDate format. Use yyyy-mm-dd" });
      }
      safeEnrollmentDate = parsedDate;
    }

    // 5️⃣ Create enrollment payload
    const payload = {
      userId,
      studentId,
      courseId,
      invoiceNo: `INV-${Date.now()}`,
      enrollmentDate: safeEnrollmentDate,
      totalFees,
      discountAmount: discountAmount || 0
    };

    // 6️⃣ Save to DB
    const enrollment = await StudentCourseModel.create(payload);

    res.status(201).json({
      message: "Student enrolled successfully",
      data: enrollment
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};



const getAllEnrollments = async (req, res) => {
  try {
    const userId = req.user.id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    const result = await StudentCourseModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
        },
      },

      /* ================= STUDENT ================= */
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },

      /* ================= SEARCH (Student Name) ================= */
      ...(search
        ? [
          {
            $match: {
              "student.name": {
                $regex: search,
                $options: "i", // case-insensitive
              },
            },
          },
        ]
        : []),

      /* ================= COURSE ================= */
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },

      /* ================= LEDGER SUMMARY ================= */
      {
        $lookup: {
          from: "studentfeesledgers",
          localField: "_id",
          foreignField: "enrollmentId",
          as: "ledger",
        },
      },
      {
        $unwind: {
          path: "$ledger",
          preserveNullAndEmptyArrays: true,
        },
      },

      /* ================= RECEIPTS ================= */
      {
        $lookup: {
          from: "receiptmasters",
          localField: "_id",
          foreignField: "enrollmentId",
          as: "receiptMasters",
        },
      },
      {
        $lookup: {
          from: "receiptdetails",
          let: { receiptIds: "$receiptMasters._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$receiptId", "$$receiptIds"],
                },
              },
            },
            {
              $lookup: {
                from: "feesmasters",
                localField: "feesMasterId",
                foreignField: "_id",
                as: "feesHead",
              },
            },
            { $unwind: "$feesHead" },
            {
              $project: {
                _id: 0,
                feesHeadName: "$feesHead.name",
                amount: 1,
              },
            },
          ],
          as: "receipts",
        },
      },

      /* ================= SORT ================= */
      { $sort: { entryDate: -1 } },

      /* ================= FACET (Pagination + Count) ================= */
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                invoiceNo: 1,
                enrollmentDate: 1,
                entryDate: 1,

                student: {
                  _id: "$student._id",
                  name: "$student.name",
                  email: "$student.email",
                  phone: "$student.phone",
                  image: "$student.image",
                },

                course: {
                  _id: "$course._id",
                  name: "$course.name",
                  duration: "$course.duration",
                  image: "$course.image",
                },

                ledgerSummary: {
                  _id: "$ledger._id",
                  totalAmount: "$ledger.totalAmount",
                  paidAmount: "$ledger.paidAmount",
                  dueAmount: "$ledger.dueAmount",
                  status: "$ledger.status",
                },

                receipts: 1,
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const enrollments = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    res.status(200).json({
      message: "All enrollments fetched successfully",
      pagination: {
        totalRecords: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
      data: enrollments,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};




const getStudentWiseEnrollments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { studentId } = req.params;

    const enrollments = await StudentCourseModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          studentId: new mongoose.Types.ObjectId(studentId),
        },
      },

      // 🔹 Join Course
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },

      // 🔹 Final Shape
      {
        $project: {
          invoiceNo: 1,
          enrollmentDate: 1,
          entryDate: 1,
          receiptMode: 1,
          amountPaid: 1,
          fees: 1,
          discount: 1,

          course: {
            _id: "$course._id",
            name: "$course.name",
            duration: "$course.duration",
            fees: "$course.fees",
            image: "$course.image",
          },
        },
      },

      { $sort: { entryDate: -1 } },
    ]);

    res.status(200).json({
      message: "Student wise enrollments fetched",
      total: enrollments.length,
      data: enrollments,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getCourseWiseEnrollments = async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId } = req.params;

    const enrollments = await StudentCourseModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          courseId: new mongoose.Types.ObjectId(courseId),
        },
      },

      // 🔹 Join Student
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },

      // 🔹 Final Shape
      {
        $project: {
          invoiceNo: 1,
          enrollmentDate: 1,
          entryDate: 1,
          receiptMode: 1,
          amountPaid: 1,
          fees: 1,
          discount: 1,

          student: {
            _id: "$student._id",
            name: "$student.name",
            email: "$student.email",
            phone: "$student.phone",
            image: "$student.image",
          },
        },
      },

      { $sort: { entryDate: -1 } },
    ]);

    res.status(200).json({
      message: "Course wise enrollments fetched",
      total: enrollments.length,
      data: enrollments,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { enrollStudentToCourse, getAllEnrollments, getStudentWiseEnrollments, getCourseWiseEnrollments };