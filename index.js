import express from "express";
import { Resend } from "resend";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(
  cors({
    origin: [
      "https://www.revovest.in/",
      "https://limegreen.studio",
      "https://mekark.limegreenstudios.work",
      "https://www.mekark.com",
      "https://mekark.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(multers.single("resume"));

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Enquiry form endpoint
app.post("/api/enquiry-form", async (req, res) => {
  const { name, email, phone, message, location, sqf, company } = req.body;
  try {
    const htmlContent = `
      <h2>Request for this Client</h2>
      <table border="1" cellpadding="5" cellspacing="0">
        <tr><td><strong>Name:</strong></td><td>${name}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
        <tr><td><strong>Phone:</strong></td><td>${phone}</td></tr>
        ${location ? `<tr><td><strong>Location:</strong></td><td>${location}</td></tr>` : ""}
        ${sqf ? `<tr><td><strong>SQF:</strong></td><td>${sqf}</td></tr>` : ""}
        ${company ? `<tr><td><strong>Company:</strong></td><td>${company}</td></tr>` : ""}
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
