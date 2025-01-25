from fastapi import FastAPI, Response, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import socketio
import uvicorn
import os
import base64
from videoDownloader import download_sign_video
from databasecommunication import DatabaseManager
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS

# Create FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create videos directories if they don't exist
os.makedirs("sign_videos", exist_ok=True)
os.makedirs("recorded_videos", exist_ok=True)

# Create Socket.IO server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
db_manager = DatabaseManager()
# Store last 100 acceleration readings
acceleration_readings = []
MAX_READINGS = 100

# Data models
class AccelerationData(BaseModel):
    x: float
    y: float
    z: float

class SearchWord(BaseModel):
    word: str

class VideoUpload(BaseModel):
    video_data: str
    username: str
    label: str
    mime_type: str

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    # Send current acceleration history to newly connected client
    await sio.emit('acceleration-history', acceleration_readings, room=sid)

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

# REST endpoint for receiving acceleration data
@app.post("/acceleration")
async def receive_acceleration(data: AccelerationData):
    reading = {
        **data.dict(),
        "timestamp": int(datetime.now().timestamp() * 1000)  # milliseconds
    }
    
    acceleration_readings.append(reading)
    
    # Keep only last MAX_READINGS
    if len(acceleration_readings) > MAX_READINGS:
        acceleration_readings.pop(0)
    
    # Broadcast to all connected Socket.IO clients
    await sio.emit('acceleration-update', reading)
    
    return {"message": "Data received successfully"}

# REST endpoint for getting acceleration data
@app.get("/acceleration")
async def get_acceleration():
    return acceleration_readings

# REST endpoint for searching sign language words
@app.post("/search-sign")
async def search_sign(data: SearchWord):
    try:
        # First, try to get the video from the database
        stored_video = db_manager.get_sign_video(data.word.lower())
        if stored_video:
            print(f"Found video for '{data.word}' in database")
            video_data = eval(stored_video[2])  # Convert string back to dict
            return {
                "status": "success",
                "message": f"Video for '{data.word}' retrieved from database",
                "videoData": video_data["video_data"],
                "mimeType": video_data["mime_type"]
            }

        # If not in database, try to download it
        video_data = download_sign_video(data.word)
        if video_data:
            # Store the video in the database
            video_info = {
                "video_data": video_data,
                "mime_type": "video/mp4",
                "timestamp": datetime.now().isoformat()
            }
            db_manager.add_sign_video(data.word.lower(), str(video_info))
            
            return {
                "status": "success",
                "message": f"Video for '{data.word}' downloaded and stored",
                "videoData": video_data,
                "mimeType": "video/mp4"
            }
        else:
            return {
                "status": "error",
                "message": f"Could not find video for '{data.word}'"
            }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

# REST endpoint for uploading recorded videos
@app.post("/upload-video")
async def upload_video(data: VideoUpload):
    try:
        # Decode base64 video data
        video_data = base64.b64decode(data.video_data)
        
        # Generate UUID (8 characters)
        unique_id = str(uuid.uuid4())[:8]
         
        # Create filename in format: username_label_UUID8
        file_name = f"{data.username}_{data.label}_{unique_id}"
        
        # Convert video data to base64 string for storage
        video_data_str = base64.b64encode(video_data).decode('utf-8')
        
        # Create JSON string with video metadata
        data_json = {
            "video_data": video_data_str,
            "mime_type": data.mime_type,
            "timestamp": datetime.now().isoformat()
        }
        
        # Add to database as JSON string
        db_manager.add_data(file_name, str(data_json))

        # Create user if doesn't exist and increment count
        user = db_manager.get_user(data.username)
        if not user:
            db_manager.create_user(data.username, "")  # Empty password as it's not needed
        db_manager.update_user_count(data.username)
            
        # Get current time in a readable format
        current_time = datetime.now().strftime("%I:%M:%S %p")
            
        return {
            "status": "success",
            "message": f"Video uploaded successfully at {current_time}",
            "file_name": file_name
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error uploading video: {str(e)}"
        }

# Mount Socket.IO app
socket_app = socketio.ASGIApp(sio, app)

@app.get("/user-counts")
async def get_user_counts():
    try:
        # Get all users and their video counts
        users = db_manager.get_users()
        # Transform the data to include username and count
        user_counts = [{'username': user[1], 'count': user[3]} for user in users]
        return {
            'status': 'success',
            'users': user_counts
        }
    except Exception as e:
        print('Error in get_user_counts:', str(e))
        return {
            'status': 'error',
            'message': str(e)
        }

if __name__ == "__main__":
    print("🚀 Starting server...")
    print("📡 Endpoints:")
    print("   POST /acceleration - Send acceleration data")
    print("   GET  /acceleration - Get all readings")
    print("   POST /search-sign  - Search for sign language videos")
    print("   POST /upload-video - Upload a recorded video")
    print("   WS   /socket.io   - Real-time updates")
    uvicorn.run(socket_app, host="0.0.0.0", port=3000)
