
export enum JobStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  GENERATING_THUMBNAIL = 'GENERATING_THUMBNAIL',
  READY_TO_UPLOAD = 'READY_TO_UPLOAD',
  UPLOADING = 'UPLOADING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface VideoJob {
  id: string;
  filename: string;
  fileSize: string;
  status: JobStatus;
  concept: string; // User input description or transcript
  result?: AnalysisResult;
  createdAt: Date;
  file?: File; // The actual file object (not persisted)
  youtubeId?: string;
}

export interface AnalysisResult {
  title: string;
  description: string;
  tags: string[];
  thumbnailPrompt: string;
  thumbnailUrl?: string;
  estimatedCost: number;
}

export interface AppConfig {
  geminiApiKey: string;
  youtubeClientId: string;
  isConfigured: boolean;
}

export const DEFAULT_CONFIG: AppConfig = {
  geminiApiKey: '',
  youtubeClientId: '',
  isConfigured: false,
};
