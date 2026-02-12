const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const {createStudentFees,getAllStudentFees,getSingleStudentFees,getStudentFinancialReport} = require("../controller/studentFeesLedger.controller.js")

router.post("/assign-studentfees", verifyJwt, createStudentFees);
router.get("/list-student-fees", verifyJwt, getAllStudentFees);
router.get("/single-student-fees/:id", verifyJwt, getSingleStudentFees);
router.get("/student-financial-report", verifyJwt, getStudentFinancialReport);

module.exports = router