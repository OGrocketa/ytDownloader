document.getElementById("downloadButton").onclick = async function(event) {
    console.log("JavaScript is running!");
    event.preventDefault();
    const videoUrl = document.getElementById('videoUrl').value;
    const errorMessage = document.getElementById('error-message');
    const videoPreview = document.getElementById('videoPreview');
    const typeSelectButtons = document.getElementById('typeSelectButtons');
    const mp3Option = document.getElementById('mp3');
    const mp4Option = document.getElementById('mp4');
    let selectedFormat = '';
    const button = document.getElementById('downloadButton');
    const submitDiv = document.getElementById('Submit');

    if (button.textContent == 'Find') {
        displayPreview(videoUrl,errorMessage,videoPreview,typeSelectButtons,submitDiv,button);

    } else if (button.textContent == 'Download') {
        selectedFormat = checkFormat(mp3Option, mp4Option,errorMessage);

        // Clear any previous error message
        errorMessage.textContent = '';

        // Download video 
        // Make a request to download the file
        try {
            console.log("Starting download...");

            const filename = initDownloadFile(videoUrl,selectedFormat);

            console.log("Download finishid serving the file...");

            serveFile(filename, selectedFormat);
            
            screenReset(videoPreview,typeSelectButtons,button,submitDiv);
           
        } catch (error) {
            errorMessage.textContent = `Download failed: ${error.message}`;
            errorMessage.style.color = 'red';
        }
    }
}

// Function to validate the YouTube URL
function isValidUrl(url) {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    return pattern.test(url);
}

// Function to extract YouTube video ID from the URL
function extractVideoId(url) {
    const urlObj = new URL(url);
    let videoId = urlObj.searchParams.get("v"); // For YouTube URLs like https://www.youtube.com/watch?v=videoId

    if (!videoId) {
        // For short YouTube URLs like https://youtu.be/videoId
        const pathSegments = urlObj.pathname.split('/');
        videoId = pathSegments[pathSegments.length - 1];
    }

    return videoId;
}

function displayPreview(videoUrl, errorMessage,videoPreview,typeSelectButtons,submitDiv,button){
    if (!videoUrl || !isValidUrl(videoUrl)) {
        errorMessage.textContent = 'Please enter a valid YouTube URL.';
        errorMessage.style.color = 'red';
        videoPreview.innerHTML = '';  // Clear any previous video preview
        typeSelectButtons.style.display = 'none'; // Hide type selection buttons
        submitDiv.classList.remove('preview-visible'); // Hide additional margin
        return;
    } else {
        errorMessage.textContent = '';   
        const videoId = extractVideoId(videoUrl);

        videoPreview.innerHTML = `
            <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" 
                 alt="Video Preview" style="width: 100%; max-width: 560px; cursor: pointer;" 
                 onclick="window.open('https://www.youtube.com/watch?v=${videoId}', '_blank')">`;
        
        typeSelectButtons.style.display = 'block';
        button.textContent = "Download";
        submitDiv.classList.add('preview-visible'); // Add additional margin
    }
}

function checkFormat(mp3Option,mp4Option,errorMessage){
    // Check if MP3 or MP4 is selected
    if (mp3Option.checked) {
        selectedFormat = 'mp3';
    } else if (mp4Option.checked) {
        selectedFormat = 'mp4';
    } else {
        errorMessage.textContent = 'Please select the file format (MP3 or MP4).';
        errorMessage.style.color = 'red';
        return;
    }
    return selectedFormat;
} 


async function initDownloadFile(videoUrl, selectedFormat){
    const response = await fetch(`http://127.0.0.1:8000/start-download`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            url: videoUrl,
            file_format: selectedFormat
        })
    });
    
    if (!response.ok) {

        throw new Error(`Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.filename;
}

// Function to fetch and download the file after it has been prepared
async function serveFile(filename, selectedFormat) {
    const response = await fetch(`http://127.0.0.1:8000/serve-file/${filename}`);

    if (!response.ok) {
        throw new Error(`Error fetching file: ${response.statusText}`);
    }

    // Convert response to blob
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;

    const clickHandler = () => {
        setTimeout(() => {
            URL.revokeObjectURL(downloadUrl);
            a.removeEventListener('click', clickHandler);
        }, 150);
    };

    a.addEventListener('click', clickHandler, false);
    a.click();
}

function screenReset(videoPreview,typeSelectButtons,button,submitDiv){
    videoPreview.innerHTML = '';  // Clear video preview
    typeSelectButtons.style.display = 'none'; // Hide type selection buttons
    document.getElementById('videoUrl').value = ''; // Clear URL input field
    button.textContent = 'Find'; // Reset button text
    submitDiv.classList.remove('preview-visible'); // Remove additional margin
}
