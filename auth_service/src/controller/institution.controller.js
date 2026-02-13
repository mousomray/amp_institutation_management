const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { User, Institution, StudentFeeItems, StudentFeePayment, StudentInstallmentItem } = require("../model/model.js");
const { AdminLoginSchema, CourseSchema, StudentSchema, EditStudentSchema, FeesMasterSchema, EditFeesMasterSchema } = require("../schema/Schema.js");
const uploadSingleImage = require("../helper/upload.js")
const { passwordGenerator } = require("../helper/PasswordGenerator.js")
const CourseModel = require("../model/course.model.js")
const StudentModel = require("../model/student.model.js")
const mongoose = require("mongoose");
const StudentFees = require("../model/studentFeesLedger.model.js");
const StudentCourse = require("../model/studentCourse.model.js");

const loginInstitution = async (req, res) => {
  try {

    const parsedData = AdminLoginSchema.parse(req.body);


    const institution = await User.findOne({
      email: parsedData.email,
      role: "institution",
    });
    console.log("inst", institution)

    if (!institution) {
      return res.status(404).json({ message: "Institution not found" });
    }


    console.log("password", institution.password)

    if (parsedData.password !== institution.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }



    const token = jwt.sign(
      {
        userId: institution._id,
        role: institution.role,
        email: institution.email,
      },
      process.env.TOKEN_SECRET,
      { expiresIn: "1d" }
    );

    // Set cookie
    res.cookie("institution-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return res.status(200).json({
      message: "Institution login successful",
      token,
      institution: {
        id: institution._id,
        email: institution.email,
        role: institution.role,
      },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors,
      });
    }

    console.error("Institution login error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

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

    const imageUrl = await uploadSingleImage(req.file);


    const course = await Course.create({
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
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(409).json({
        message: "Email already in use",
      });
    }

    if (error.name === "ZodError") {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors,
      });
    }

    console.error("Create student error:", error);
    return res.status(500).json({
      message: "Internal server error",
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
    console.log("==>", institutionUser);

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


    const courses = await Course.aggregate([
      {
        $match: {
          institution: institution._id,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
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
            _id: 1,
            name: 1,
            email: 1,
          },
        },
      },
    ]);

    return res.status(200).json({
      message: "My courses fetched successfully",
      data: courses,
      total: courses.length,
    });
  } catch (error) {
    console.error("Get my courses error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


const createStudent = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ✅ Parse body
    const parsedData = StudentSchema.parse(req.body);

    const userId = req.user?._id;
    if (!userId) {
      await session.abortTransaction();
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ✅ Validate institution user
    const institutionUser = await User.findById(userId).session(session);
    if (!institutionUser || institutionUser.role !== "institution") {
      await session.abortTransaction();
      return res.status(403).json({ message: "Only institutions can create students" });
    }

    const institution = await Institution.findOne({
      adminUser: institutionUser._id,
    }).session(session);

    if (!institution) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Institution not found" });
    }

    // ✅ Validate files
    if (!req.files?.image || !req.files?.signature) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Image and signature are required" });
    }

    // ✅ Check email
    const emailExists = await User.findOne({ email: parsedData.email }).session(session);
    if (emailExists) {
      await session.abortTransaction();
      return res.status(409).json({ message: "Email already exists" });
    }

    // ✅ Upload files
    const photoUrl = await uploadSingleImage(req.files.image[0]);
    const signatureUrl = await uploadSingleImage(req.files.signature[0]);

    const plainPassword = passwordGenerator();

    // ✅ Create user
    const [user] = await User.create(
      [
        {
          email: parsedData.email,
          password: plainPassword,
          role: "student",
        },
      ],
      { session }
    );

    // ✅ Create student
    const [student] = await Student.create(
      [
        {
          studentId: parsedData.studentId,
          name: parsedData.name,
          phone: parsedData.phone,
          fatherName: parsedData.fatherName,
          bloodGroup: parsedData.bloodGroup,
          admissionDate: parsedData.admissionDate || null,
          dob: parsedData.dob || null,
          institution: institution._id,
          photo: photoUrl,
          signature: signatureUrl,
          user: user._id,
          email: parsedData.email,
        },
      ],
      { session }
    );

    // ✅ Link user → student
    await User.findByIdAndUpdate(
      user._id,
      { student: student._id },
      { session }
    );

    // =====================================================
    // ✅ MULTIPLE COURSE LINKING (FIXED & SAFE)
    // =====================================================
    if (parsedData.courseId?.length) {
      const courses = await Course.find({
        _id: { $in: parsedData.courseId },
      }).session(session);
      console.log("courses==>", courses.length, parsedData.courseId.length);
      console.log("courses==>", courses, parsedData.courseId);

      if (courses.length !== parsedData.courseId.length) {
        await session.abortTransaction();
        return res.status(404).json({ message: "One or more courses not found" });
      }

      // ✅ Add courses to student
      await Student.findByIdAndUpdate(
        student._id,
        {
          $addToSet: {
            courses: { $each: courses.map((c) => c._id) },
          },
        },
        { session }
      );

      // ✅ Add student to courses
      await Course.updateMany(
        { _id: { $in: courses.map((c) => c._id) } },
        { $addToSet: { students: student._id } },
        { session }
      );
    }

    // ✅ Commit
    await session.commitTransaction();

    return res.status(201).json({
      message: "Student created successfully",
      student,
      credentials: {
        email: parsedData.email,
        password: plainPassword,
      },
    });

  } catch (error) {
    console.error(error);
    await session.abortTransaction();
    return res.status(500).json({
      message: error?.message || "Internal server error",
    });
  } finally {
    session.endSession();
  }
};


