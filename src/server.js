const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

// Web API polyfills for Node 16 (needed by googleapis/gaxios)
try {
  const { fetch, Headers, Request, Response, FormData, File, Blob } = require('undici');
  if (typeof global.fetch === 'undefined') global.fetch = fetch;
  if (typeof global.Headers === 'undefined') global.Headers = Headers;
  if (typeof global.Request === 'undefined') global.Request = Request;
  if (typeof global.Response === 'undefined') global.Response = Response;
  if (typeof global.FormData === 'undefined') global.FormData = FormData;
  if (typeof global.File === 'undefined') global.File = File;
  if (typeof global.Blob === 'undefined') global.Blob = Blob;
} catch (e) {
  // Ignore if undici is unavailable; deployment should include it
}

try {
  const { ReadableStream } = require('stream/web');
  if (typeof global.ReadableStream === 'undefined') global.ReadableStream = ReadableStream;
} catch (e) {
  // Older Node versions without stream/web
}

const db = require("./models");
const purchaseOrderRouter = require("./routes/purchaseOrderRouter");

const app = express();

// CORS configuration for production
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());


app.use("/purchaseorder", purchaseOrderRouter);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await db.sequelize.authenticate();
    console.log("Database connection established.");
  } catch (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
  app.listen(PORT, '0.0.0.0', () => console.log(`PO backend listening on :${PORT}`));
}

start();


