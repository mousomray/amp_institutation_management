const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const {createStudentFees,getAllStudentFees,getSingleStudentFees} = require("../controller/studentFeesLedger.controller.js")

router.post("/assign-studentfees", verifyJwt, createStudentFees);
router.get("/list-student-fees", verifyJwt, getAllStudentFees);
router.get("/single-student-fees/:id", verifyJwt, getSingleStudentFees);

module.exports = router