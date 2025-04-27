// server.js (Final Version)

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const app = express();

app.use(express.json({
    type: ['application/json', 'application/x-www-form-urlencoded']
}));

require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // your OpenAI API key
const ASSISTANT_ID = process.env.ASSISTANT_ID; // your Assistant ID

app.post('/upload-knowledge', async (req, res) => {
    try {
        console.log('🔔 Received a knowledge upload request!');

        const articles = Array.isArray(req.body) ? req.body : [req.body]; // Wrap single article as array if needed
        console.log('📄 Articles received:', articles.map(a => ({ title: a.title, url: a.url })));

        for (const article of articles) {
            if (!article.title || !article.content || !article.url) {
                console.error('⚠️ Missing article fields:', article);
                continue;
            }

            const articleText = `
            Title: ${article.title}
            Summary: ${article.summary || ''}
            URL: ${article.url}
            
            Content:
            ${article.content}
            `;

            const fileName = `./temp_${Date.now()}_${article.title.replace(/\s+/g, '_')}.txt`;
            fs.writeFileSync(fileName, articleText);

            // Step 1: Upload file to OpenAI
            const formData = new FormData();
            formData.append('file', fs.createReadStream(fileName));
            formData.append('purpose', 'assistants');

            const uploadResponse = await axios.post('https://api.openai.com/v1/files', formData, {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    ...formData.getHeaders()
                }
            });

            const fileId = uploadResponse.data.id;
            console.log('✅ File uploaded with ID:', fileId);

            // Step 2: Attach file to Assistant's Vector Store
            await axios.post(`https://api.openai.com/v1/assistants/${ASSISTANT_ID}/files`, 
            { file_id: fileId }, 
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ File attached to Assistant successfully.');

            fs.unlinkSync(fileName); // Delete temp file
        }

        res.send('✅ All knowledge articles uploaded and linked successfully!');
    } catch (error) {
        console.error('❌ Upload failed:', error.response?.data || error.message);
        res.status(500).send('Error uploading and linking file');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));