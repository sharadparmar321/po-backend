const express = require('express');
const { createPurchaseOrder, updateGoogleSheet } = require("../controllers/poController");

const router = express.Router();

router.post("/", createPurchaseOrder);
router.post("/updateGoogleSheet", updateGoogleSheet);

module.exports = router;


