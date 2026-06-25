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

function getFormDomain(req, bodyDomain) {
  if (bodyDomain) return bodyDomain;

  const origin = req.headers.origin;
  if (origin) {
    try {
      return new URL(origin).hostname;
    } catch {
      return origin;
    }
  }

  const referer = req.headers.referer;
  if (referer) {
    try {
      return new URL(referer).hostname;
    } catch {
      return referer;
    }
  }

  return "Unknown";
}

// Enquiry form endpoint
app.post("/api/enquiry-form", async (req, res) => {
  const {
    name,
    email,
    phone,
    message,
    location,
    sqf,
    company,
    industry,
    storageType,
    domain,
    source,
    sourceDomain,
    sourceName,
  } = req.body;
  const formDomain = getFormDomain(req, sourceDomain || domain || source);
  const projectName = sourceName || formDomain;
  try {
    const htmlContent = `
      <h2>Request for this Client</h2>
      <table border="1" cellpadding="5" cellspacing="0">
        <tr><td><strong>Website:</strong></td><td>${formDomain}</td></tr>
        ${sourceName ? `<tr><td><strong>Project:</strong></td><td>${sourceName}</td></tr>` : ""}
        <tr><td><strong>Name:</strong></td><td>${name}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
        <tr><td><strong>Phone:</strong></td><td>${phone}</td></tr>
        ${location ? `<tr><td><strong>Location:</strong></td><td>${location}</td></tr>` : ""}
        ${sqf ? `<tr><td><strong>SQF:</strong></td><td>${sqf}</td></tr>` : ""}
        ${company ? `<tr><td><strong>Company:</strong></td><td>${company}</td></tr>` : ""}
        ${industry ? `<tr><td><strong>Industry:</strong></td><td>${industry}</td></tr>` : ""}
        ${storageType ? `<tr><td><strong>Storage Type:</strong></td><td>${storageType}</td></tr>` : ""}
        ${message ? `<tr><td><strong>Message:</strong></td><td>${message}</td></tr>` : ""}
      </table>
    `;

    // Send email using Resend API
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: process.env.TO_EMAIL,
      subject: `New Enquiry from ${projectName} (${formDomain})`,
      html: htmlContent,
    });

    if (error) {
      console.error("Resend error:", error);
      return res.status(500).json({
        error: "Failed to send enquiry",
        details: error.message,
      });
    }

    console.log("Email sent:", data?.id);
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
