const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const { createCourseFee,getCourseFeesByCourse,updateCourseFees } = require("../controller/courseFees.controller.js");

router.post("/add-course-fees", verifyJwt, createCourseFee);
router.get("/get-course-fees/:courseId", verifyJwt, getCourseFeesByCourse);
router.put("/update-course-fees/:courseId", verifyJwt, updateCourseFees);

module.exports = router;