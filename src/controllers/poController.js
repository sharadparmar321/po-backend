const asyncHandler = require("express-async-handler");
const { PurchaseOrder, LineItem } = require("../models");
const { google } = require("googleapis");

// ===== Duplicate detection helpers =====
function toFixed2(num) {
  const n = Number(num || 0);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

function normalizeLineItems(items) {
  return (items || [])
    .map((it) => ({
      description: String(it.description || "").trim(),
      quantity: toFixed2(it.quantity),
      rate: toFixed2(it.rate),
      gst: toFixed2(it.gst),
      amount: toFixed2(
        it.amount != null
          ? it.amount
          : toFixed2(it.quantity) * toFixed2(it.rate) * (1 + toFixed2(it.gst) / 100)
      ),
    }))
    .sort((a, b) => a.description.localeCompare(b.description));
}

function payloadToComparable(payload) {
  return {
    company: {
      name: String(payload.company?.name || "").trim(),
      address: String(payload.company?.address || "").trim(),
      cityStateZip: String(payload.company?.cityStateZip || "").trim(),
      country: String(payload.company?.country || "").trim(),
      contact: String(payload.company?.contact || "").trim(),
    },
    vendor: {
      name: String(payload.vendor?.name || "").trim(),
      address: String(payload.vendor?.address || "").trim(),
      cityStateZip: String(payload.vendor?.cityStateZip || "").trim(),
      country: String(payload.vendor?.country || "").trim(),
    },
    orderInfo: {
      poNumber: String(payload.orderInfo?.poNumber || "").trim(),
      orderDate: String(payload.orderInfo?.orderDate || "").trim(),
      deliveryDate: String(payload.orderInfo?.deliveryDate || "").trim(),
    },
    lineItems: normalizeLineItems(payload.lineItems),
    subTotal: toFixed2(payload.subTotal),
    total: toFixed2(payload.total),
  };
}

function dbOrderToComparable(po) {
  return {
    company: {
      name: String(po.company_name || "").trim(),
      address: String(po.company_address || "").trim(),
      cityStateZip: String(po.company_city_state_zip || "").trim(),
      country: String(po.company_country || "").trim(),
      contact: String(po.company_contact || "").trim(),
    },
    vendor: {
      name: String(po.vendor_name || "").trim(),
      address: String(po.vendor_address || "").trim(),
      cityStateZip: String(po.vendor_city_state_zip || "").trim(),
      country: String(po.vendor_country || "").trim(),
    },
    orderInfo: {
      poNumber: String(po.po_number || "").trim(),
      orderDate: po.order_date ? new Date(po.order_date).toISOString().split("T")[0] : "",
      deliveryDate: po.delivery_date ? new Date(po.delivery_date).toISOString().split("T")[0] : "",
    },
    lineItems: normalizeLineItems(po.line_items || []),
    subTotal: toFixed2(po.sub_total),
    total: toFixed2(po.total),
  };
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Polyfill for FormData in Node.js environment (required by googleapis/gaxios on Node <18)
if (typeof FormData === 'undefined') {
  global.FormData = require('form-data');
}

// Polyfill for Headers in Node.js environment
if (typeof Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init) {
      this._headers = new Map();
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.set(key, value));
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => this.set(key, value));
        }
      }
    }
    
    get(name) {
      return this._headers.get(name.toLowerCase());
    }
    
    set(name, value) {
      this._headers.set(name.toLowerCase(), value);
    }
    
    has(name) {
      return this._headers.has(name.toLowerCase());
    }
    
    delete(name) {
      return this._headers.delete(name.toLowerCase());
    }
    
    forEach(callback) {
      this._headers.forEach(callback);
    }
    
    entries() {
      return this._headers.entries();
    }
    
    keys() {
      return this._headers.keys();
    }
    
    values() {
      return this._headers.values();
    }
    
    [Symbol.iterator]() {
      return this._headers[Symbol.iterator]();
    }
  };
}

