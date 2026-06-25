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

function hasValue(value) {
  if (value == null) return false;
  return String(value).trim().length > 0;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fieldRow(label, value, { link } = {}) {
  if (!hasValue(value)) return "";

  const safe = escapeHtml(value);
  let display = safe;
  if (link === "email") {
    display = `<a href="mailto:${safe}" style="color:#2563eb;text-decoration:none;">${safe}</a>`;
  } else if (link === "phone") {
    display = `<a href="tel:${safe.replace(/\s/g, "")}" style="color:#18181b;text-decoration:none;">${safe}</a>`;
  }

  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e4e4e7;color:#71717a;font-size:14px;width:140px;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:12px 0;border-bottom:1px solid #e4e4e7;color:#18181b;font-size:14px;font-weight:600;vertical-align:top;">${display}</td>
    </tr>`;
}

function emailSection(title, rowsHtml) {
  if (!rowsHtml.trim()) return "";
  return `
    <tr>
      <td style="padding:24px 32px 0;">
        <p style="margin:0 0 12px;color:#71717a;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">${escapeHtml(title)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
      </td>
    </tr>`;
}

function buildEnquiryEmail({ formDomain, sourceName, fields }) {
  const subtitle = sourceName && sourceName !== formDomain
    ? `${escapeHtml(formDomain)} · ${escapeHtml(sourceName)}`
    : escapeHtml(formDomain);

  const contactRows = [
    fieldRow("Name", fields.name),
    fieldRow("Email", fields.email, { link: "email" }),
    fieldRow("Phone", fields.phone, { link: "phone" }),
  ].join("");

  const projectRows = [
    fieldRow("Project", sourceName),
    fieldRow("Service", fields.service),
    fieldRow("Start Timeline", fields.startTimeline),
    fieldRow("Budget", fields.budget),
    fieldRow("Location", fields.location),
    fieldRow("SQF", fields.sqf),
    fieldRow("Company", fields.company),
    fieldRow("Industry", fields.industry),
    fieldRow("Storage Type", fields.storageType),
  ].join("");

  const messageSection = hasValue(fields.message)
    ? `
    <tr>
      <td style="padding:24px 32px 0;">
        <p style="margin:0 0 12px;color:#71717a;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Message</p>
        <div style="background:#f4f4f5;border-radius:8px;padding:16px;color:#18181b;font-size:14px;line-height:1.5;">${escapeHtml(fields.message)}</div>
      </td>
    </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:32px 16px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;border-bottom:1px solid #e4e4e7;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:12px;vertical-align:middle;padding-right:10px;">
                    <div style="width:10px;height:10px;background:#16a34a;border-radius:50%;"></div>
                  </td>
                  <td style="vertical-align:middle;">
                    <h1 style="margin:0;color:#18181b;font-size:24px;font-weight:700;line-height:1.2;">New Enquiry</h1>
                  </td>
                </tr>
              </table>
              <p style="margin:8px 0 0;color:#71717a;font-size:14px;">${subtitle}</p>
            </td>
          </tr>
          ${emailSection("Contact", contactRows)}
          ${emailSection("Project Details", projectRows)}
          ${messageSection}
          <tr>
            <td style="padding:24px 32px 32px;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;">Received via ${escapeHtml(formDomain)} enquiry form</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEnquiryText({ formDomain, sourceName, fields }) {
  const lines = ["New Enquiry", ""];

  if (sourceName && sourceName !== formDomain) {
    lines.push(`${formDomain} · ${sourceName}`, "");
  } else {
    lines.push(formDomain, "");
  }

  const addSection = (title, entries) => {
    const filled = entries.filter(([, value]) => hasValue(value));
    if (!filled.length) return;
    lines.push(title);
    for (const [label, value] of filled) {
      lines.push(`${label}: ${value}`);
    }
    lines.push("");
  };

  addSection("CONTACT", [
    ["Name", fields.name],
    ["Email", fields.email],
    ["Phone", fields.phone],
  ]);

  addSection("PROJECT DETAILS", [
    ["Project", sourceName],
    ["Service", fields.service],
    ["Start Timeline", fields.startTimeline],
    ["Budget", fields.budget],
    ["Location", fields.location],
    ["SQF", fields.sqf],
    ["Company", fields.company],
    ["Industry", fields.industry],
    ["Storage Type", fields.storageType],
  ]);

  if (hasValue(fields.message)) {
    lines.push("MESSAGE", fields.message, "");
  }

  lines.push(`Received via ${formDomain} enquiry form`);
  return lines.join("\n");
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
    startTimeline,
    budget,
    service,
    domain,
    source,
    sourceDomain,
    sourceName,
  } = req.body;
  const formDomain = getFormDomain(req, sourceDomain || domain || source);
  const projectName = sourceName || formDomain;
  const fields = {
    name,
    email,
    phone,
    message,
    location,
    sqf,
    company,
    industry,
    storageType,
    startTimeline,
    budget,
    service,
  };

  try {
    const emailPayload = { formDomain, sourceName, fields };
    const htmlContent = buildEnquiryEmail(emailPayload);
    const textContent = buildEnquiryText(emailPayload);

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: process.env.TO_EMAIL,
      subject: `New Enquiry from ${projectName} (${formDomain})`,
      html: htmlContent,
      text: textContent,
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
