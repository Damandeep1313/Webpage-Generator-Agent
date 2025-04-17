const express = require('express');
const axios = require("axios");
const AdmZip = require("adm-zip");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const cors = require("cors");

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Load Azure OpenAI details from .env
const azureOpenAiApiKey = process.env.AZURE_OPENAI_API_KEY;
const azureOpenAiEndpoint = process.env.AZURE_OPENAI_ENDPOINT_O3;

if (!azureOpenAiApiKey || !azureOpenAiEndpoint) {
  console.error("Missing Azure OpenAI API Key or Endpoint in .env file.");
  process.exit(1); // Exit if API key or endpoint is missing
}

async function generateLandingPage(systemMessage, userMessage) {
  try {
    console.log("/nl-generate-landing-page: calling Azure OpenAI...");

    const azureResponse = await axios.post(
      azureOpenAiEndpoint, // Endpoint from the .env file
      {
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": azureOpenAiApiKey, // API Key from .env file
        },
      }
    );

    console.log("Azure OpenAI response:", azureResponse.data);
    return azureResponse.data; // Return the response or further process as needed
  } catch (err) {
    console.error("Error during Azure OpenAI call:", err.message);
    throw err; // Rethrow the error to handle further upstream if needed
  }
}

const BASE_PROMPT = `
You are an elite senior web designer and frontend engineer at a top creative agency. Your task is to generate a fully responsive, modern, and visually stunning HTML page using HTML5, CSS3, and minimal JavaScript. The page you create must adhere to the highest design standards and be sophisticated, polished, and visually compelling enough to attract investors and secure funding.

Principles to follow:
Semantic HTML: The structure must be clean, accessible, and optimized for SEO.

High-Quality, Maintainable CSS: Focus on scalable, modular, and well-organized CSS. Use inline styles or embedded style tags.

Advanced UI/UX Design:

Focus on user-centric design with intuitive navigation.

Incorporate ample whitespace, visual hierarchy, and readable typography.

Implement a sophisticated, modern, and elegant color palette (blues, purples, gradients, dark/light themes).

CSS Layouts: Use CSS Grid and Flexbox to create stunning, responsive layouts.

Responsive Design: Ensure the page is fully mobile-responsive with smooth transitions and animations.

Polished Text and Typography: Use polished fonts and ensure readability across all devices.

Minimal JavaScript: Use JS only when necessary, ensuring smooth functionality for forms, buttons, or animations.

Performance: Optimize images, animations, and code to ensure fast load times.

Key Instructions:
Length: The code generated must be at least 700 lines, with enough content and structure to meet the needs of a high-quality landing page.

Content:

Hero section with a catchy headline and strong call-to-action button.

Features section to highlight key product features in a sophisticated way.

Customer testimonials section with elegant and clean design.

Footer with contact information, social media links, and any other essential info.

Ensure that the page feels like a high-end, professional business website designed to attract investors.

The final HTML, CSS, and optional JavaScript should be comprehensive, elegant, and designed with high-level attention to detail. It should reflect the quality and professionalism that would attract top-tier investors.

You have to just give the code no extra information in the response.This must be followed very strictly.
`;

app.post("/generate-and-deploy", async (req, res) => {
  try {
    const prompt = req.body.prompt;
    const netlifyToken = req.headers["x-netlify-token"];
    const netlifySiteId = req.headers["x-netlify-site-id"];

    if (!prompt) return res.status(400).json({ error: "Missing prompt in body." });
    if (!netlifyToken) return res.status(400).json({ error: "Missing Netlify token." });
    if (!netlifySiteId) return res.status(400).json({ error: "Missing Netlify site ID." });

    // 1. Generate HTML from Azure OpenAI
    const systemMessage = BASE_PROMPT;
    const userMessage = prompt;

    const azureResponse = await generateLandingPage(systemMessage, userMessage);
    const html = azureResponse.choices[0].message.content;

    // 2. Zip HTML in memory
    const zip = new AdmZip();
    zip.addFile("index.html", Buffer.from(html, "utf8"));
    const zipBuffer = zip.toBuffer();

    // 3. Deploy to Netlify
    const deployUrl = `https://api.netlify.com/api/v1/sites/${netlifySiteId}/deploys`;
    const response = await axios.post(deployUrl, zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        Authorization: `Bearer ${netlifyToken}`,
      },
    });

    const liveUrl = response.data.deploy_ssl_url || response.data.deploy_url;

    return res.json({ success: true, url: liveUrl });
  } catch (err) {
    console.error("Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
