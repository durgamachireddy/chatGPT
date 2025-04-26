const express = require('express');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
require('dotenv').config(); // Load .env at top
const app = express();

app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 
const ASSISTANT_ID = process.env.ASSISTANT_ID;

// ➡️ Health check route
app.get('/', (req, res) => {
    res.send('✅ Server is up and running!');
});

// ➡️ Upload route
app.post('/upload-knowledge', async (req, res) => {
    console.log('🔔 Received a knowledge upload request!');

    try {
        const { title, summary, content, url } = req.body;
        console.log('📄 Article received:', { title, url });

        const articleText = `
        Title: ${title}
        Summary: ${summary}
        URL: ${url}
        
        Content:
        ${content}
        `;

        const fileName = `./temp_${Date.now()}_${title.replace(/\s+/g, '_')}.txt`;
        fs.writeFileSync(fileName, articleText);
        console.log(`✅ Temp file created: ${fileName}`);

        // Upload file to OpenAI
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
        console.log('✅ File uploaded to OpenAI with ID:', fileId);

        // Attach file to Assistant
        await axios.post(`https://api.openai.com/v1/assistants/${ASSISTANT_ID}/files`, 
        { file_id: fileId }, 
        {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('🎯 File linked to Assistant successfully.');

        fs.unlinkSync(fileName); // Cleanup
        console.log('🧹 Temp file deleted.');

        res.send('✅ Knowledge Article Uploaded and Linked Successfully!');
    } catch (error) {
        console.error('❌ Upload failed:', error.response?.data || error.message);
        res.status(500).send('🚨 Error uploading and linking file.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
