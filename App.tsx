
import React, { useState, useEffect } from 'react';
import SetupWizard from './components/SetupWizard';
import JobCard from './components/JobCard';
import { AppConfig, DEFAULT_CONFIG, VideoJob, JobStatus } from './types';
import { analyzeVideoConcept, generateThumbnail } from './services/geminiService';
import { uploadVideoToYouTube, uploadThumbnailToYouTube } from './services/youtubeService';
import { UploadIcon, WandIcon, SettingsIcon, LoaderIcon, YoutubeIcon } from './components/Icons';

// Declaration for Google Identity Services
declare global {
  interface Window {
    google: any;
  }
}

const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('tube_automator_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [newJobInput, setNewJobInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  // Auth State
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isTokenClientLoaded, setIsTokenClientLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);

  // Load Google Identity Services Script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setIsTokenClientLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Initialize Token Client
  useEffect(() => {
    if (isTokenClientLoaded && config.youtubeClientId && window.google) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: config.youtubeClientId.trim(), // Trim to ensure no whitespace issues
          scope: 'https://www.googleapis.com/auth/youtube.upload',
          ux_mode: 'popup',
          callback: (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              setAccessToken(tokenResponse.access_token);
            } else {
              console.error("Token response invalid:", tokenResponse);
            }
          },
          error_callback: (error: any) => {
             // Suppress 'popup_closed' as it is a user action or benign side effect
             if (error.type === 'popup_closed') {
                 return;
             }
             
             console.error("OAuth Error Details:", error);

             // 'popup_blocked_by_browser' happens if not triggered by click
             if (error.type === 'popup_blocked_by_browser') {
                 alert("Popup blocked. Please allow popups for this site to connect YouTube.");
                 return;
             }
             
             // General configuration error
             alert(`Google Sign-In Error (${error.type}). \n\nPlease ensure:\n1. Client ID is correct.\n2. "Authorized JavaScript origins" in Google Cloud matches: ${window.location.origin}`);
          }
        });
        setTokenClient(client);
      } catch (e) {
        console.error("Failed to init token client:", e);
      }
    }
  }, [isTokenClientLoaded, config.youtubeClientId]);

  // Save config when it changes
  useEffect(() => {
    if (config.isConfigured) {
      localStorage.setItem('tube_automator_config', JSON.stringify(config));
    }
  }, [config]);

  const handleLogin = () => {
    if (tokenClient) {
      // Use prompt='consent' to ensure clean state if previous attempts failed/cancelled
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      alert('OAuth client not initialized. Please check your internet connection or verify your Client ID in settings.');
    }
  };

  const handleAddJob = async (file?: File) => {
    if (!newJobInput.trim() && !file) return;

    const newJob: VideoJob = {
      id: Date.now().toString(),
      filename: file ? file.name : `video_draft_${Math.floor(Math.random() * 1000)}.mp4`,
      fileSize: file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : 'Unknown',
      status: JobStatus.IDLE,
      concept: newJobInput || (file ? `A video file named ${file.name}` : ''),
      createdAt: new Date(),
      file: file,
    };

    setJobs(prev => [newJob, ...prev]);
    setNewJobInput('');

    // Auto-start processing
    processJob(newJob);
  };

  const processJob = async (job: VideoJob) => {
    // Step 1: Analyze
    updateJobStatus(job.id, JobStatus.ANALYZING);
    
    try {
      const analysis = await analyzeVideoConcept(config.geminiApiKey, job.concept);
      
      updateJob(job.id, { result: analysis });
      
      // Step 2: Generate Thumbnail
      updateJobStatus(job.id, JobStatus.GENERATING_THUMBNAIL);
      
      const thumbnailUrl = await generateThumbnail(config.geminiApiKey, analysis.thumbnailPrompt);
      
      updateJob(job.id, { 
        result: { ...analysis, thumbnailUrl },
        status: JobStatus.READY_TO_UPLOAD
      });

    } catch (error) {
      console.error(error);
      updateJobStatus(job.id, JobStatus.FAILED);
    }
  };

  const updateJobStatus = (id: string, status: JobStatus) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));
  };

  const updateJob = (id: string, updates: Partial<VideoJob>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
  };

  const handleUpload = async (job: VideoJob) => {
    if (!accessToken) {
      handleLogin();
      return;
    }

    if (!job.file) {
      alert("No actual file associated with this job. Cannot upload mock data to YouTube.");
      return;
    }

    if (!job.result) {
      alert("Metadata not generated yet.");
      return;
    }

    updateJobStatus(job.id, JobStatus.UPLOADING);
    
    try {
      // 1. Upload Video
      const videoId = await uploadVideoToYouTube(
        accessToken,
        job.file,
        job.result,
        (progress) => setUploadProgress(prev => ({ ...prev, [job.id]: progress }))
      );

      // 2. Upload Thumbnail (if available)
      if (job.result.thumbnailUrl && job.result.thumbnailUrl.startsWith('data:')) {
        try {
           await uploadThumbnailToYouTube(accessToken, videoId, job.result.thumbnailUrl);
        } catch (thumbErr) {
           console.warn("Thumbnail upload failed, but video uploaded.", thumbErr);
        }
      }

      updateJob(job.id, { youtubeId: videoId, status: JobStatus.COMPLETED });
      setUploadProgress(prev => ({ ...prev, [job.id]: 100 }));

    } catch (error) {
      console.error("Upload failed", error);
      updateJobStatus(job.id, JobStatus.FAILED);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleReset = () => {
    localStorage.removeItem('tube_automator_config');
    setConfig(DEFAULT_CONFIG);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setNewJobInput(`Video: ${file.name}`);
      handleAddJob(file);
    }
  };

  if (!config.isConfigured) {
    return <SetupWizard onComplete={setConfig} />;
  }

  return (
    <div className="min-h-screen bg-dark-950 text-white flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-900 border-r border-white/5 flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-brand-500 to-purple-500 bg-clip-text text-transparent">
            TubeAutomator
          </h1>
          <p className="text-xs text-gray-500 mt-1">v2.1.0 Pro</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <div className="flex items-center gap-3 px-4 py-3 bg-brand-900/20 text-brand-400 rounded-lg border border-brand-500/20">
            <WandIcon className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-white/5 rounded-lg transition-colors cursor-not-allowed opacity-50">
            <SettingsIcon className="w-5 h-5" />
            <span>Configurations</span>
          </div>
        </nav>

        <div className="p-4 border-t border-white/5">
            {!accessToken ? (
              <button 
                onClick={handleLogin}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 mb-4 transition-colors"
              >
                <YoutubeIcon className="w-4 h-4" />
                Connect YouTube
              </button>
            ) : (
              <div className="w-full bg-green-900/30 text-green-400 py-2 px-4 rounded-lg text-xs font-medium flex items-center justify-center gap-2 mb-4 border border-green-500/20">
                 <YoutubeIcon className="w-3 h-3" />
                 YouTube Connected
              </div>
            )}

            <div className="bg-dark-800 p-4 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Monthly Usage</h4>
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">Gemini Tokens</span>
                    <span className="text-white">24%</span>
                </div>
                <div className="w-full bg-dark-950 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 w-[24%]"></div>
                </div>
            </div>
            <button onClick={handleReset} className="text-xs text-red-500 hover:underline mt-4 w-full text-center">Reset Configuration</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-dark-950/50 backdrop-blur-md sticky top-0 z-10">
            <h2 className="text-lg font-medium text-white">Video Pipeline</h2>
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-white">Creator Studio</span>
                    {accessToken ? (
                        <span className="text-xs text-green-500">● Online</span>
                    ) : (
                        <span className="text-xs text-gray-500">○ Offline</span>
                    )}
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-brand-500 rounded-full"></div>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
            {/* Upload Area */}
            <div className="max-w-4xl mx-auto mb-12">
                <div 
                    className={`relative border-2 border-dashed rounded-2xl p-10 transition-all ${isDragging ? 'border-brand-500 bg-brand-900/10' : 'border-gray-700 hover:border-gray-600 bg-dark-900/30'}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mb-4">
                            <UploadIcon className="w-8 h-8 text-brand-500" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Drop video file to analyze & upload</h3>
                        <p className="text-gray-400 mb-6 max-w-md">
                            Automatically generate thumbnails, titles, and upload directly to your channel.
                        </p>

                        <div className="flex w-full max-w-lg gap-2">
                            <input 
                                type="text" 
                                value={newJobInput}
                                onChange={(e) => setNewJobInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddJob()}
                                placeholder="Or type a video concept here..."
                                className="flex-1 bg-dark-950 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                            />
                            <button 
                                onClick={() => handleAddJob()}
                                disabled={!newJobInput}
                                className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                            >
                                Analyze
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Job List */}
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Recent Jobs</h3>
                    <span className="text-sm text-gray-500">{jobs.length} items</span>
                </div>

                {jobs.length === 0 ? (
                    <div className="text-center py-20 border border-white/5 rounded-xl bg-dark-900/20">
                        <p className="text-gray-500">No active jobs. Upload a video to start.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {jobs.map(job => (
                            <div key={job.id} className="relative">
                                <JobCard job={job} onUpload={handleUpload} />
                                {/* Simple Overlay Progress Bar for uploading */}
                                {job.status === JobStatus.UPLOADING && (
                                    <div className="absolute inset-0 bg-dark-950/80 flex items-center justify-center rounded-xl backdrop-blur-sm z-10">
                                        <div className="w-64">
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-brand-400">Uploading to YouTube...</span>
                                                <span className="text-white">{uploadProgress[job.id] || 0}%</span>
                                            </div>
                                            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-red-600 transition-all duration-300 ease-out" 
                                                    style={{ width: `${uploadProgress[job.id] || 0}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;