const getMyStudents = async (req, res) => {
  try {
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
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const result = await Student.aggregate([

      {
        $match: {
          institution: institution._id,
        }
      },

      {
        $sort: { createdAt: -1 },
      },

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
          studentId: 1,
          name: 1,
          email: 1,
          phone: 1,
          dob: 1,
          fatherName: 1,
          bloodGroup: 1,
          admissionDate: 1,
          photo: 1,
          signature: 1,
          createdAt: 1,
          courses: 1,
          institution: {
            _id: 1,
            name: 1,
            email: 1,
          },
        },
      },

      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ])

    const stunents = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    return res.status(200).json({
      message: "My Stunents fetched successfully",
      data: stunents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error("Get my courses error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

const StudentDropDown = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const institutionUser = await User.findById(userId);
    if (!institutionUser || institutionUser.role !== "institution") {
      return res.status(403).json({ message: "Only institutions can access this resource" });
    }

    const institution = await Institution.findOne({ adminUser: institutionUser._id });
    if (!institution) {
      return res.status(404).json({ message: "Institution not found" });
    }

    const data = await Student.find({ institution: institution._id });
    return res.status(200).json({ message: "All students fetched successfully", data });
  } catch (error) {
    console.error("Get all students error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

const updateStudent = async (req, res) => {
  try {
    const studentId = req.params.id;

    const parsedData = EditStudentSchema.parse(req.body);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const existingStudent = await Student.findById(studentId).session(session);
      if (!existingStudent) {
        await session.abortTransaction();
        return res.status(404).json({ message: "Student not found" });
      }

      const oldCourses = existingStudent.courses.map(id => id.toString());
      const newCourses = parsedData.courseId || [];


      const coursesToAdd = newCourses.filter(id => !oldCourses.includes(id));
      const coursesToRemove = oldCourses.filter(id => !newCourses.includes(id));


      const updatedStudent = await Student.findByIdAndUpdate(
        studentId,
        {
          studentId: parsedData.studentId,
          name: parsedData.name,
          email: parsedData.email,
          phone: parsedData.phone,
          dob: parsedData.dob,
          fatherName: parsedData.fatherName,
          bloodGroup: parsedData.bloodGroup,
          admissionDate: parsedData.admissionDate,
          courses: newCourses,
        },
        { new: true, session }
      );

      // ➕ Add student to new courses
      if (coursesToAdd.length) {
        await Course.updateMany(
          { _id: { $in: coursesToAdd } },
          { $addToSet: { students: studentId } },
          { session }
        );
      }

      // ➖ Remove student from removed courses
      if (coursesToRemove.length) {
        await Course.updateMany(
          { _id: { $in: coursesToRemove } },
          { $pull: { students: studentId } },
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        message: "Student updated successfully",
        student: updatedStudent,
      });

    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }

  } catch (error) {
    if (error.name === "ZodError") {
      console.log(error)
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors,
      });
    }

    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


const deleteStudent = async (req, res) => {
  try {
    const institutionId = req.user._id
    if (!institutionId) {
      return res.status(403).json({ message: "Only institution can delete students" });
    }
    const isinstitution = await User.findById(institutionId);
    if (!isinstitution || isinstitution.role !== "institution") {
      return res.status(403).json({ message: "Only institution can delete students" });
    }

    const studentId = req.params.id
    const student = await Student.findById(studentId)
    if (!student) {
      return res.status(404).json({ message: "Student user not found" })
    }
    const deleteStudent = await Student.findByIdAndDelete(student._id)
    await User.findByIdAndDelete(student.user._id)

    if (!deleteStudent) {
      return res.status(404).json({ message: "Student user not found" });

    }

    return res.status(200).json({ message: "Student deleted successfully", deleteStudent })
  } catch (error) {
    return res.status(500).json({ message: "Error deleting institution", error });
  }
}

const studentDetails = async (req, res) => {
  try {
    const studentId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Invalid student id" });
    }

    const result = await Student.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(studentId) },
      },


      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },


      {
        $lookup: {
          from: "courses",
          localField: "courses",
          foreignField: "_id",
          as: "courses",
        },
      },

      {
        $addFields: {
          totalCourses: { $size: "$courses" },
        },
      },

      {
        $project: {
          _id: 0,
          student: {
            _id: "$_id",
            studentId: "$studentId",
            name: "$name",
            email: "$email",
            phone: "$phone",
            dob: "$dob",
            fatherName: "$fatherName",
            bloodGroup: "$bloodGroup",
            admissionDate: "$admissionDate",
            photo: "$photo",
            signature: "$signature",
            // ✅ NOW IT WILL SHOW
            userPassword: "$user.password",
            role: "$user.role",

            totalCourses: "$totalCourses",

            courses: {
              $map: {
                input: "$courses",
                as: "course",
                in: {
                  _id: "$$course._id",
                  name: "$$course.name",
                  duration: "$$course.duration",
                  fee: "$$course.fee",
                },
              },
            },
          },
        },
      },
    ]);

    if (!result.length) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json(result[0]);
  } catch (err) {
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
    const course = await Course.findByIdAndUpdate(courseId, {
      name: parsedData.name,
      duration: parsedData.duration,
      fee: Number(parsedData.fee),
      description: parsedData.description
    })

    return res.status(200).json({
      message: "Course updated successfully",
      course,
    });

  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors,
      });
    }

    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });

  }
}

