const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const cv = require('opencv4nodejs');
const app = express();
const port = 3000;

// Set up multer to handle image uploads
const upload = multer({ dest: 'uploads/' });

app.post('/recognize', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }

    // Read the uploaded image using OpenCV
    const image = cv.imread(req.file.path);

    // Process the image (convert to grayscale as an example)
    const grayImage = image.bgrToGray();

    // Perform feature extraction (example: detect faces)
    const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);
    const faces = classifier.detectMultiScale(grayImage).objects;

    // Convert the processed image to base64 (optional, to send to LLM)
    const imageBase64 = cv.imencode('.jpg', grayImage).toString('base64');

    // Create a description prompt for the LLM
    let description = `The image has the following features: Faces detected: ${faces.length}.`;

    // Send the image data to LLM for further recognition or description
    try {
        const response = await fetch('https://api.openai.com/v1/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer YOUR_OPENAI_API_KEY`, // Replace with your OpenAI API key
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4',
                prompt: `Describe the following image: Faces detected: ${faces.length}. Image data: ${imageBase64}`,
                max_tokens: 200,
            }),
        });

        const data = await response.json();
        const result = data.choices[0].text;

        // Send the response back to the frontend
        res.json({ description: result });
    } catch (error) {
        console.error('Error during LLM request:', error);
        res.status(500).json({ error: 'Failed to process image' });
    }
});

app.listen(port, () => {
    console.log(`Backend server is running at http://localhost:${port}`);
});
