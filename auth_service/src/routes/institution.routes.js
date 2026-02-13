const router = require("express").Router();

const { getInstitution, buyCourse, institutionLogOut, institutionDashboard, courseDetails, deleteCoures, updateCourse, studentDetails, loginInstitution, createCourse, getMyCourses, createStudent, getMyStudents, StudentDropDown, updateStudent, deleteStudent, OnlyOneStudentAPI, AddFeesMasterAPI, GetAllFeesMasterAPI, GetSingleFeesMasterAPI, UpdateFeesMasterAPI, DeleteFeesMasterAPI, assignStudentFees, getSingleStudentFees, listStudentFees, payStudentFees, createInstallmentPlan, listInstallmentPlans, assignInstallmentsToStudentFees, payInstallment, listInstallmentItems, getInstallmentPreview,enrollMultipleStudentsToCourse } = require("../controller/institution.controller.js");
const verifyJwt = require("../middleware/verifiyUser.js");
const { upload } = require("../middleware/multer.js")
const { uploadStudentImages } = require("../middleware/multiMulter.js")

router.post("/login", loginInstitution);
//router.post("/create-course", verifyJwt, upload.single("image"), createCourse)
//router.get("/get-course", verifyJwt, getMyCourses)
//router.post("/create-student", verifyJwt, uploadStudentImages, createStudent);
//router.get("/get-student", verifyJwt, getMyStudents)
//router.get("/all-students", verifyJwt, StudentDropDown)
//router.put("/update-student/:id", updateStudent)
//router.delete("/delete-student/:id", verifyJwt, deleteStudent)
//router.get("/student-detail/:id", studentDetails)
//router.put("/update-course/:id", updateCourse)
//router.delete("/delete-course/:id", deleteCoures)
//router.get("/course-detail/:id", courseDetails)
router.get("/dashboard", verifyJwt, institutionDashboard)
router.post("/logout", verifyJwt, institutionLogOut)
//router.post("/buy", buyCourse)
//router.get("/onlyonestudentapi/:id", OnlyOneStudentAPI)
//router.post("/add-fees-master", verifyJwt, AddFeesMasterAPI)
//router.get("/get-all-fees-master", verifyJwt, GetAllFeesMasterAPI)
//router.get("/get-single-fees-master/:id", verifyJwt, GetSingleFeesMasterAPI)
//router.put("/update-fees-master/:id", verifyJwt, UpdateFeesMasterAPI)
//router.delete("/delete-fees-master/:id", verifyJwt, DeleteFeesMasterAPI)
//router.post("/assign-student-fees", verifyJwt, assignStudentFees);
//router.get("/get-single-student-fees/:studentFeesId", verifyJwt, getSingleStudentFees);
//router.get("/list-student-fees", verifyJwt, listStudentFees);
router.post("/pay-student-fees/:studentFeesId", verifyJwt, payStudentFees);
// Install ments Routes
router.post("/student-fees/:studentFeesId/installment-preview", verifyJwt,getInstallmentPreview )

router.post("/assign-installments-to-student-fees/:studentFeesId", verifyJwt, assignInstallmentsToStudentFees);
router.post("/pay-installment/:installmentItemId", verifyJwt, payInstallment);
router.get("/list-installment-items/:studentFeesId", verifyJwt, listInstallmentItems);
//router.post("/courses/:courseId/enroll-students", verifyJwt, enrollMultipleStudentsToCourse);
router.get("/get-institution",verifyJwt,getInstitution)
module.exports = router;