// Polyfill for Blob in Node.js environment
if (typeof Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(parts = [], options = {}) {
      this._parts = Array.isArray(parts) ? parts : [parts];
      this._type = options.type || '';
      this._size = 0;
      
      // Calculate size
      for (const part of this._parts) {
        if (typeof part === 'string') {
          this._size += Buffer.byteLength(part, 'utf8');
        } else if (Buffer.isBuffer(part)) {
          this._size += part.length;
        } else if (part instanceof ArrayBuffer) {
          this._size += part.byteLength;
        } else if (part instanceof Uint8Array) {
          this._size += part.length;
        }
      }
    }
    
    get type() {
      return this._type;
    }
    
    get size() {
      return this._size;
    }
    
    slice(start = 0, end = this._size, contentType = '') {
      const slicedParts = [];
      let currentPos = 0;
      
      for (const part of this._parts) {
        if (currentPos >= end) break;
        
        const partStart = Math.max(0, start - currentPos);
        const partEnd = Math.min(part.length || part.byteLength || 0, end - currentPos);
        
        if (partStart < partEnd) {
          if (typeof part === 'string') {
            slicedParts.push(part.slice(partStart, partEnd));
          } else if (Buffer.isBuffer(part)) {
            slicedParts.push(part.slice(partStart, partEnd));
          } else if (part instanceof ArrayBuffer) {
            slicedParts.push(part.slice(partStart, partEnd));
          } else if (part instanceof Uint8Array) {
            slicedParts.push(part.slice(partStart, partEnd));
          }
        }
        
        currentPos += part.length || part.byteLength || 0;
      }
      
      return new Blob(slicedParts, { type: contentType });
    }
    
    arrayBuffer() {
      return Promise.resolve(this._toArrayBuffer());
    }
    
    text() {
      return Promise.resolve(this._toString());
    }
    
    stream() {
      // Return a simple readable stream
      const { Readable } = require('stream');
      const blobInstance = this;
      return new Readable({
        read() {
          const data = blobInstance._toString();
          this.push(data);
          this.push(null);
        }
      });
    }
    
    _toArrayBuffer() {
      const buffers = [];
      for (const part of this._parts) {
        if (typeof part === 'string') {
          buffers.push(Buffer.from(part, 'utf8'));
        } else if (Buffer.isBuffer(part)) {
          buffers.push(part);
        } else if (part instanceof ArrayBuffer) {
          buffers.push(Buffer.from(part));
        } else if (part instanceof Uint8Array) {
          buffers.push(Buffer.from(part));
        }
      }
      return Buffer.concat(buffers).buffer;
    }
    
    _toString() {
      let result = '';
      for (const part of this._parts) {
        if (typeof part === 'string') {
          result += part;
        } else if (Buffer.isBuffer(part)) {
          result += part.toString('utf8');
        } else if (part instanceof ArrayBuffer) {
          result += Buffer.from(part).toString('utf8');
        } else if (part instanceof Uint8Array) {
          result += Buffer.from(part).toString('utf8');
        }
      }
      return result;
    }
  };
}

