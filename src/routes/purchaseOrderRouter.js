const express = require('express');
const { createPurchaseOrder, updateGoogleSheet, checkDuplicatePurchaseOrder } = require("../controllers/poController");

const router = express.Router();

router.post("/", createPurchaseOrder);
router.post("/updateGoogleSheet", updateGoogleSheet);
router.post("/checkDuplicate", checkDuplicatePurchaseOrder);

module.exports = router;


