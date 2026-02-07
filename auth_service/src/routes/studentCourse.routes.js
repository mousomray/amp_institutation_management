const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const {enrollStudentToCourse, getAllEnrollments, getStudentWiseEnrollments,getCourseWiseEnrollments} = require("../controller/studentCourse.controller.js")

router.post("/enroll-student/:courseId", verifyJwt, enrollStudentToCourse)
router.get("/get-all-enrollments", verifyJwt, getAllEnrollments)
router.get("/get-student-wise-enrollments/:studentId", verifyJwt, getStudentWiseEnrollments)
router.get("/get-course-wise-enrollments/:courseId", verifyJwt, getCourseWiseEnrollments)

module.exports = router