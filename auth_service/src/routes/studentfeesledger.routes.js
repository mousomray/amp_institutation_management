const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const { createStudentFees, getAllStudentFees, getSingleStudentFees, getStudentFinancialReport, generateStudentFinancialPDF,generateSingleStudentFeesPDF,getStudentFullFinancialSummary,generateSinglePDF } = require("../controller/studentFeesLedger.controller.js")

router.post("/assign-studentfees", verifyJwt, createStudentFees);
router.get("/list-student-fees", verifyJwt, getAllStudentFees);
router.get("/single-student-fees/:id", verifyJwt, getSingleStudentFees);
router.get("/student-financial-report", verifyJwt, getStudentFinancialReport);
router.get("/student-financial/pdf", verifyJwt, generateStudentFinancialPDF);
router.get("/single-student-fees/pdf/:id", verifyJwt, generateSingleStudentFeesPDF);
router.get("/student-full-financial-summary/:studentId", verifyJwt, getStudentFullFinancialSummary);
router.get("/generate-single-pdf/:studentId", verifyJwt, generateSinglePDF);
module.exports = router