const createPurchaseOrder = asyncHandler(async (req, res) => {
  try {
    const { company, vendor, orderInfo, lineItems, subTotal, taxRate, taxAmount, total } = req.body;

    // Basic validation
    if (!company || !company.name || !company.address || !company.cityStateZip || !company.country) {
      return res.status(400).json({ success: false, message: "Company information is required: name, address, cityStateZip, country" });
    }
    
    if (!vendor || !vendor.name || !vendor.address || !vendor.cityStateZip || !vendor.country) {
      return res.status(400).json({ success: false, message: "Vendor information is required: name, address, cityStateZip, country" });
    }
    
    if (!orderInfo || !orderInfo.poNumber) {
      return res.status(400).json({ success: false, message: "PO number is required" });
    }
    
    if (!lineItems || lineItems.length === 0) {
      return res.status(400).json({ success: false, message: "At least one line item is required" });
    }
    
    // Validate line items (allow rate 0, require qty > 0)
    for (const [idx, item] of lineItems.entries()) {
      if (!item.description || String(item.description).trim().length === 0) {
        return res.status(400).json({ success: false, message: `Line item ${idx + 1}: description is required` });
      }
      const qty = Number(item.quantity);
      const rate = Number(item.rate);
      const gst = Number(item.gst || 0);
      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: `Line item ${idx + 1}: quantity must be > 0` });
      }
      if (!Number.isFinite(rate) || rate < 0) {
        return res.status(400).json({ success: false, message: `Line item ${idx + 1}: rate must be >= 0` });
      }
      if (!Number.isFinite(gst) || gst < 0) {
        return res.status(400).json({ success: false, message: `Line item ${idx + 1}: gst must be >= 0` });
      }
    }

    // Generate a unique reference ID for database management (numbers only)
    const uniqueId = `${Date.now()}${Math.floor(Math.random() * 1000000)}`;

    const normalizedOrderDate = orderInfo.orderDate ? new Date(orderInfo.orderDate) : null;
    const normalizedDeliveryDate = orderInfo.deliveryDate ? new Date(orderInfo.deliveryDate) : null;

    const purchaseOrder = await PurchaseOrder.create(
      {
        company_name: company.name,
        company_address: company.address,
        company_city_state_zip: company.cityStateZip,
        company_country: company.country,
        company_contact: company.contact,  // NEW FIELD
        unique_id: uniqueId,  // NEW FIELD

        vendor_name: vendor.name,
        vendor_address: vendor.address,
        vendor_city_state_zip: vendor.cityStateZip,
        vendor_country: vendor.country,

        po_number: orderInfo.poNumber, // User-provided PO number (not unique)
        order_date: normalizedOrderDate,
        delivery_date: normalizedDeliveryDate,

        sub_total: subTotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total: total,

        line_items: lineItems.map((item) => {
          const qty = Number(item.quantity) || 0;
          const rate = Number(item.rate) || 0;
          const gst = Number(item.gst) || 0;
          const amount = item.amount != null ? item.amount : qty * rate * (1 + gst / 100);
          return {
            description: item.description,
            quantity: qty,
            rate: rate,
            amount: amount,
            gst: gst,
          }
        }),
      },
      {
        include: [{ model: LineItem, as: "line_items" }],
      }
    );

    // Add the unique_id to the response
    const responseData = {
      ...purchaseOrder.toJSON(),
      unique_id: uniqueId
    };

    res.status(201).json({ 
      success: true, 
      message: "Purchase order created successfully", 
      data: responseData,
      unique_id: uniqueId
    });
  } catch (error) {
    console.error("Error saving purchase order:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const updateGoogleSheet = asyncHandler(async (req, res) => {
  try {
    const { company, vendor, orderInfo, lineItems, subTotal, gst, total, uniqueId } = req.body;

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

    // Generate unique_id if not provided (numbers only)
    const finalUniqueId = uniqueId || `${Date.now()}${Math.floor(Math.random() * 1000000)}`;

    const rows = lineItems.map((item) => [
      company.name,                    // A: Company Name
      company.address,                 // B: Company Address
      company.cityStateZip,            // C: Company City State Zip
      company.country,                 // D: Company Country
      vendor.name,                     // E: Vendor Name
      vendor.address,                  // F: Vendor Address
      vendor.cityStateZip,             // G: Vendor City State Zip
      vendor.country,                  // H: Vendor Country
      orderInfo.poNumber,              // I: PO Number
      orderInfo.orderDate,             // J: Order Date
      orderInfo.deliveryDate,          // K: Delivery Date
      total,                            // L: Total
      item.description,                // M: Item Description
      item.quantity,                   // N: Quantity
      item.rate,                       // O: Rate
      item.amount,                     // P: Amount
      item.gst,                        // Q: GST
      finalUniqueId,                   // R: Unique ID
    ]);

    // Add an empty row after the data for better spacing
    rows.push(Array(18).fill('')); // Empty row with same number of columns

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:R",
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

const checkDuplicatePurchaseOrder = asyncHandler(async (req, res) => {
  try {
    const payload = req.body;
    const comparable = payloadToComparable(payload);

    const candidates = await PurchaseOrder.findAll({
      where: {
        po_number: payload?.orderInfo?.poNumber || "",
        company_name: payload?.company?.name || "",
        vendor_name: payload?.vendor?.name || "",
      },
      include: [{ model: LineItem, as: "line_items" }],
      order: [[{ model: LineItem, as: "line_items" }, "id", "ASC"]],
    });

    for (const po of candidates) {
      const compDb = dbOrderToComparable(po);
      if (deepEqual(comparable, compDb)) {
        return res.json({ exists: true, unique_id: po.unique_id });
      }
    }

    return res.json({ exists: false });
  } catch (error) {
    console.error("Error checking duplicate PO:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = { createPurchaseOrder, updateGoogleSheet, checkDuplicatePurchaseOrder };
