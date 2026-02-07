const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const {createReceipt, getAllReceipts} = require("../controller/receipt.controller.js")

router.post("/create-receipt", verifyJwt, createReceipt)
router.get("/get-all-receipts", verifyJwt, getAllReceipts)

module.exports = router