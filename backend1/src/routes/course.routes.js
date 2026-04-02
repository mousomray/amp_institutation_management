const router = require("express").Router();
const { createCourse, getMyCourses, courseDetails, updateCourse, deleteCourse } = require("../controller/course.controller.js");
const verifyJwt = require("../middleware/verifiyUser.js");
const { upload } = require("../middleware/multer.js")

router.post("/add-course", verifyJwt, upload.single("image"), createCourse)
router.get("/all-courses", verifyJwt, getMyCourses)
router.get("/course-details/:id", courseDetails)
router.put("/edit-course/:id",updateCourse)
router.delete("/soft-delete-course/:id", deleteCourse)

module.exports = router;