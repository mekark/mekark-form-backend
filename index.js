import express from "express";
import { Resend } from "resend";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";
import mongoose from "mongoose";

// Load environment variables
dotenv.config();

const storage = multer.diskStorage({
  destination: "uploads",
});

const app = express();
const multers = multer({ storage });
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(multers.single("resume"));

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);
const MONGODB_URI = process.env.MONGO_URL;

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB on Railway");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Email Schema
const emailSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, default: "N/A" },
  phone: { type: String, required: true },
  select: { type: String, default: "N/A" },
  message: { type: String, default: "N/A" },
  timestamp: { type: Date, default: Date.now },
});

const Email = mongoose.model("Email", emailSchema);

// Enquiry form endpoint
app.post("/api/enquiry-form", async (req, res) => {
  const { name, email, phone, select, message } = req.body;
  try {
    const newEmail = new Email({
      name,
      email: email || "N/A",
      phone,
      message: message || "N/A",
    });

    const result = await newEmail.save();
    if (result && result._id) {
      console.log("✅ Email successfully saved to database");
      console.log("📧 Document ID:", result._id);
    } else {
      console.log("❌ Email NOT saved to database");
      console.log("📝 Result:", result);
    }

    const htmlContent = `
      <h2>Request for this Client</h2>
      <table border="1" cellpadding="5" cellspacing="0">
        <tr><td><strong>Name:</strong></td><td>${name}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
        <tr><td><strong>Phone:</strong></td><td>${phone}</td></tr>
        <tr><td><strong>Service:</strong></td><td>${select}</td></tr>
        <tr><td><strong>Message:</strong></td><td>${message}</td></tr>
      </table>
    `;

    // Send email using Resend API
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: process.env.TO_EMAIL,
      subject: "New website Enquiry Form Submission",
      html: htmlContent,
    });

    res.status(200).json({ message: "Enquiry sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send enquiry" });
  }
});

// Career form endpoint
app.post("/api/career-form", async (req, res) => {
  const { name, email, phone, role, message } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "Resume file is required" });
  }

  try {
    const htmlContent = `
      <h2>Request for this Client</h2>
      <table border="1" cellpadding="5" cellspacing="0">
        <tr><td><strong>Name:</strong></td><td>${name}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
        <tr><td><strong>Phone:</strong></td><td>${phone}</td></tr>
        <tr><td><strong>Role:</strong></td><td>${role}</td></tr>
        <tr><td><strong>Message:</strong></td><td>${message}</td></tr>
      </table>
    `;

    // Convert file to base64 for Resend attachment
    const fileData = fs.readFileSync(file.path).toString("base64");

    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: process.env.TO_EMAIL,
      subject: "New Career Form Submission",
      html: htmlContent,
      attachments: [
        {
          filename: file.originalname,
          content: fileData,
        },
      ],
      reply_to: email,
    });

    fs.unlinkSync(file.path); // cleanup
    res.status(200).json({ message: "Career enquiry sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send enquiry" });
  }
});


app.get("/api/emails", async (req, res) => {
  try {
    const emails = await Email.find().sort({ timestamp: -1 });

    // If client wants JSON (API call)
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.json({
        success: true,
        count: emails.length,
        data: emails,
      });
    }

    // Simple HTML Table view for browser
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Email Submissions</title>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 20px;
                background: #f5f5f5;
            }
            .container {
                background: white;
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            h1 {
                color: #333;
                margin-bottom: 20px;
                text-align: center;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }
            th, td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #ddd;
            }
            th {
                background-color: #4CAF50;
                color: white;
            }
            tr:hover {
                background-color: #f5f5f5;
            }
            .count {
                text-align: center;
                margin: 10px 0;
                color: #666;
            }
            .no-data {
                text-align: center;
                padding: 40px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Email Submissions</h1>
            <div class="count">Total: ${emails.length} records</div>
    `;

    if (emails.length === 0) {
      html += `
            <div class="no-data">
                No email submissions found.
            </div>
      `;
    } else {
      html += `
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Service</th>
                        <th>Message</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
      `;

      emails.forEach((email) => {
        html += `
                    <tr>
                        <td>${email.name}</td>
                        <td>${email.email}</td>
                        <td>${email.phone}</td>
                        <td>${email.select}</td>
                        <td>${email.message}</td>
                        <td>${new Date(email.timestamp).toLocaleString()}</td>
                    </tr>
        `;
      });

      html += `
                </tbody>
            </table>
      `;
    }

    html += `
        </div>
    </body>
    </html>
    `;

    res.send(html);
  } catch (error) {
    console.error("❌ Error fetching emails:", error);

    // Simple HTML error response
    if (
      !req.headers.accept ||
      !req.headers.accept.includes("application/json")
    ) {
      return res.send(`
        <html>
        <head><title>Error</title></head>
        <body>
            <h2>Error Loading Emails</h2>
            <p>Failed to load email data. Please try again later.</p>
        </body>
        </html>
      `);
    }

    res.status(500).json({
      success: false,
      message: "Error fetching emails",
    });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});


