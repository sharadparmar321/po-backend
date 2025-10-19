const asyncHandler = require("express-async-handler");
const { PurchaseOrder, LineItem } = require("../models");
const { google } = require("googleapis");

const createPurchaseOrder = asyncHandler(async (req, res) => {
  try {
    const { company, vendor, orderInfo, lineItems, subTotal, taxRate, taxAmount, total } = req.body;

    // Validate all required fields
    const validationErrors = [];

    // Validate company information
    if (!company || typeof company !== 'object') {
      validationErrors.push('Company information is required');
    } else {
      if (!company.name || company.name.trim() === '') {
        validationErrors.push('Company name is required');
      }
      if (!company.address || company.address.trim() === '') {
        validationErrors.push('Company address is required');
      }
      if (!company.cityStateZip || company.cityStateZip.trim() === '') {
        validationErrors.push('Company city, state, and zip code are required');
      }
      if (!company.country || company.country.trim() === '') {
        validationErrors.push('Company country is required');
      }
    }

    // Validate vendor information
    if (!vendor || typeof vendor !== 'object') {
      validationErrors.push('Vendor information is required');
    } else {
      if (!vendor.name || vendor.name.trim() === '') {
        validationErrors.push('Vendor name is required');
      }
      if (!vendor.address || vendor.address.trim() === '') {
        validationErrors.push('Vendor address is required');
      }
      if (!vendor.cityStateZip || vendor.cityStateZip.trim() === '') {
        validationErrors.push('Vendor city, state, and zip code are required');
      }
      if (!vendor.country || vendor.country.trim() === '') {
        validationErrors.push('Vendor country is required');
      }
    }

    // Validate order information
    if (!orderInfo || typeof orderInfo !== 'object') {
      validationErrors.push('Order information is required');
    } else {
      if (!orderInfo.poNumber || orderInfo.poNumber.trim() === '') {
        validationErrors.push('Purchase Order number is required');
      }
      if (!orderInfo.orderDate || orderInfo.orderDate.trim() === '') {
        validationErrors.push('Order date is required');
      }
      if (!orderInfo.deliveryDate || orderInfo.deliveryDate.trim() === '') {
        validationErrors.push('Delivery date is required');
      }
    }

    // Validate line items
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      validationErrors.push('At least one line item is required');
    } else {
      lineItems.forEach((item, index) => {
        if (!item.description || item.description.trim() === '') {
          validationErrors.push(`Line item ${index + 1}: Description is required`);
        }
        if (!item.quantity || item.quantity <= 0) {
          validationErrors.push(`Line item ${index + 1}: Quantity must be greater than 0`);
        }
        if (!item.rate || item.rate <= 0) {
          validationErrors.push(`Line item ${index + 1}: Rate must be greater than 0`);
        }
        if (!item.amount || item.amount <= 0) {
          validationErrors.push(`Line item ${index + 1}: Amount must be greater than 0`);
        }
      });
    }

    // Validate financial information
    if (!subTotal || subTotal <= 0) {
      validationErrors.push('Sub total must be greater than 0');
    }
    if (taxRate === undefined || taxRate === null || taxRate < 0) {
      validationErrors.push('Tax rate is required and must be 0 or greater');
    }
    if (!taxAmount || taxAmount < 0) {
      validationErrors.push('Tax amount must be 0 or greater');
    }
    if (!total || total <= 0) {
      validationErrors.push('Total amount must be greater than 0');
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields',
        errors: validationErrors
      });
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

    // Validate all required fields for Google Sheets update
    const validationErrors = [];

    // Validate company information
    if (!company || typeof company !== 'object') {
      validationErrors.push('Company information is required');
    } else {
      if (!company.name || company.name.trim() === '') {
        validationErrors.push('Company name is required');
      }
      if (!company.address || company.address.trim() === '') {
        validationErrors.push('Company address is required');
      }
      if (!company.cityStateZip || company.cityStateZip.trim() === '') {
        validationErrors.push('Company city, state, and zip code are required');
      }
      if (!company.country || company.country.trim() === '') {
        validationErrors.push('Company country is required');
      }
    }

    // Validate vendor information
    if (!vendor || typeof vendor !== 'object') {
      validationErrors.push('Vendor information is required');
    } else {
      if (!vendor.name || vendor.name.trim() === '') {
        validationErrors.push('Vendor name is required');
      }
      if (!vendor.address || vendor.address.trim() === '') {
        validationErrors.push('Vendor address is required');
      }
      if (!vendor.cityStateZip || vendor.cityStateZip.trim() === '') {
        validationErrors.push('Vendor city, state, and zip code are required');
      }
      if (!vendor.country || vendor.country.trim() === '') {
        validationErrors.push('Vendor country is required');
      }
    }

    // Validate order information
    if (!orderInfo || typeof orderInfo !== 'object') {
      validationErrors.push('Order information is required');
    } else {
      if (!orderInfo.poNumber || orderInfo.poNumber.trim() === '') {
        validationErrors.push('Purchase Order number is required');
      }
      if (!orderInfo.orderDate || orderInfo.orderDate.trim() === '') {
        validationErrors.push('Order date is required');
      }
      if (!orderInfo.deliveryDate || orderInfo.deliveryDate.trim() === '') {
        validationErrors.push('Delivery date is required');
      }
    }

    // Validate line items
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      validationErrors.push('At least one line item is required');
    } else {
      lineItems.forEach((item, index) => {
        if (!item.description || item.description.trim() === '') {
          validationErrors.push(`Line item ${index + 1}: Description is required`);
        }
        if (!item.quantity || item.quantity <= 0) {
          validationErrors.push(`Line item ${index + 1}: Quantity must be greater than 0`);
        }
        if (!item.rate || item.rate <= 0) {
          validationErrors.push(`Line item ${index + 1}: Rate must be greater than 0`);
        }
        if (!item.amount || item.amount <= 0) {
          validationErrors.push(`Line item ${index + 1}: Amount must be greater than 0`);
        }
      });
    }

    // Validate financial information
    if (!subTotal || subTotal <= 0) {
      validationErrors.push('Sub total must be greater than 0');
    }
    if (gst === undefined || gst === null || gst < 0) {
      validationErrors.push('GST rate is required and must be 0 or greater');
    }
    if (!total || total <= 0) {
      validationErrors.push('Total amount must be greater than 0');
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields',
        errors: validationErrors
      });
    }

    console.log("Starting Google Sheets update...");
    console.log("GOOGLE_CREDENTIALS exists:", !!process.env.GOOGLE_CREDENTIALS);
    console.log("GOOGLE_SHEET_ID exists:", !!process.env.GOOGLE_SHEET_ID);

    if (!process.env.GOOGLE_CREDENTIALS) {
      throw new Error("GOOGLE_CREDENTIALS environment variable is not set");
    }

    if (!process.env.GOOGLE_SHEET_ID) {
      throw new Error("GOOGLE_SHEET_ID environment variable is not set");
    }

    let credentials;
    try {
      // Handle both escaped and unescaped JSON
      let credentialsString = process.env.GOOGLE_CREDENTIALS;
      
      // If it looks like it's escaped, try to unescape it
      if (credentialsString.includes('\\n')) {
        credentialsString = credentialsString.replace(/\\n/g, '\n');
      }
      
      credentials = JSON.parse(credentialsString);
      console.log("Credentials parsed successfully");
    } catch (parseError) {
      console.error("Error parsing credentials:", parseError);
      throw new Error(`Invalid GOOGLE_CREDENTIALS JSON format: ${parseError.message}`);
    }

    if (!credentials.private_key || !credentials.client_email) {
      throw new Error("Invalid credentials: missing private_key or client_email");
    }

    const privateKey = credentials.private_key.replace(/\\n/g, "\n");
    console.log("Creating JWT auth...");
    
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    console.log("Spreadsheet ID:", spreadsheetId);
    console.log("Line items count:", lineItems.length);

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

    console.log("Attempting to append to Google Sheets...");
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:S",
      valueInputOption: "USER_ENTERED",
      resource: { values: rows },
    });
    
    console.log("Google Sheets update successful:", response.data);

    res.status(200).json({ success: true, message: "Google Sheet updated successfully", updatedRows: response.data.updates?.updatedRows || rows.length });
  } catch (error) {
    console.error("Error updating Google Sheet:", error);
    console.error("Error stack:", error.stack);
    
    let errorMessage = error.message;
    if (error.message.includes("credentials") || error.message.includes("authentication")) {
      errorMessage = "Google API credentials issue. Please check GOOGLE_CREDENTIALS environment variable.";
    } else if (error.message.includes("spreadsheet") || error.message.includes("permission")) {
      errorMessage = "Cannot access Google Spreadsheet. Please check permissions and spreadsheet ID.";
    } else if (error.message.includes("quota")) {
      errorMessage = "Google Sheets API quota exceeded. Please try again later.";
    } else if (error.message.includes("JSON")) {
      errorMessage = "Invalid Google credentials format. Please check GOOGLE_CREDENTIALS environment variable.";
    }
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage, 
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
});

module.exports = { createPurchaseOrder, updateGoogleSheet };


