const express = require('express');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/api/download', async (req, res) => {
    try {
        const { url } = req.body;
        console.log('Received URL:', url);

        if (!url) {
            throw new Error('No URL provided');
        }

        // Fetch the iStock page
        console.log('Fetching iStock page...');
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        console.log('Page fetched successfully');

        const $ = cheerio.load(response.data);
        
        let downloadLink, fileType;

        // Check if it's a video or photo
        if (url.includes('/video/')) {
            console.log('Detected video URL');
            
            // Log all script tags
            $('script').each((index, element) => {
                console.log(`Script ${index}:`, $(element).html().substring(0, 100) + '...');
            });

            // Try different methods to find the video URL
            const methods = [
                () => $('meta[property="og:video"]').attr('content'),
                () => $('meta[property="og:video:secure_url"]').attr('content'),
                () => {
                    const scriptContent = $('script:contains("window.__INITIAL_STATE__")').html();
                    const match = scriptContent && scriptContent.match(/"previewUrl":"([^"]+)"/);
                    return match && match[1].replace(/\\/g, '');
                },
                () => {
                    const scriptContent = $('script:contains("window.__INITIAL_STATE__")').html();
                    const match = scriptContent && scriptContent.match(/"url":"([^"]+\.mp4)"/);
                    return match && match[1].replace(/\\/g, '');
                }
            ];

            for (const method of methods) {
                downloadLink = method();
                if (downloadLink) {
                    console.log('Video download link found:', downloadLink);
                    fileType = 'video';
                    break;
                }
            }

            if (!downloadLink) {
                console.log('No video download link found using any method');
                fs.writeFileSync('istock_video_page.html', response.data);
                console.log('Video page content saved to istock_video_page.html');
            }
        } else {
            console.log('Detected photo URL');
            downloadLink = $('meta[property="og:image"]').attr('content');
            fileType = 'photo';
            console.log('Photo download link found:', downloadLink);
        }
        
        if (!downloadLink) {
            throw new Error('Download link not found in the page content');
        }
        
        console.log(`Downloading ${fileType} from: ${downloadLink}`);

        // Fetch the file
        const fileResponse = await axios.get(downloadLink, { responseType: 'stream' });
        
        // Set appropriate headers
        res.setHeader('Content-Type', fileResponse.headers['content-type']);
        res.setHeader('Content-Disposition', `attachment; filename=istock_${fileType}`);
        
        // Pipe the file to the response
        fileResponse.data.pipe(res);
    } catch (error) {
        console.error('Error details:', error);
        if (error.response) {
            console.error('Error response:', error.response.status);
            console.error('Error response headers:', error.response.headers);
        }
        res.status(500).json({ 
            error: error.message, 
            stack: error.stack,
            details: error.response ? {
                status: error.response.status,
                headers: error.response.headers
            } : null
        });
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));