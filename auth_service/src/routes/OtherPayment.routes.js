const express = require("express");
const router = express.Router();
const otherPaymentController = require("../controller/OtherPayment.controller");
const verifyJwt = require("../middleware/verifiyUser.js");

// Other Payment Master Routes
router.post("/add-other-payment-master",verifyJwt, otherPaymentController.createOtherPayment);
router.get("/all-other-payment-master",verifyJwt, otherPaymentController.getAllOtherPayments);
router.get("/other-payment-master/:id",verifyJwt, otherPaymentController.getSingleOtherPayment);
router.put("/update-other-payment-master/:id",verifyJwt, otherPaymentController.updateOtherPayment);
router.delete("/delete-other-payment-master/:id",verifyJwt, otherPaymentController.deleteOtherPayment);

// Student Other Payment Routes
router.get("/students",verifyJwt, otherPaymentController.getStudentOtherPaymentList);
router.get("/students/:studentId",verifyJwt, otherPaymentController.getStudentOtherPayments);
router.post("/payment-collect/:id",verifyJwt, otherPaymentController.makePayment);
router.get("/statistics",verifyJwt, otherPaymentController.getPaymentStatistics);

module.exports = router;