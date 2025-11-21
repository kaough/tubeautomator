
import { AnalysisResult } from "../types";

const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status,contentDetails';

export const uploadVideoToYouTube = async (
  accessToken: string,
  file: File,
  metadata: AnalysisResult,
  onProgress: (progress: number) => void
): Promise<string> => {
  
  // 1. Initiate Resumable Upload
  const initBody = {
    snippet: {
      title: metadata.title,
      description: `${metadata.description}\n\nTags: ${metadata.tags.join(', ')}`,
      tags: metadata.tags,
      categoryId: "22", // People & Blogs default
    },
    status: {
      privacyStatus: "private", // Default to private for safety
      selfDeclaredMadeForKids: false,
    }
  };

  const initResponse = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Length': file.size.toString(),
      'X-Upload-Content-Type': file.type || 'video/mp4',
    },
    body: JSON.stringify(initBody)
  });

  if (!initResponse.ok) {
    throw new Error(`Failed to initiate upload: ${initResponse.statusText}`);
  }

  const uploadLocation = initResponse.headers.get('Location');
  if (!uploadLocation) {
    throw new Error("No upload location header received from YouTube.");
  }

  // 2. Upload File Chunks
  // For simplicity in browser, we can try a monolithic fetch if the file isn't massive,
  // but creating a loop is safer for progress tracking.
  // However, Fetch API doesn't expose upload progress natively without XMLHttpRequest (XHR).
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadLocation, true);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        onProgress(Math.round(percentComplete));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        resolve(response.id);
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));

    xhr.send(file);
  });
};

export const uploadThumbnailToYouTube = async (
  accessToken: string,
  videoId: string,
  base64Thumbnail: string
): Promise<void> => {
  // Convert base64 to Blob
  const fetchRes = await fetch(base64Thumbnail);
  const blob = await fetchRes.blob();

  const response = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: blob
  });

  if (!response.ok) {
    throw new Error('Failed to upload thumbnail');
  }
};
