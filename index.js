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
      "http://localhost:3000",
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

app.use(express.json({ limit: "10mb" }));
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

function buildCareerEmail({ formDomain, sourceName, fields }) {
  const subtitle =
    sourceName && sourceName !== formDomain
      ? `${escapeHtml(formDomain)} · ${escapeHtml(sourceName)}`
      : escapeHtml(formDomain);

  const applicantRows = [
    fieldRow("Full Name", fields.name),
    fieldRow("Email Address", fields.email, { link: "email" }),
    fieldRow("Current Role / Designation", fields.role),
    fieldRow("Years of Experience", fields.experience),
    fieldRow("Area of Expertise", fields.expertise),
    fieldRow("Application Type", fields.applicationType),
    fieldRow("Resume File", fields.resumeFileName),
  ].join("");

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
                    <div style="width:10px;height:10px;background:#e31b23;border-radius:50%;"></div>
                  </td>
                  <td style="vertical-align:middle;">
                    <h1 style="margin:0;color:#18181b;font-size:24px;font-weight:700;line-height:1.2;">New Career Application</h1>
                  </td>
                </tr>
              </table>
              <p style="margin:8px 0 0;color:#71717a;font-size:14px;">${subtitle}</p>
            </td>
          </tr>
          ${emailSection("Applicant", applicantRows)}
          <tr>
            <td style="padding:24px 32px 32px;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;">Resume attached · Received via ${escapeHtml(formDomain)} career form</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildCareerText({ formDomain, sourceName, fields }) {
  const lines = ["New Career Application", ""];

  if (sourceName && sourceName !== formDomain) {
    lines.push(`${formDomain} · ${sourceName}`, "");
  } else {
    lines.push(formDomain, "");
  }

  const add = (label, value) => {
    if (hasValue(value)) lines.push(`${label}: ${value}`);
  };

  add("Full Name", fields.name);
  add("Email Address", fields.email);
  add("Current Role / Designation", fields.role);
  add("Years of Experience", fields.experience);
  add("Area of Expertise", fields.expertise);
  add("Application Type", fields.applicationType);
  add("Resume File", fields.resumeFileName);

  lines.push("", `Resume attached · Received via ${formDomain} career form`);
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

// Career application endpoint
app.post("/api/career-application", async (req, res) => {
  const {
    name,
    email,
    role,
    experience,
    expertise,
    applicationType,
    sourceDomain,
    sourceName,
    resumeBase64,
    resumeFileName,
    resumeContentType,
  } = req.body;

  const formDomain = getFormDomain(req, sourceDomain);
  const fields = {
    name,
    email,
    role,
    experience,
    expertise,
    applicationType: applicationType || "Open Application",
    resumeFileName,
  };

  if (!hasValue(name)) {
    return res.status(400).json({ error: "Full name is required" });
  }

  if (!hasValue(email)) {
    return res.status(400).json({ error: "Email address is required" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    return res.status(400).json({ error: "Enter a valid email address" });
  }

  if (!hasValue(expertise)) {
    return res.status(400).json({ error: "Area of expertise is required" });
  }

  if (!hasValue(resumeBase64) || !hasValue(resumeFileName)) {
    return res.status(400).json({ error: "Resume is required" });
  }

  try {
    const emailPayload = {
      formDomain,
      sourceName: sourceName || "Career Page",
      fields,
    };
    const htmlContent = buildCareerEmail(emailPayload);
    const textContent = buildCareerText(emailPayload);

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: process.env.TO_EMAIL,
      subject: `Career Application: ${name} — ${expertise}`,
      html: htmlContent,
      text: textContent,
      attachments: [
        {
          filename: resumeFileName,
          content: resumeBase64,
        },
      ],
    });

    if (error) {
      console.error("Resend error:", error);
      return res.status(500).json({
        error: "Failed to send career application",
        details: error.message,
      });
    }

    console.log("Career email sent:", data?.id);
    res.status(200).json({ message: "Application sent successfully!" });
  } catch (error) {
    console.error("Error sending career application:", error);
    res.status(500).json({ error: "Failed to send career application" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
