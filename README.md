# Video Accent Detector API

A service that detects and analyzes accents in videos by processing the audio content. This application breaks down video content into manageable chunks, performs accent analysis on each segment, and provides a comprehensive summary of the detected accents.

## Overview

This application:
1. Takes a video URL (MP4)
2. Extracts and converts the audio to WAV format
3. Divides audio into manageable chunks
4. Analyzes each chunk for accent detection using SpeechBrain
5. Aggregates results and generates an AI-powered summary
6. Provides a task-based API for tracking long-running processes

## Core Technologies

- **Node.js & Express**: Backend API framework
- **FFmpeg**: Audio extraction and processing
- **SpeechBrain**: ML-based accent detection (using the Jzuluaga/accent-id-commonaccent_ecapa model)
- **OpenAI**: Summary generation
- **Docker**: Containerization and deployment

## Architecture

The application follows an asynchronous processing architecture:

1. **Task Creation**: API returns a task ID immediately
2. **Background Processing**: Video processing happens asynchronously
3. **Status Polling**: Clients can check task status using the task ID
4. **Result Retrieval**: Completed task results can be accessed via the API

## Deployment

Deployment is simple with Docker:

```bash
sudo docker-compose up
```

This starts all necessary services including:
- Main API service
- Accent classifier service
- Any required databases or dependencies

## API Usage Guide

### Video Processing Endpoint

**Endpoint:** `POST /api/video`

**Request:**
```json
{
  "url": "https://example.com/path/to/video.mp4"
}
```

**Response:**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "progress": 0,
  "message": "Processing started"
}
```

### Task Status Endpoint

**Endpoint:** `GET /api/tasks/:taskId`

**Response (Processing):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 45,
  "created": "2025-05-10T10:23:42.123Z",
  "updated": "2025-05-10T10:24:15.456Z"
}
```

**Response (Completed):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": 100,
  "created": "2025-05-10T10:23:42.123Z",
  "updated": "2025-05-10T10:30:15.789Z",
  "result": {
    "summary": "The speaker has a British accent with occasional American pronunciation patterns...",
    "accent": "british",
    "confidence": 0.82,
    "distribution": [
      {"accent": "british", "percentage": 75},
      {"accent": "american", "percentage": 20},
      {"accent": "australian", "percentage": 5}
    ],
    "processed_chunks": 12
  }
}
```

## Postman Examples

### Submit a video for processing:

```
POST https://pranishpdl.ai/api/video
Content-Type: application/json

{
  "url": "https://pshow.s3.ap-south-1.amazonaws.com/longvideosample+(online-video-cutter.com)+(1).mp4" //This is a real video link of brtish accent which you can try
}
```

### Check task status:

```
GET https://pranishpdl.ai/api/tasks/550e8400-e29b-41d4-a716-446655440000
```

## Health Check

**Endpoint:** `GET /api/health`

**Response:**
```
I am healthy
```

## Key Features

- **Asynchronous Processing**: Handles long-running tasks efficiently
- **Progress Tracking**: Provides detailed progress updates
- **Chunk-Based Processing**: Breaks large audio files into manageable pieces
- **Error Handling**: Robust error management throughout the process
- **Automatic Cleanup**: Removes temporary files after processing
- **Task Management**: Includes task expiration and cleanup
