const { ZodError } = require("zod");
const { Institution, User } = require("../model/model.js");
const StudentModel = require("../model/student.model.js");
const { StudentSchema } = require("../schema/student.schema.js");
const uploadSingleImage = require("../helper/upload.js")
const { passwordGenerator } = require("../helper/PasswordGenerator.js")

const createStudent = async (req, res) => {
    try {
        const parsedData = StudentSchema.parse(req.body);

        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const institutionUser = await User.findById(userId);
        if (!institutionUser || institutionUser.role !== "institution") {
            return res
                .status(403)
                .json({ message: "Only institutions can create students" });
        }

        const institution = await Institution.findOne({
            adminUser: institutionUser._id,
        });

        if (!institution) {
            return res.status(404).json({ message: "Institution not found" });
        }

        if (!req.files?.image || !req.files?.signature) {
            return res
                .status(400)
                .json({ message: "Image and signature are required" });
        }

        const emailExists = await User.findOne({ email: parsedData.email });
        if (emailExists) {
            return res.status(409).json({ message: "Email already exists" });
        }

        const photoUrl = await uploadSingleImage(req.files.image[0]);
        const signatureUrl = await uploadSingleImage(req.files.signature[0]);

        const plainPassword = passwordGenerator();

        const user = await User.create({
            email: parsedData.email,
            password: plainPassword,
            role: "student",
        });

        const student = await StudentModel.create({
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
        });

        await User.findByIdAndUpdate(user._id, {
            student: student._id,
        });

        return res.status(201).json({
            message: "Student created successfully",
            student,
            credentials: {
                email: parsedData.email,
                password: plainPassword,
            },
        });

    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message: "Validation failed",
                errors: error.issues.map(err => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
            });
        }

        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
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

        const result = await StudentModel.aggregate([

            {
                $match: {
                    institution: institution._id,
                    isDeleted: false
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
                    isDeleted: 1,
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
        if (error instanceof ZodError) {
            return res.status(400).json({
                message: "Validation failed",
                errors: error.issues.map(err => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
            });
        }

        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
}


const updateStudent = async (req, res) => {
    try {
        const studentId = req.params.id;

        const parsedData = StudentSchema.parse(req.body);
        const existingStudent = await StudentModel.findById(studentId)
        if (!existingStudent) {
            return res.status(404).json({ message: "Student not found" });
        }
        const updatedStudent = await StudentModel.findByIdAndUpdate(
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
            },
        );
        return res.status(200).json({
            message: "Student updated successfully",
            student: updatedStudent,
        });


    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message: "Validation failed",
                errors: error.issues.map(err => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
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
        const student = await StudentModel.findById(studentId)
        if (!student) {
            return res.status(404).json({ message: "Student user not found" })
        }

        const isDeleteData = await StudentModel.findByIdAndUpdate(student._id, {
            isDeleted: true
        })



        return res.status(200).json({ message: "Student deleted successfully", isDeleteData })
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message: "Validation failed",
                errors: error.issues.map(err => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
            });
        }

        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
        });


    }
}

const StudentDropDown = async (req, res) => {
    try {
        const userId = req.user.id;
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
        const data = await StudentModel.find({ institution: institution._id, isDeleted: false })
        return res.status(200).json({ message: "All students fetched successfully", data });
    } catch (error) {
        console.error("Get all students error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}







module.exports = { createStudent, getMyStudents, updateStudent, deleteStudent, StudentDropDown };