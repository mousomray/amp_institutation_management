const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { User, Course, Institution, Student, FeesMaster, StudentFees, StudentFeeItems, StudentFeePayment, InstallmentPlan, StudentInstallmentItem } = require("../model/model.js");
const { AdminLoginSchema, CourseSchema, StudentSchema, EditSthudentSchma, FeesMasterSchema, EditFeesMasterSchema } = require("../schema/Schema.js");
const uploadSingleImage = require("../helper/upload.js")
const { passwordGenerator } = require("../helper/PasswordGenerator.js")
const mongoose = require("mongoose");
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

    const parsedData = StudentSchema.parse(req.body);

    const userId = req.user?._id;
    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({ message: "Unauthorized" });
    }


    const institutionUser = await User.findById(userId).session(session);
    if (!institutionUser || institutionUser.role !== "institution") {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(403)
        .json({ message: "Only institutions can create students" });
    }
    const institution = await Institution.findOne({
      adminUser: institutionUser._id,
    }).session(session);

    if (!institution) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Institution not found" });
    }

    // ✅ Validate files
    if (!req.files?.image || !req.files?.signature) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Image and signature are required" });
    }


    const emailExists = await User.findOne({
      email: parsedData.email,
    }).session(session);

    if (emailExists) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({ message: "Email already exists" });
    }


    const photoUrl = await uploadSingleImage(req.files.image[0]);
    const signatureUrl = await uploadSingleImage(req.files.signature[0]);


    const plainPassword = passwordGenerator();


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
          email: parsedData.email
        },
      ],
      { session }
    );


    await User.findByIdAndUpdate(
      user._id,
      { student: student._id },
      { session }
    );

    // ✅ COURSE LINKING (IMPORTANT FIX)
    if (parsedData.courseId) {
      const course = await Course.findById(parsedData.courseId).session(
        session
      );

      if (!course) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: "Course not found" });
      }

      // ✔ Atomic & safe
      await Student.findByIdAndUpdate(
        student._id,
        { $addToSet: { courses: course._id } },
        { session }
      );

      await Course.findByIdAndUpdate(
        course._id,
        { $addToSet: { students: student._id } },
        { session }
      );
    }

    // ✅ Commit transaction
    await session.commitTransaction();
    session.endSession();

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
    session.endSession();

    return res.status(500).json({
      message: error?.message || "Internal server error",
    });
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
    const parsedData = EditSthudentSchm.parse(req.body)
    const student = await Student.findByIdAndUpdate(studentId, {
      studentId: parsedData.studentId,
      name: parsedData.name,
      email: parsedData.email,
      phone: parsedData.phone,
      dob: parsedData.dob,
      fatherName: parsedData.fatherName,
      bloodGroup: parsedData.bloodGroup,
      admissionDate: parsedData.admissionDate,
    })


    return res.status(200).json({
      message: "Student updated successfully",
      student,
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
    const courseId = req.params.id

    if (!courseId) {
      return res.status(404).json({ message: "courseId user not found" });
    }

    await Course.findByIdAndDelete(courseId)
    return res.status(200).json({ message: "Cousers delete deleted successfully", deleteStudent })

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
    const courseData = await Course.aggregate([
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
    const studentData = await Student.aggregate([
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
    const data = await Student.findById(id);
    return res.status(200).json({ message: "Single Student Fetched Successfully", data });
  } catch (error) {
    console.error("Get single student error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Handle Fees Master related operations here

const AddFeesMasterAPI = async (req, res) => {
  try {
    const userId = req.user.id;

    const fees = await FeesMaster.create({
      ...req.body,
      userId
    });

    return res.status(201).json({
      message: "Fees master created successfully",
      data: fees
    });
  } catch (error) {
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

    const deletedFee = await FeesMaster.findOneAndDelete({
      _id: id,
      userId
    });

    if (!deletedFee) {
      return res.status(404).json({
        message: "Fees master not found or unauthorized"
      });
    }

    return res.status(200).json({
      message: "Fees master deleted successfully"
    });
  } catch (error) {
    console.error("Delete fees master error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Student Fees API Implimentation area 
const assignStudentFees = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    const userId = req.user.id;

    // 1. Course fee
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // 2. Active master fees
    const masterFees = await FeesMaster.find({
      isActive: true,
      userId
    });

    // 3. Calculate total
    let totalAmount = course.fee;

    masterFees.forEach(fee => {
      totalAmount += fee.amount;
    });

    // 4. Create StudentFees (summary)
    const studentFees = await StudentFees.create({
      studentId,
      courseId,
      totalAmount,
      paidAmount: 0,
      dueAmount: totalAmount,
      status: "DUE",
      userId
    });

    // 5. Create fee items (IMPORTANT PART)
    const feeItems = [];

    // 👉 Course fee item (NEW & REQUIRED)
    feeItems.push({
      studentFeesId: studentFees._id,
      feeType: "COURSE",
      courseId: course._id,
      amount: course.fee
    });

    // 👉 Master fee items
    masterFees.forEach(fee => {
      feeItems.push({
        studentFeesId: studentFees._id,
        feeType: "MASTER",
        feeMasterId: fee._id,
        amount: fee.amount
      });
    });

    await StudentFeeItems.insertMany(feeItems);

    return res.status(201).json({
      message: "Student fees assigned successfully",
      data: studentFees
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};


const listStudentFees = async (req, res) => {
  try {
    const userId = req.user.id;

    const data = await StudentFees.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId)
        }
      },

      /* ---------- pick latest fees per student + course ---------- */
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            studentId: "$studentId",
            courseId: "$courseId"
          },
          studentFeesId: { $first: "$_id" },
          totalAmount: { $first: "$totalAmount" },
          paidAmount: { $first: "$paidAmount" },
          dueAmount: { $first: "$dueAmount" },
          status: { $first: "$status" },
          userId: { $first: "$userId" }
        }
      },

      /* ---------- Student ---------- */
      {
        $lookup: {
          from: "students",
          localField: "_id.studentId",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },

      /* ---------- Course ---------- */
      {
        $lookup: {
          from: "courses",
          localField: "_id.courseId",
          foreignField: "_id",
          as: "course"
        }
      },
      { $unwind: "$course" },

      /* ---------- Fee Items ---------- */
      {
        $lookup: {
          from: "studentfeeitems",
          localField: "studentFeesId",
          foreignField: "studentFeesId",
          as: "feeItems"
        }
      },

      /* ---------- Fees Master ---------- */
      {
        $lookup: {
          from: "feesmasters",
          localField: "feeItems.feeMasterId",
          foreignField: "_id",
          as: "masterFeesData"
        }
      },

      /* ---------- Calculate Fees ---------- */
      {
        $addFields: {
          courseFee: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$feeItems",
                    as: "item",
                    cond: { $eq: ["$$item.feeType", "COURSE"] }
                  }
                },
                as: "cf",
                in: "$$cf.amount"
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
              as: "mf",
              in: {
                amount: "$$mf.amount",
                fee: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$masterFeesData",
                        as: "mfd",
                        cond: { $eq: ["$$mfd._id", "$$mf.feeMasterId"] }
                      }
                    },
                    0
                  ]
                }
              }
            }
          }
        }
      },

      /* ---------- Final Response ---------- */
      {
        $project: {
          _id: "$studentFeesId",
          totalAmount: 1,
          paidAmount: 1,
          dueAmount: 1,
          status: 1,

          student: {
            name: "$student.name"
          },
          course: {
            name: "$course.name"
          },

          courseFee: 1,
          masterFees: {
            amount: 1,
            "fee.name": 1
          }
        }
      }
    ]);

    res.status(200).json({
      message: "Student fees list fetched",
      data
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};



const getSingleStudentFees = async (req, res) => {
  try {
    const { studentFeesId } = req.params;
    const userId = req.user.id;

    const data = await StudentFees.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(studentFeesId),
          userId: new mongoose.Types.ObjectId(userId)
        }
      },

      /* ---------- Student ---------- */
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },

      /* ---------- Course ---------- */
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "course"
        }
      },
      { $unwind: "$course" },

      /* ---------- Fee Items ---------- */
      {
        $lookup: {
          from: "studentfeeitems",
          localField: "_id",
          foreignField: "studentFeesId",
          as: "feeItems"
        }
      },

      /* ---------- Master Fees ---------- */
      {
        $lookup: {
          from: "feesmasters",
          localField: "feeItems.feeMasterId",
          foreignField: "_id",
          as: "masterFees"
        }
      },

      /* ---------- Calculations ---------- */
      {
        $addFields: {
          masterFeeBreakdown: {
            $map: {
              input: {
                $filter: {
                  input: "$feeItems",
                  as: "item",
                  cond: { $eq: ["$$item.feeType", "MASTER"] }
                }
              },
              as: "mfItem",
              in: {
                name: {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: {
                          $filter: {
                            input: "$masterFees",
                            as: "mf",
                            cond: { $eq: ["$$mf._id", "$$mfItem.feeMasterId"] }
                          }
                        },
                        as: "f",
                        in: "$$f.name"
                      }
                    },
                    0
                  ]
                },
                amount: "$$mfItem.amount",
                type: "MASTER"
              }
            }
          },

          courseFee: {
            name: "$course.name",
            amount: "$course.fee",
            type: "COURSE"
          }
        }
      },

      /* ---------- Final Response ---------- */
      {
        $project: {
          student: {
            name: "$student.name"
          },
          course: {
            name: "$course.name",
            fee: "$course.fee"
          },
          fees: {
            $concatArrays: [
              "$masterFeeBreakdown",
              ["$courseFee"]
            ]
          },
          summary: {
            totalAmount: "$totalAmount",
            paidAmount: "$paidAmount",
            dueAmount: "$dueAmount",
            status: "$status"
          }
        }
      }
    ]);

    if (!data.length) {
      return res.status(404).json({ message: "Student fees not found" });
    }

    res.status(200).json({
      message: "Student fees fetched successfully",
      data: data[0]
    });

  } catch (error) {
    console.error("getSingleStudentFeesByFeesId error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Pay Student Fees
const payStudentFees = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { studentFeesId } = req.params;
    const { amount, paymentMode } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    // 1️⃣ Get student fees
    const fees = await StudentFees.findById(studentFeesId).session(session);

    if (!fees) {
      return res.status(404).json({ message: "Fees record not found" });
    }

    // 2️⃣ Over payment check
    if (amount > fees.dueAmount) {
      return res.status(400).json({
        message: "Payment amount cannot be greater than due amount"
      });
    }

    // 3️⃣ Create payment record
    const payment = await StudentFeePayment.create(
      [
        {
          studentFeesId: fees._id,
          studentId: fees.studentId,
          amount,
          paymentMode,
          userId: userId
        }
      ],
      { session }
    );

    // 4️⃣ Update fees summary
    fees.paidAmount += amount;
    fees.dueAmount -= amount;

    if (fees.dueAmount === 0) {
      fees.status = "PAID";
    } else {
      fees.status = "PARTIAL";
    }

    await fees.save({ session });

    // 5️⃣ Commit transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "Payment recorded successfully",
      data: {
        paymentId: payment[0]._id,
        studentFeesId: fees._id,
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

// Admin: create installment plan (Master Settings)
const createInstallmentPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, items } = req.body;

    if (!items?.length) return res.status(400).json({ message: "Installment items required" });

    const totalAmount = items.reduce((sum, it) => sum + Number(it.amount || 0), 0);

    const plan = await InstallmentPlan.create({ name, description, items, totalAmount, userId });

    return res.status(201).json({ message: "Installment plan created", data: plan });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Admin: list installment plans
const listInstallmentPlans = async (req, res) => {
  try {
    const userId = req.user.id;
    const plans = await InstallmentPlan.find({ userId }).sort({ createdAt: -1 });
    return res.status(200).json({ message: "Installment plans fetched", data: plans });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Assign installments to a StudentFees (after assignStudentFees or along with it)
const assignInstallmentsToStudentFees = async (req, res) => {
  try {
    const userId = req.user.id;
    const { studentFeesId, installmentPlanId } = req.body;

    const fees = await StudentFees.findOne({ _id: studentFeesId, userId });
    if (!fees) return res.status(404).json({ message: "Student fees not found" });

    const plan = await InstallmentPlan.findOne({ _id: installmentPlanId, userId });
    if (!plan) return res.status(404).json({ message: "Installment plan not found" });

    // create per-student installment items
    const items = plan.items.map((it, idx) => ({
      studentFeesId: fees._id,
      name: it.name,
      dueDate: it.dueDate,
      amount: it.amount,
      sequence: idx + 1
    }));

    await StudentInstallmentItem.insertMany(items);

    return res.status(201).json({ message: "Installments assigned", data: { studentFeesId: fees._id, count: items.length } });
  } catch (err) {
    console.error(err);
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
    const { amount, paymentMode } = req.body;

    const item = await StudentInstallmentItem.findById(installmentItemId).session(session);
    if (!item) return res.status(404).json({ message: "Installment item not found" });
    if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid amount" });

    // fetch fees summary
    const fees = await StudentFees.findById(item.studentFeesId).session(session);
    if (!fees || String(fees.userId) !== String(userId)) return res.status(403).json({ message: "Unauthorized" });

    // cap payment to remaining on item
    const remainingItem = item.amount - item.paidAmount;
    const payNow = Math.min(amount, remainingItem);

    // record payment (reuse StudentFeePayment)
    const payment = await StudentFeePayment.create([{
      studentFeesId: fees._id,
      studentId: fees.studentId,
      amount: payNow,
      paymentMode,
      userId
    }], { session });

    // update installment item
    item.paidAmount += payNow;
    item.status = item.paidAmount >= item.amount ? "PAID" : "PARTIAL";
    await item.save({ session });

    // update fees summary
    fees.paidAmount += payNow;
    fees.dueAmount = Math.max(0, fees.totalAmount - fees.paidAmount);
    fees.status = fees.dueAmount === 0 ? "PAID" : (fees.paidAmount > 0 ? "PARTIAL" : "DUE");
    await fees.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "Installment payment recorded",
      data: {
        paymentId: payment[0]._id,
        installmentItemId: item._id,
        studentFeesId: fees._id,
        paidAmount: payNow,
        updatedItemStatus: item.status,
        updatedFeesStatus: fees.status
      }
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
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

module.exports = { buyCourse, institutionLogOut, institutionDashboard, courseDetails, updateCourse, deleteCoures, studentDetails, getMyStudents, loginInstitution, createCourse, getMyCourses, StudentDropDown, createStudent, deleteStudent, updateStudent, OnlyOneStudentAPI, AddFeesMasterAPI, GetAllFeesMasterAPI, GetSingleFeesMasterAPI, UpdateFeesMasterAPI, DeleteFeesMasterAPI, assignStudentFees, getSingleStudentFees, listStudentFees, payStudentFees, createInstallmentPlan, listInstallmentPlans, assignInstallmentsToStudentFees, payInstallment, listInstallmentItems };
