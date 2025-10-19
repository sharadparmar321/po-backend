const asyncHandler = require("express-async-handler");
const { PurchaseOrder, LineItem } = require("../models");
const { google } = require("googleapis");

const createPurchaseOrder = asyncHandler(async (req, res) => {
  try {
    const { company, vendor, orderInfo, lineItems, subTotal, taxRate, taxAmount, total } = req.body;

    // Basic validation
    if (!company || !company.name || !company.address || !company.cityStateZip || !company.country) {
      return res.status(400).json({ success: false, message: "Company information is required" });
    }
    
    if (!vendor || !vendor.name || !vendor.address || !vendor.cityStateZip || !vendor.country) {
      return res.status(400).json({ success: false, message: "Vendor information is required" });
    }
    
    if (!orderInfo || !orderInfo.poNumber) {
      return res.status(400).json({ success: false, message: "PO number is required" });
    }
    
    if (!lineItems || lineItems.length === 0) {
      return res.status(400).json({ success: false, message: "At least one line item is required" });
    }
    
    // Validate line items
    for (const item of lineItems) {
      if (!item.description || !item.quantity || !item.rate) {
        return res.status(400).json({ success: false, message: "All line items must have description, quantity, and rate" });
      }
    }

    // Generate a unique reference ID for database management
    const uniqueRefId = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const purchaseOrder = await PurchaseOrder.create(
      {
        company_name: company.name,
        company_address: company.address,
        company_city_state_zip: company.cityStateZip,
        company_country: company.country,

        vendor_name: vendor.name,
        vendor_address: vendor.address,
        vendor_city_state_zip: vendor.cityStateZip,
        vendor_country: vendor.country,

        po_number: orderInfo.poNumber, // User-provided PO number (not unique)
        order_date: orderInfo.orderDate,
        delivery_date: orderInfo.deliveryDate,

        sub_total: subTotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total: total,

        line_items: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
        })),
      },
      {
        include: [{ model: LineItem, as: "line_items" }],
      }
    );

    // Add the unique reference ID to the response
    const responseData = {
      ...purchaseOrder.toJSON(),
      unique_ref_id: uniqueRefId
    };

    res.status(201).json({ 
      success: true, 
      message: "Purchase order created successfully", 
      data: responseData,
      unique_ref_id: uniqueRefId
    });
  } catch (error) {
    console.error("Error saving purchase order:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const updateGoogleSheet = asyncHandler(async (req, res) => {
  try {
    const { company, vendor, orderInfo, lineItems, subTotal, gst, total } = req.body;

    if (!process.env.GOOGLE_CREDENTIALS) {
      throw new Error("GOOGLE_CREDENTIALS environment variable is not set");
    }

    let credentials;
    try {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    } catch (parseError) {
      throw new Error(`Invalid GOOGLE_CREDENTIALS JSON format: ${parseError.message}`);
    }

    const privateKey = credentials.private_key.replace(/\\n/g, "\n");
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    

    const rows = lineItems.map((item) => [
      company.name,                    // Company Name
      company.address,                 // Company Address
      company.cityStateZip,           // Company City
      company.country,                // Company Country
      vendor.name,                    // Vendor Name
      vendor.address,                 // Vendor Address
      vendor.cityStateZip,            // Vendor City State
      vendor.country,                 // Vendor Country
      orderInfo.poNumber,             // PO Number
      orderInfo.orderDate,            // Order Date
      orderInfo.deliveryDate,         // Delivery Date
      subTotal,                       // Amount
      item.description,               // Item Description
      item.quantity,                  // Quantity
      item.rate,                      // Rate
      item.amount,                    // Total
      item.gst,                       // Tax Rate
    ]);

    // Add an empty row after the data for better spacing
    rows.push(Array(17).fill('')); // Empty row with same number of columns

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:S",
      valueInputOption: "USER_ENTERED",
      resource: { values: rows },
    });

    res.status(200).json({ success: true, message: "Google Sheet updated successfully", updatedRows: response.data.updates?.updatedRows || rows.length });
  } catch (error) {
    console.error("Error updating Google Sheet:", error);
    let errorMessage = error.message;
    if (error.message.includes("credentials")) {
      errorMessage = "Google API credentials issue. Please check GOOGLE_CREDENTIALS environment variable.";
    } else if (error.message.includes("spreadsheet")) {
      errorMessage = "Cannot access Google Spreadsheet. Please check permissions and spreadsheet ID.";
    } else if (error.message.includes("quota")) {
      errorMessage = "Google Sheets API quota exceeded. Please try again later.";
    }
    res.status(500).json({ success: false, message: errorMessage, error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
});

module.exports = { createPurchaseOrder, updateGoogleSheet };
