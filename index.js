import express from "express";
import multer from "multer";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import path from "path";
import bodyParser from "body-parser";
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = 2000;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'))
app.set('view engine', 'ejs');

let aiGenText = '';

app.get("/", (req, res) => {
    res.render("index", { description: aiGenText ? aiGenText : null });
    aiGenText = '';
});

app.post("/upload", upload.single("image"), async (req, res) => {
    try {
        // Your Gemini Pro Vision configuration
        const API_KEY = process.env.API_KEY;
        const MODEL_NAME = "gemini-pro-vision";

        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        // Process the image
        const generationConfig = {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
        };

        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ];

        // Check if an image was uploaded
        if (!req.file) {
            return res.status(400).send("No image file uploaded");
        }

        const parts = [
            { text: "What is in this image? Describe it." },
            { inlineData: { mimeType: req.file.mimetype, data: req.file.buffer.toString("base64") } },
        ];

        const result = await model.generateContent({
            contents: [{ role: "user", parts }],
            generationConfig,
            safetySettings,
        });

        const response = result.response;
        aiGenText = response.text();

        // Redirect to the root route after processing the form
        res.redirect("/");
    } catch (error) {
        console.error("Error during content generation:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
