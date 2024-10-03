from pytubefix import YouTube
import re, os , time, shutil
from fastapi import FastAPI, HTTPException,BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI()

DOWNLOAD_DIR = "downloads"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)  # Create the directory if it doesn't exist

def sanitize_title(title):
    return re.sub(r'[\\/*?:"<>|]', "", title)

async def download(url: str, file_format: str):
    yt = YouTube(url)
    title = sanitize_title(yt.title)

    if file_format == 'mp4':
        stream = yt.streams.get_highest_resolution()
        file_path = stream.download(output_path=DOWNLOAD_DIR,filename=f'{title}.mp4')

    elif file_format == 'mp3':
        audio = yt.streams.filter(only_audio=True).first()
        file_path = audio.download(filename=f"{title}.mp3",output_path=DOWNLOAD_DIR)
        
    file_size = get_file_size(file_path)
    

    return file_path

class downloadRequest(BaseModel):
    url: str
    file_format: str

def get_file_size(file_path):
    size_in_bytes = os.path.getsize(file_path)
    size_in_mb = size_in_bytes / (1024 * 1024)  # Convert bytes to megabytes (MB)
    return size_in_mb

# Helper function to stream the file in chunks
def file_iterator(file_path, chunk_size=1024*1024):
    with open(file_path, "rb") as file:
        while chunk := file.read(chunk_size):
            yield chunk

def delete_file(file_path: str):
    try:
        os.remove(file_path)
        print(f"Deleted file: {file_path}")
    except FileNotFoundError:
        print(f"File not found for deletion: {file_path}")


@app.post("/start-download")
async def download_endpoint(request: downloadRequest, background_task: BackgroundTasks):

    url = request.url
    file_format = request.file_format

    if file_format not in ['mp3', 'mp4']:
        raise HTTPException(status_code=400, detail="Invalid format. Choose 'mp3' or 'mp4'.")

    try:
        # Download the file
        file_path = await download(url,file_format)
        filename = os.path.basename(file_path)

    except Exception as e:
        print(e)
    return {"filename": filename}


# Serve the file directly
@app.get("/serve-file/{filename}")
async def serve_file(filename:str, background_task: BackgroundTasks):

    file_path = os.path.join(DOWNLOAD_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    background_task.add_task(delete_file, file_path)

    return StreamingResponse(file_iterator(file_path), media_type="application/octet-stream", 
                             headers={"Content-Disposition": f"attachment; filename={filename}"})



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)   
