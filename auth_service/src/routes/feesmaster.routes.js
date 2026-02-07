const router = require("express").Router();

const verifyJwt = require("../middleware/verifiyUser.js");
const { addFeesMaster, getAllFeesMaster, getSingleFeesMaster, updateFeesMaster, toggleFeesMasterStatus, deleteFeesMaster, } = require("../controller/feesMaster.controller.js")

router.post("/add-fees-master", verifyJwt, addFeesMaster);
router.get("/get-all-fees-master", verifyJwt, getAllFeesMaster);
router.get("/get-single-fees-master/:id", verifyJwt, getSingleFeesMaster);
router.put("/update-fees-master/:id", verifyJwt, updateFeesMaster);
router.put("/toggle-fees-master-status/:id", verifyJwt, toggleFeesMasterStatus);
router.delete("/delete-fees-master/:id", verifyJwt, deleteFeesMaster);

module.exports = router