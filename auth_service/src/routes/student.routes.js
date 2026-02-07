const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const { upload } = require("../middleware/multer.js")
const { uploadStudentImages } = require("../middleware/multiMulter.js")
const {createStudent,getMyStudents, updateStudent,deleteStudent,StudentDropDown} = require("../controller/student.controller.js")


router.post("/create-student", verifyJwt, uploadStudentImages, createStudent)
router.get("/get-all-students",verifyJwt,getMyStudents)
router.put("/update-student/:id",updateStudent)
router.delete("/delete-student/:id", verifyJwt,deleteStudent)
router.get("/student-dropdown", verifyJwt, StudentDropDown)

module.exports = router