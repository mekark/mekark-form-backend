import express from "express";
import { Resend } from "resend";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";

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
  origin: 'https://www.mekark.com',
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(multers.single("resume"));

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Enquiry form endpoint
app.post("/api/enquiry-form", async (req, res) => {
  const { name, email, phone, select, message } = req.body;
  try {
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