const deleteCoures = async (req, res) => {
  try {
    const courseId = req.params.id;

    if (!courseId) {
      return res.status(400).json({
        message: "Course id is required"
      });
    }

    // 1️⃣ Find course
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found"
      });
    }

    // 2️⃣ Check student enrollment
    if (course.students && course.students.length > 0) {
      return res.status(400).json({
        message:
          "You can't delete this course because students are enrolled in this course"
      });
    }

    // 3️⃣ Safe delete
    await Course.findByIdAndDelete(courseId);

    return res.status(200).json({
      message: "Course deleted successfully"
    });

  } catch (error) {
    console.error("Delete course error:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};


const courseDetails = async (req, res) => {
  try {
    const courseId = req.params.id;

    if (!courseId) {
      return res.status(400).json({ message: "Course ID is required" });
    }

    const result = await Course.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(courseId) },
      },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "courses",
          as: "students",
        },
      },
      {
        $addFields: {
          totalStudents: { $size: "$students" },
        },
      },
    ]);

    if (!result.length) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json({
      message: "Course details fetched successfully",
      data: result[0],
    });
  } catch (err) {
    console.log("-->", err)
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};


const resentCourse = async (req, res) => {
  const institutionUser = req.user._id
  const institutionId = req.user._id
  if (!institutionId) {
    return res.status(403).json({ message: "Only institution can delete students" });
  }
  const isinstitution = await User.findById(institutionId);
  if (!isinstitution || isinstitution.role !== "institution") {
    return res.status(403).json({ message: "Only institution can delete students" });
  }
}


const institutionDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // 🔐 Check user
    const institutionUser = await User.findById(userId);
    if (!institutionUser || institutionUser.role !== "institution") {
      return res.status(403).json({
        message: "Only institution can access dashboard",
      });
    }

    // ✅ Get Institution by adminUser
    const institution = await Institution.findOne({
      adminUser: institutionUser._id,
    });

    if (!institution) {
      return res.status(404).json({
        message: "Institution not found",
      });
    }

    const institutionId = institution._id;

    // 📘 COURSES
    const courseData = await CourseModel.aggregate([
      {
        $match: {
          institution: new mongoose.Types.ObjectId(institutionId),
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          allCourses: [
            {
              $project: {
                _id: 1,
                name: 1,
                duration: 1,
                fee: 1,
                createdAt: 1,
              },
            },
          ],
          recentCourses: [
            { $limit: 5 },
            {
              $project: {
                _id: 1,
                name: 1,
                duration: 1,
                fee: 1,
                createdAt: 1,
              },
            },
          ],
          totalCourses: [{ $count: "count" }],
        },
      },
    ]);

    // 🎓 STUDENTS
    const studentData = await StudentModel.aggregate([
      {
        $match: {
          institution: new mongoose.Types.ObjectId(institutionId),
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          allStudents: [
            {
              $project: {
                _id: 1,
                studentId: 1,
                name: 1,
                email: 1,
                phone: 1,
                admissionDate: 1,
              },
            },
          ],
          recentStudents: [
            { $limit: 5 },
            {
              $project: {
                _id: 1,
                studentId: 1,
                name: 1,
                email: 1,
                phone: 1,
                admissionDate: 1,
              },
            },
          ],
          totalStudents: [{ $count: "count" }],
        },
      },
    ]);

    res.status(200).json({
      message: "Institution dashboard data fetched successfully",
      data: {
        totalCourses: courseData[0]?.totalCourses[0]?.count || 0,
        totalStudents: studentData[0]?.totalStudents[0]?.count || 0,

        recentCourses: courseData[0]?.recentCourses || [],
        recentStudents: studentData[0]?.recentStudents || [],

        //allCourses: courseData[0]?.allCourses || [],
        //allStudents: studentData[0]?.allStudents || [],
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};



const institutionLogOut = async (req, res) => {
  try {
    const institutionUser = req.user?._id;

    if (!institutionUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const institution = await User.findById(institutionUser);
    if (!institution || institution.role !== "institution") {
      return res.status(403).json({ message: "Only institution can logout" });
    }


    res.clearCookie("institution-token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      message: "institution logged out successfully",
    });

  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const buyCourse = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({
        message: "studentId and courseId are required",
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // ❌ Prevent duplicate enrollment
    if (student.courses.includes(courseId)) {
      return res.status(409).json({
        message: "Student already enrolled in this course",
      });
    }


    student.courses.push(courseId);


    course.students.push(studentId);

    await student.save();
    await course.save();

    return res.status(200).json({
      message: "Course purchased successfully",
      course: {
        id: course._id,
        totalStudents: course.students.length,
      },
    });
  } catch (error) {
    console.error("Buy course error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const OnlyOneStudentAPI = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await StudentModel.findById(id);
    return res.status(200).json({ message: "Single Student Fetched Successfully", data });
  } catch (error) {
    console.error("Get single student error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Handle Fees Master related operations here

const AddFeesMasterAPI = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.id;

    // 1️⃣ Create Fees Master
    const feesMaster = await FeesMaster.create(
      [
        {
          ...req.body,
          userId,
          isActive: true
        }
      ],
      { session }
    );

    const newMasterFee = feesMaster[0];

    // 2️⃣ Find all student fees of this user
    const studentFeesList = await StudentFees.find({ userId }).session(session);

    if (studentFeesList.length) {
      // 3️⃣ Prepare fee items for all students
      const feeItems = studentFeesList.map(sf => ({
        studentFeesId: sf._id,
        feeType: "MASTER",
        feeMasterId: newMasterFee._id,
        amount: newMasterFee.amount
      }));

      // 4️⃣ Insert fee items
      await StudentFeeItems.insertMany(feeItems, { session });

      // 5️⃣ Update student fees total & due
      const bulkUpdates = studentFeesList.map(sf => ({
        updateOne: {
          filter: { _id: sf._id },
          update: {
            $inc: {
              totalAmount: newMasterFee.amount,
              dueAmount: newMasterFee.amount
            },
            $set: { status: "DUE" }
          }
        }
      }));

      await StudentFees.bulkWrite(bulkUpdates, { session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Fees master created & applied to all students successfully",
      data: newMasterFee
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Add fees master error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


const GetAllFeesMasterAPI = async (req, res) => {
  try {
    const userId = req.user.id;

    const feesList = await FeesMaster.find({ userId })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Fees master list fetched successfully",
      data: feesList
    });
  } catch (error) {
    console.error("Get fees master list error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const GetSingleFeesMasterAPI = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const fee = await FeesMaster.findOne({
      _id: id,
      userId
    });

    if (!fee) {
      return res.status(404).json({
        message: "Fees master not found or unauthorized"
      });
    }

    return res.status(200).json({
      message: "Fees master fetched successfully",
      data: fee
    });
  } catch (error) {
    console.error("Get single fees master error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const UpdateFeesMasterAPI = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const updatedFee = await FeesMaster.findOneAndUpdate(
      { _id: id, userId },
      req.body,
      { new: true }
    );

    if (!updatedFee) {
      return res.status(404).json({
        message: "Fees master not found or unauthorized"
      });
    }

    return res.status(200).json({
      message: "Fees master updated successfully",
      data: updatedFee
    });
  } catch (error) {
    console.error("Update fees master error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const DeleteFeesMasterAPI = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;


    const feeMaster = await FeesMaster.findOne({
      _id: id,
      userId
    });

    if (!feeMaster) {
      return res.status(404).json({
        message: "Fees master not found or unauthorized"
      });
    }


    const isUsed = await StudentFeeItems.exists({
      feeMasterId: id
    });

    if (isUsed) {
      return res.status(400).json({
        message:
          "This fees master is already used in student fees. Cannot delete."
      });
    }

    // 3️⃣ Safe to delete
    await FeesMaster.deleteOne({
      _id: id,
      userId
    });

    return res.status(200).json({
      message: "Fees master deleted successfully"
    });

  } catch (error) {
    console.error("Delete fees master error:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};


// Student Fees API Implimentation area 
const assignStudentFees = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { studentId } = req.body;
    const userId = req.user.id;

    // 1️⃣ Student + Courses
    const studentData = await Student.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(studentId) }
      },
      {
        $lookup: {
          from: "courses",
          localField: "courses",
          foreignField: "_id",
          as: "courses"
        }
      }
    ]);

    if (!studentData.length) {
      return res.status(404).json({ message: "Student not found" });
    }

    const student = studentData[0];

    if (!student.courses.length) {
      return res.status(400).json({
        message: "Student has no assigned courses"
      });
    }

    // 2️⃣ Active master fees
    const masterFees = await FeesMaster.find({
      isActive: true,
      userId
    }).session(session);

    // 3️⃣ Check existing StudentFees
    let studentFees = await StudentFees.findOne({
      studentId,
      userId
    }).session(session);

    // 👉 CASE 1: FIRST TIME ASSIGN
    if (!studentFees) {
      let totalAmount = 0;
      const feeItems = [];

      // Courses
      student.courses.forEach(course => {
        totalAmount += course.fee;
        feeItems.push({
          feeType: "COURSE",
          courseId: course._id,
          amount: course.fee
        });
      });

      // Master fees
      masterFees.forEach(fee => {
        totalAmount += fee.amount;
        feeItems.push({
          feeType: "MASTER",
          feeMasterId: fee._id,
          amount: fee.amount
        });
      });

      studentFees = await StudentFees.create(
        [{
          studentId,
          totalAmount,
          paidAmount: 0,
          dueAmount: totalAmount,
          status: "DUE",
          userId
        }],
        { session }
      );

      const finalItems = feeItems.map(item => ({
        ...item,
        studentFeesId: studentFees[0]._id
      }));

      await StudentFeeItems.insertMany(finalItems, { session });

      await session.commitTransaction();
      session.endSession();

      return res.status(201).json({
        message: "Student fees assigned successfully",
        data: studentFees[0]
      });
    }

    // 👉 CASE 2: UPDATE EXISTING FEES
    const existingItems = await StudentFeeItems.find({
      studentFeesId: studentFees._id
    }).session(session);

    const existingCourseIds = existingItems
      .filter(i => i.courseId)
      .map(i => i.courseId.toString());

    const existingMasterIds = existingItems
      .filter(i => i.feeMasterId)
      .map(i => i.feeMasterId.toString());

    let addedAmount = 0;
    const newItems = [];

    // 🟢 New courses
    student.courses.forEach(course => {
      if (!existingCourseIds.includes(course._id.toString())) {
        addedAmount += course.fee;
        newItems.push({
          feeType: "COURSE",
          courseId: course._id,
          amount: course.fee,
          studentFeesId: studentFees._id
        });
      }
    });

    // 🟢 New master fees
    masterFees.forEach(fee => {
      if (!existingMasterIds.includes(fee._id.toString())) {
        addedAmount += fee.amount;
        newItems.push({
          feeType: "MASTER",
          feeMasterId: fee._id,
          amount: fee.amount,
          studentFeesId: studentFees._id
        });
      }
    });

    if (newItems.length) {
      await StudentFeeItems.insertMany(newItems, { session });

      await StudentFees.updateOne(
        { _id: studentFees._id },
        {
          $inc: {
            totalAmount: addedAmount,
            dueAmount: addedAmount
          },
          $set: { status: "DUE" }
        },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "Student fees updated successfully",
      addedAmount,
      addedItems: newItems.length
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};


const listStudentFees = async (req, res) => {
  try {
    const userId = req.user.id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const result = await StudentFees.aggregate([
      /* 1️⃣ Match user */
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId)
        }
      },

      /* 2️⃣ Student */
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },

      /* 3️⃣ Fee Items */
      {
        $lookup: {
          from: "studentfeeitems",
          localField: "_id",
          foreignField: "studentFeesId",
          as: "feeItems"
        }
      },

      /* 4️⃣ Courses */
      {
        $lookup: {
          from: "courses",
          localField: "feeItems.courseId",
          foreignField: "_id",
          as: "coursesData"
        }
      },

      /* 5️⃣ Master Fees */
      {
        $lookup: {
          from: "feesmasters",
          localField: "feeItems.feeMasterId",
          foreignField: "_id",
          as: "masterFeesData"
        }
      },

      /* 6️⃣ Build clean structure */
      {
        $addFields: {
          courses: {
            $map: {
              input: {
                $filter: {
                  input: "$feeItems",
                  as: "item",
                  cond: { $eq: ["$$item.feeType", "COURSE"] }
                }
              },
              as: "c",
              in: {
                name: {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: {
                          $filter: {
                            input: "$coursesData",
                            as: "cd",
                            cond: { $eq: ["$$cd._id", "$$c.courseId"] }
                          }
                        },
                        as: "x",
                        in: "$$x.name"
                      }
                    },
                    0
                  ]
                },
                amount: "$$c.amount"
              }
            }
          },

          masterFees: {
            $map: {
              input: {
                $filter: {
                  input: "$feeItems",
                  as: "item",
                  cond: { $eq: ["$$item.feeType", "MASTER"] }
                }
              },
              as: "m",
              in: {
                name: {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: {
                          $filter: {
                            input: "$masterFeesData",
                            as: "mf",
                            cond: { $eq: ["$$mf._id", "$$m.feeMasterId"] }
                          }
                        },
                        as: "y",
                        in: "$$y.name"
                      }
                    },
                    0
                  ]
                },
                amount: "$$m.amount"
              }
            }
          }
        }
      },

      /* 7️⃣ Project */
      {
        $project: {
          _id: 0,
          studentFeesId: "$_id",
          student: {
            name: "$student.name", email: "$student.email",
            photo: "$student.photo"
          },
          paymentType: 1,
          totalAmount: 1,
          paidAmount: 1,
          dueAmount: 1,
          status: 1,
          courses: 1,
          masterFees: 1
        }
      },

      /* 8️⃣ Pagination + Count */
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit }
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ]);

    const data = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    res.status(200).json({
      message: "Student fees list fetched",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};



const getSingleStudentFees = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; // ledger _id

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID"
      });
    }

    const data = await StudentFeesLedgerModel.aggregate([
      /* 1️⃣ Match */
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          userId: new mongoose.Types.ObjectId(userId)
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

      /* 3️⃣ Course */
      {
        $lookup: {
          from: "courses",
          localField: "enrollment.courseId",
          foreignField: "_id",
          as: "course"
        }
      },
      { $unwind: "$course" },

      /* 4️⃣ Student */
      {
        $lookup: {
          from: "students",
          localField: "enrollment.studentId",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },

      /* 5️⃣ Receipt Master */
      {
        $lookup: {
          from: "receiptmasters",
          localField: "receiptMasterId",
          foreignField: "_id",
          as: "receiptMaster"
        }
      },
      { $unwind: "$receiptMaster" },

      /* 6️⃣ Receipt Details */
      {
        $lookup: {
          from: "receiptdetails",
          localField: "receiptMaster._id",
          foreignField: "receiptId",
          as: "receiptDetails"
        }
      },

      /* 7️⃣ Fees Heads */
      {
        $lookup: {
          from: "feesmasters",
          localField: "receiptDetails.feesMasterId",
          foreignField: "_id",
          as: "feesMasters"
        }
      },

      /* 8️⃣ Payments */
      {
        $lookup: {
          from: "studentfeepayments",
          localField: "_id",
          foreignField: "studentFeesLedgerId",
          as: "payments"
        }
      },

      /* 9️⃣ Installments */
      {
        $lookup: {
          from: "studentinstallmentitems",
          localField: "_id",
          foreignField: "studentFeesLedgerId",
          as: "installments"
        }
      },

      /* 🔟 Build payment view */
      {
        $addFields: {
          paymentDetails: {
            $map: {
              input: "$payments",
              as: "p",
              in: {
                amount: "$$p.amount",
                paymentMode: "$$p.paymentMode",
                instrumentId: "$$p.instrumentId",
                paymentDate: "$$p.createdAt",

                installmentInfo: {
                  $cond: {
                    if: { $eq: ["$paymentType", "INSTALLMENT"] },
                    then: {
                      installmentNo: "$$p.installmentNo",
                      installmentItemId: "$$p.installmentItemId"
                    },
                    else: null
                  }
                }
              }
            }
          }
        }
      },

      /* 🔚 Final projection */
      {
        $project: {
          ledgerId: "$_id",

          student: {
            _id: "$student._id",
            name: "$student.name"
          },

          course: {
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

          paymentType: 1,
          paymentDetails: 1,

          summary: {
            totalAmount: "$totalAmount",
            paidAmount: "$paidAmount",
            dueAmount: "$dueAmount",
            status: "$status"
          },

          createdAt: 1,
          updatedAt: 1
        }
      }
    ]);

    if (!data.length) {
      return res.status(404).json({
        success: false,
        message: "Student fees not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: data[0]
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Pay Student Fees
const payStudentFees = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { studentFeesId } = req.params;
    let { amount, paymentMode, instrumentId } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    const fees = await StudentFees.findById(studentFeesId).session(session);

    if (!fees) {
      return res.status(404).json({ message: "Fees record not found" });
    }

    const enrollment = await StudentCourse.findById(fees.enrollmentId)
    console.log("Enrollment:", enrollment);
    if (!enrollment) {
      return res.status(404).json({
        message: "Enrollment record not found"
      });
    }

    const studentId = enrollment.studentId;

    if (!paymentMode) {
      return res.status(400).json({ message: "Payment mode is required" });
    }

    const nonCashModes = ["UPI", "BANK", "CARD", "CHEQUE"];

    if (nonCashModes.includes(paymentMode)) {
      if (!instrumentId) {
        return res.status(400).json({
          message: `${paymentMode} payment requires instrumentId`
        });
      }
    } else if (paymentMode === "CASH") {
      instrumentId = null;
    } else {
      return res.status(400).json({
        message: "Invalid payment mode"
      });
    }

    if (amount > fees.dueAmount) {
      return res.status(400).json({
        message: "Payment process is already running through Installment"
      });
    }

    const payment = await StudentFeePayment.create(
      [
        {
          studentFeesId: fees._id,
          enrollmentId: fees.enrollmentId,
          studentId: studentId,
          amount,
          paymentMode,
          userId,
          instrumentId:
            nonCashModes.includes(paymentMode) ? instrumentId : null
        }
      ],
      { session }
    );

    fees.paidAmount += amount;
    fees.dueAmount -= amount;

    fees.status = fees.dueAmount === 0 ? "PAID" : "PARTIAL";

    await fees.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "Payment recorded successfully",
      data: {
        paymentId: payment[0]._id,
        studentFeesId: fees._id,
        enrollmentId: fees.enrollmentId,
        studentId: studentId,
        paidAmount: amount,
        paymentMode,
        updatedSummary: {
          totalAmount: fees.totalAmount,
          paidAmount: fees.paidAmount,
          dueAmount: fees.dueAmount,
          status: fees.status
        }
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};


// Installments Handle Area 
const normalizeDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getInstallmentPreview = async (req, res) => {
  try {
    const { studentFeesId } = req.params;
    const userId = req.user.id;

    const {
      installmentCount,
      monthsGap,
      firstInstallmentAmount,
      startDate
    } = req.body;

    /* ----------------------------------------
       0️⃣ BASIC VALIDATION
    ---------------------------------------- */
    if (
      !installmentCount || installmentCount <= 1 ||
      !monthsGap || monthsGap <= 0 ||
      !firstInstallmentAmount || firstInstallmentAmount <= 0 ||
      !startDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid installment input"
      });
    }

    /* ----------------------------------------
       1️⃣ FETCH STUDENT FEES / LEDGER
    ---------------------------------------- */
    const studentFees = await StudentFees.findOne({
      _id: studentFeesId,
      userId
    });

    if (!studentFees) {
      return res.status(404).json({
        success: false,
        message: "Student fees not found"
      });
    }

    /* ----------------------------------------
       2️⃣ 🔥 CORRECT BASE AMOUNT LOGIC
       - If any payment already done → use DUE
       - Else → use TOTAL
    ---------------------------------------- */
    const baseAmount =
      studentFees.paidAmount > 0
        ? studentFees.dueAmount
        : studentFees.totalAmount;

    if (baseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "No due amount available for installment"
      });
    }

    /* ----------------------------------------
       3️⃣ DATE VALIDATION (FIRST INSTALLMENT)
    ---------------------------------------- */
    const normalizeDate = d => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date;
    };

    const createdAt = normalizeDate(studentFees.createdAt);
    const maxAllowedDate = new Date(createdAt);
    maxAllowedDate.setMonth(maxAllowedDate.getMonth() + 1);

    const firstDate = normalizeDate(startDate);

    // if (firstDate < createdAt || firstDate > maxAllowedDate) {
    //   return res.status(400).json({
    //     success: false,
    //     message:
    //       "First installment date must be within 1 month of fees creation date"
    //   });
    // }

    /* ----------------------------------------
       4️⃣ FIRST INSTALLMENT AMOUNT CHECK
    ---------------------------------------- */
    if (firstInstallmentAmount >= baseAmount) {
      return res.status(400).json({
        success: false,
        message: "First installment amount must be less than payable amount"
      });
    }

    /* ----------------------------------------
       5️⃣ CALCULATE INSTALLMENTS
    ---------------------------------------- */
    const remainingAmount = baseAmount - firstInstallmentAmount;
    const remainingInstallments = installmentCount - 1;

    const baseRemainingAmount = Math.floor(
      remainingAmount / remainingInstallments
    );

    const remainder =
      remainingAmount -
      baseRemainingAmount * remainingInstallments;

    const installments = [];
    let currentDate = firstDate;

    for (let i = 1; i <= installmentCount; i++) {
      let amount;

      if (i === 1) {
        amount = firstInstallmentAmount;
      } else if (i === installmentCount) {
        amount = baseRemainingAmount + remainder;
      } else {
        amount = baseRemainingAmount;
      }

      installments.push({
        installmentNo: i,
        amount,
        dueDate: currentDate
      });

      const nextDate = new Date(currentDate);
      nextDate.setMonth(nextDate.getMonth() + monthsGap);
      currentDate = nextDate;
    }

    /* ----------------------------------------
       6️⃣ FINAL RESPONSE
    ---------------------------------------- */
    return res.status(200).json({
      success: true,
      message: "Installment preview generated successfully",
      data: {
        studentFeesId,
        payableAmount: baseAmount,   // 🔥 IMPORTANT
        installmentCount,
        monthsGap,
        installments
      }
    });

  } catch (error) {
    console.error("Installment preview error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


// Assign installments to a StudentFees (after assignStudentFees or along with it)
const assignInstallmentsToStudentFees = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { studentFeesId } = req.params;
    const { installments } = req.body;
    const userId = req.user.id;

    const fees = await StudentFees.findOne({
      _id: studentFeesId,
      userId
    }).session(session);

    if (!fees) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Student fees not found" });
    }

    if (!installments || !Array.isArray(installments) || installments.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Installments data required" });
    }

    const total = installments.reduce((sum, i) => sum + i.amount, 0);

    if (total !== fees.dueAmount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Installment total does not match fees due amount"
      });
    }

    const docs = installments.map((i) => ({
      studentFeesId: fees._id,
      installmentNo: i.installmentNo,
      amount: i.amount,
      dueDate: i.dueDate,
      paidAmount: 0,
      status: "DUE"
    }));

    await StudentInstallmentItem.insertMany(docs, { session });

    // 🔥 IMPORTANT PART (exactly what you wanted)
    fees.paymentType = "INSTALLMENT";
    fees.status = "DUE"; // optional but logical
    await fees.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Installments assigned successfully",
      data: {
        studentFeesId: fees._id,
        paymentType: fees.paymentType,
        installmentCount: docs.length
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("assignInstallmentsToStudentFees error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



// Pay against a specific installment item
const payInstallment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.id;
    const { installmentItemId } = req.params;
    let { amount, paymentMode, instrumentId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    if (!paymentMode) {
      return res.status(400).json({ message: "Payment mode is required" });
    }

    const nonCashModes = ["UPI", "BANK", "CARD", "CHEQUE"];

    if (nonCashModes.includes(paymentMode)) {
      if (!instrumentId) {
        return res.status(400).json({
          message: `${paymentMode} payment requires instrumentId`
        });
      }
    } else if (paymentMode === "CASH") {
      instrumentId = null;
    } else {
      return res.status(400).json({
        message: "Invalid payment mode"
      });
    }

    // 1️⃣ Fetch installment item
    const item = await StudentInstallmentItem
      .findById(installmentItemId)
      .session(session);

    if (!item) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Installment item not found" });
    }

    // 2️⃣ Fetch fees
    const fees = await StudentFees
      .findById(item.studentFeesId)
      .session(session);

    if (!fees || String(fees.userId) !== String(userId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: "Unauthorized" });
    }

    // 3️⃣ Fetch enrollment (🔥 SAME LOGIC as normal payment)
    const enrollment = await StudentCourse.findById(fees.enrollmentId);

    if (!enrollment || !enrollment.studentId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        message: "Enrollment / student not found"
      });
    }

    const studentId = enrollment.studentId;

    // 4️⃣ Calculate payable amount
    const remainingItem = item.amount - item.paidAmount;
    const payNow = Math.min(amount, remainingItem);

    if (payNow <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Installment already fully paid"
      });
    }

    // 5️⃣ Create payment record (studentId included)
    const payment = await StudentFeePayment.create(
      [{
        studentFeesId: fees._id,
        enrollmentId: fees.enrollmentId,
        studentId: studentId, // ⭐ SAME SOURCE
        amount: payNow,
        paymentMode,
        instrumentId: paymentMode === "CASH" ? null : instrumentId,
        userId
      }],
      { session }
    );

    // 6️⃣ Update installment item
    item.paidAmount += payNow;
    item.status = item.paidAmount >= item.amount ? "PAID" : "PARTIAL";
    await item.save({ session });

    // 7️⃣ Update fees summary
    fees.paidAmount += payNow;
    fees.dueAmount = Math.max(0, fees.totalAmount - fees.paidAmount);
    fees.status =
      fees.dueAmount === 0
        ? "PAID"
        : fees.paidAmount > 0
          ? "PARTIAL"
          : "DUE";

    await fees.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "Installment payment recorded successfully",
      data: {
        paymentId: payment[0]._id,
        studentId,
        paidAmount: payNow,
        paymentMode,
        installmentStatus: item.status,
        feesStatus: fees.status
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



// List installment items + status for a StudentFees
const listInstallmentItems = async (req, res) => {
  try {
    const { studentFeesId } = req.params;
    const items = await StudentInstallmentItem.find({ studentFeesId }).sort({ sequence: 1, dueDate: 1 });
    return res.status(200).json({ message: "Installment items fetched", data: items });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const enrollMultipleStudentsToCourse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { courseId } = req.params;
    const { studentIds } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(studentIds) || !studentIds.length) {
      return res.status(400).json({ message: "studentIds array required" });
    }

    //  Fetch course
    const course = await Course.findById(courseId).session(session);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    //  Update COURSE → students
    await Course.updateOne(
      { _id: courseId },
      { $addToSet: { students: { $each: studentIds } } },
      { session }
    );

    //  Update STUDENTS → courses
    await Student.updateMany(
      { _id: { $in: studentIds } },
      { $addToSet: { courses: courseId } },
      { session }
    );

    //  Process fees for each student
    for (const studentId of studentIds) {

      // 🔥 Always take latest fees
      let studentFees = await StudentFees.findOne({
        studentId,
        userId
      })
        .sort({ createdAt: -1 })
        .session(session);

      // 🔥 IMPORTANT RULE
      if (studentFees && ["PAID", "PARTIAL"].includes(studentFees.status)) {
        studentFees = null; // force new entry
      }

      // 🟢 CREATE NEW FEES ENTRY
      if (!studentFees) {
        const masterFees = await FeesMaster.find({
          isActive: true,
          userId
        }).session(session);

        let totalAmount = course.fee;
        const feeItems = [
          {
            feeType: "COURSE",
            courseId,
            amount: course.fee
          }
        ];

        masterFees.forEach(fee => {
          totalAmount += fee.amount;
          feeItems.push({
            feeType: "MASTER",
            feeMasterId: fee._id,
            amount: fee.amount
          });
        });

        const createdFees = await StudentFees.create(
          [{
            studentId,
            totalAmount,
            paidAmount: 0,
            dueAmount: totalAmount,
            status: "DUE",
            userId
          }],
          { session }
        );

        const finalItems = feeItems.map(item => ({
          ...item,
          studentFeesId: createdFees[0]._id
        }));

        await StudentFeeItems.insertMany(finalItems, { session });
      }

      // 🟡 UPDATE ONLY IF STATUS = DUE
      else {
        const existingCourseFee = await StudentFeeItems.findOne({
          studentFeesId: studentFees._id,
          courseId
        }).session(session);

        if (!existingCourseFee) {
          await StudentFeeItems.create(
            [{
              feeType: "COURSE",
              courseId,
              amount: course.fee,
              studentFeesId: studentFees._id
            }],
            { session }
          );

          await StudentFees.updateOne(
            { _id: studentFees._id },
            {
              $inc: {
                totalAmount: course.fee,
                dueAmount: course.fee
              },
              $set: { status: "DUE" }
            },
            { session }
          );
        }
      }
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "Students enrolled & fees assigned successfully",
      courseId,
      totalStudents: studentIds.length
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


const getInstitution = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const institutionUser = await User.findById(userId);
    console.log("==>", institutionUser);

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

    return res.status(200).json(
      {
        message: "Institution Fetch successfully",
        data: institution
      }
    )
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {getInstitution, buyCourse, institutionLogOut, institutionDashboard, courseDetails, updateCourse, deleteCoures, studentDetails, getMyStudents, loginInstitution, createCourse, getMyCourses, StudentDropDown, createStudent, deleteStudent, updateStudent, OnlyOneStudentAPI, AddFeesMasterAPI, GetAllFeesMasterAPI, GetSingleFeesMasterAPI, UpdateFeesMasterAPI, DeleteFeesMasterAPI, assignStudentFees, getSingleStudentFees, listStudentFees, payStudentFees, getInstallmentPreview, assignInstallmentsToStudentFees, payInstallment, listInstallmentItems, enrollMultipleStudentsToCourse };
