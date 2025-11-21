import React from 'react';
import { VideoJob, JobStatus } from '../types';
import { LoaderIcon, CheckIcon, AlertCircleIcon, YoutubeIcon } from './Icons';

interface JobCardProps {
  job: VideoJob;
  onUpload: (job: VideoJob) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onUpload }) => {
  const getStatusColor = () => {
    switch (job.status) {
      case JobStatus.COMPLETED: return 'border-green-500/50 bg-green-500/5';
      case JobStatus.FAILED: return 'border-red-500/50 bg-red-500/5';
      case JobStatus.READY_TO_UPLOAD: return 'border-brand-500/50 bg-brand-500/5';
      default: return 'border-gray-700 bg-dark-900/50';
    }
  };

  return (
    <div className={`rounded-xl border p-5 transition-all ${getStatusColor()} relative overflow-hidden group`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-white text-lg truncate max-w-[200px] sm:max-w-xs" title={job.filename}>
            {job.filename}
          </h3>
          <p className="text-xs text-gray-500 font-mono mt-1">{job.fileSize} • {new Date(job.createdAt).toLocaleTimeString()}</p>
        </div>
        <div className="flex items-center gap-2">
            {job.status === JobStatus.ANALYZING && (
                <span className="flex items-center gap-1 text-xs text-brand-400 bg-brand-900/30 px-2 py-1 rounded-full">
                    <LoaderIcon className="w-3 h-3 animate-spin" /> Analyzing
                </span>
            )}
            {job.status === JobStatus.GENERATING_THUMBNAIL && (
                <span className="flex items-center gap-1 text-xs text-purple-400 bg-purple-900/30 px-2 py-1 rounded-full">
                    <LoaderIcon className="w-3 h-3 animate-spin" /> Painting
                </span>
            )}
             {job.status === JobStatus.COMPLETED && (
                <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded-full">
                    <CheckIcon className="w-3 h-3" /> Uploaded
                </span>
            )}
             {job.status === JobStatus.FAILED && (
                <span className="flex items-center gap-1 text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded-full">
                    <AlertCircleIcon className="w-3 h-3" /> Failed
                </span>
            )}
        </div>
      </div>

      {/* Analysis Results */}
      {job.result && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex gap-4">
             {/* Thumbnail Preview */}
             <div className="w-32 h-20 flex-shrink-0 bg-black rounded-lg overflow-hidden border border-gray-700 relative shadow-lg">
                {job.result.thumbnailUrl ? (
                    <img src={job.result.thumbnailUrl} alt="Generated Thumbnail" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">Pending</div>
                )}
             </div>
             
             <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-200 mb-1">Title Idea</div>
                <div className="text-sm text-brand-300 font-semibold truncate">{job.result.title}</div>
                <div className="text-xs text-gray-500 mt-2 line-clamp-2">{job.result.description}</div>
             </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {job.result.tags.slice(0, 4).map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 bg-dark-800 border border-gray-700 rounded text-gray-400">#{tag}</span>
            ))}
            {job.result.tags.length > 4 && <span className="text-[10px] px-2 py-0.5 text-gray-600">+{job.result.tags.length - 4} more</span>}
          </div>

          {/* Actions */}
          {job.status === JobStatus.READY_TO_UPLOAD && (
            <div className="pt-2 border-t border-gray-700/50 flex justify-end">
                <button 
                    onClick={() => onUpload(job)}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg transition-colors"
                >
                    <YoutubeIcon className="w-4 h-4" />
                    One-Click Upload
                </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JobCard;
