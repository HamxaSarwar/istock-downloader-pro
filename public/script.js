document.getElementById('downloadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = document.getElementById('url').value;
    const resultDiv = document.getElementById('result');
    const submitButton = document.querySelector('button[type="submit"]');
    
    // Reset previous results
    resultDiv.textContent = '';
    resultDiv.className = 'mt-4 text-sm';
    
    // Disable button and show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processing...';
    
    try {
        const response = await fetch('/api/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Download failed: ${errorData.error}`);
        }
        
        const contentType = response.headers.get('Content-Type');
        const isVideo = contentType.includes('video');
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = downloadUrl;
        a.download = isVideo ? 'istock_video.mp4' : 'istock_photo.jpg';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        
        resultDiv.textContent = `Download complete! File type: ${isVideo ? 'Video' : 'Photo'}`;
        resultDiv.classList.add('text-green-600');
    } catch (error) {
        console.error('Error:', error);
        resultDiv.textContent = `Error: ${error.message}`;
        resultDiv.classList.add('text-red-600');
    } finally {
        // Re-enable button and restore original text
        submitButton.disabled = false;
        submitButton.textContent = 'Download';
    }
});