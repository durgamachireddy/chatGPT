const express = require('express');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const app = express();
app.use(express.json());
require('dotenv').config({ path: './api.env' });


const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // your OpenAI API key
const ASSISTANT_ID = 'asst_DMtgtvCplYXOYt0LmuuSMJWW'; // your Assistant ID

app.post('/upload-knowledge', async (req, res) => {
    try {
        const { title, summary, content, url } = req.body;

        const articleText = `
        Title: ${title}
        Summary: ${summary}
        URL: ${url}
        
        Content:
        ${content}
        `;

        const fileName = `./temp_${Date.now()}_${title.replace(/\s+/g, '_')}.txt`;
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
        console.log('File uploaded with ID:', fileId);

        // Step 2: Attach file to Assistant's Vector Store
        await axios.post(`https://api.openai.com/v1/assistants/${ASSISTANT_ID}/files`, 
        {
            file_id: fileId
        }, 
        {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('File attached to Assistant successfully.');

        fs.unlinkSync(fileName); // Delete the temp file

        res.send('Knowledge Article Uploaded and Linked Successfully!');
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).send('Error uploading and linking file');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
