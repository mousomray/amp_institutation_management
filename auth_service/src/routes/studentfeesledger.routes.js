const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const {sentStudentFinancialReport, createStudentFees, getAllStudentFees, getSingleStudentFees, getStudentFinancialReport, generateStudentFinancialPDF,generateSingleStudentFeesPDF,getStudentFullFinancialSummary,generateSinglePDF,sentCourseFeesChallan } = require("../controller/studentFeesLedger.controller.js")

router.post("/assign-studentfees", verifyJwt, createStudentFees);
router.get("/list-student-fees", verifyJwt, getAllStudentFees);
router.get("/single-student-fees/:id", verifyJwt, getSingleStudentFees);
router.get("/student-financial-report", verifyJwt, getStudentFinancialReport);
router.get("/student-financial/pdf", verifyJwt, generateStudentFinancialPDF);
router.get("/single-student-fees/pdf/:id", verifyJwt, generateSingleStudentFeesPDF);
router.get("/sent-student-fees/pdf/:id", verifyJwt, sentCourseFeesChallan);
router.get("/student-full-financial-summary/:studentId", verifyJwt, getStudentFullFinancialSummary);
router.get("/generate-single-pdf/:studentId", verifyJwt, generateSinglePDF);
router.get("/sent-single-pdf/:studentId", verifyJwt,sentStudentFinancialReport);
module.exports = router