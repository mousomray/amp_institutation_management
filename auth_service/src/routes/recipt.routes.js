const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const {createReceipt, getAllReceipts,getReceiptsByEnrollment} = require("../controller/receipt.controller.js")

router.post("/create-receipt", verifyJwt, createReceipt)
router.get("/get-all-receipts", verifyJwt, getAllReceipts)
router.get("/get-receipts-by-enrollment/:enrollmentId", verifyJwt, getReceiptsByEnrollment)

module.exports = router