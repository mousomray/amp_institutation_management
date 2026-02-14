const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const { createCourseFee,getCourseFeesByCourse } = require("../controller/courseFees.controller.js");

router.post("/add-course-fees", verifyJwt, createCourseFee);
router.get("/get-course-fees/:courseId", verifyJwt, getCourseFeesByCourse);

module.exports = router;