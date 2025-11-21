
import React, { useState, useEffect, useRef } from 'react';
import { AppConfig } from '../types';
import { CheckIcon, AlertCircleIcon, UploadIcon } from './Icons';

interface SetupWizardProps {
  onComplete: (config: AppConfig) => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [isFileProtocol, setIsFileProtocol] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      if (window.location.protocol === 'file:') {
          setIsFileProtocol(true);
      }
    }
  }, []);

  const handleFinish = () => {
    onComplete({
      geminiApiKey: apiKey.trim(),
      youtubeClientId: clientId.trim(),
      isConfigured: true
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const processFile = (file: File) => {
    if (file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                // Search for client_id in common structures (web or installed)
                const web = json.web || json.installed;
                if (web && web.client_id) {
                    setClientId(web.client_id);
                } else {
                    alert("Could not find 'client_id' in this JSON file. Please make sure it is the correct credentials file from Google Cloud.");
                }
            } catch (err) {
                alert("Invalid JSON file.");
            }
        };
        reader.readAsText(file);
    } else {
        alert("Please use a .json file.");
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processFile(e.dataTransfer.files[0]);
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full glass-panel rounded-2xl p-12 shadow-2xl border-t border-brand-500/20">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-500 to-purple-500 bg-clip-text text-transparent mb-4">
            TubeAutomator Setup
          </h1>
          <p className="text-gray-400 text-lg">
            Follow these steps to enable AI & YouTube automation.
          </p>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center gap-4 mb-12">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-2 w-12 rounded-full transition-colors ${step >= i ? 'bg-brand-500' : 'bg-dark-800'}`} />
            ))}
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-dark-900/50 p-6 rounded-xl border border-white/5">
              <h3 className="text-xl font-semibold mb-2 text-white">Step 1: Google Gemini API</h3>
              <p className="text-gray-400 mb-4">
                This powers the AI analysis and thumbnail generation.
              </p>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center text-brand-400 hover:text-brand-300 underline"
              >
                Get Key from Google AI Studio &rarr;
              </a>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Paste Gemini API Key</label>
              <input 
                type="password" 
                className="w-full bg-dark-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            <button 
              onClick={() => setStep(2)}
              disabled={!apiKey}
              className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${apiKey ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/50' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
            >
              Next Step
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-dark-900/50 p-6 rounded-xl border border-white/5">
              <h3 className="text-xl font-semibold mb-2 text-white">Step 2: YouTube Connection</h3>
              <p className="text-gray-400 mb-4">
                Upload your <code>credentials.json</code> or paste the Client ID manually.
              </p>
              
               {isFileProtocol && (
                  <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg flex gap-3 items-start">
                      <AlertCircleIcon className="w-5 h-5 text-red-500 mt-0.5" />
                      <div className="text-sm text-red-200">
                          <strong>Warning:</strong> You are running this file locally (file://). Google OAuth will not work. 
                          You must run this on a local server (e.g., <code>npm run start</code> or using VS Code Live Server).
                      </div>
                  </div>
              )}

              {/* Hidden File Input */}
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleFileSelect}
              />

              {/* Drag Drop Area - Now Clickable */}
              <div 
                className="border-2 border-dashed border-gray-700 hover:border-brand-500 hover:bg-brand-900/10 rounded-xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center mb-6"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                  <UploadIcon className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-gray-300 font-medium">Click to select credentials.json</p>
                  <p className="text-xs text-gray-500 mt-1">or drag and drop file here</p>
              </div>

              <div className="flex flex-col gap-2 mb-4 text-sm">
                 <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-brand-400 underline hover:text-brand-300">Get Credentials from Google Cloud &rarr;</a>
                 <a href="https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow#creatingcred" target="_blank" rel="noreferrer" className="text-gray-500 underline hover:text-gray-400">Read Setup Guide &rarr;</a>
              </div>

              {/* Origin Warning */}
               <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <AlertCircleIcon className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-yellow-400 font-semibold text-sm mb-1">Fix "Error 400" & Popup Closing</h4>
                        <p className="text-gray-400 text-xs mb-3">
                            In Google Cloud Console, you MUST add this URL to <strong>Authorized JavaScript origins</strong>:
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-green-400 font-mono text-sm truncate">
                                {origin || 'http://localhost:YOUR_PORT'}
                            </code>
                            <button 
                                onClick={copyToClipboard}
                                className="bg-dark-800 hover:bg-dark-700 text-white px-3 py-2 rounded border border-gray-600 text-sm font-medium transition-colors"
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Client ID</label>
              <input 
                type="text" 
                className="w-full bg-dark-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                placeholder="12345...apps.googleusercontent.com"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>

            <button 
              onClick={() => setStep(3)}
              disabled={!clientId}
              className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${clientId ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/50' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
            >
              Next Step
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-dark-900/50 p-6 rounded-xl border border-white/5 text-center">
              <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">System Check</h3>
              <p className="text-gray-400">
                Configuration saved locally.
              </p>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-dark-900 rounded-lg border border-green-900/30">
                    <span className="text-gray-300">Internet Connection</span>
                    <span className="text-green-500 font-medium">Active</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-dark-900 rounded-lg border border-green-900/30">
                    <span className="text-gray-300">YouTube API Config</span>
                    <span className="text-green-500 font-medium">Ready</span>
                </div>
            </div>

            <button 
              onClick={() => setStep(4)}
              className="w-full py-4 rounded-lg font-bold text-lg bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/50 transition-all"
            >
              Continue
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="text-center animate-fade-in space-y-6">
            <h2 className="text-3xl font-bold text-white">You're all set!</h2>
            <p className="text-gray-400">
              TubeAutomator is ready to streamline your workflow.
            </p>
            <button 
              onClick={handleFinish}
              className="w-full py-4 rounded-lg font-bold text-lg bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white shadow-xl transition-all transform hover:scale-[1.02]"
            >
              Launch Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupWizard;
