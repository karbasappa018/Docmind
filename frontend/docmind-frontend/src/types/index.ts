// API Types matching Spring Boot backend DTOs

export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
  timestamp: string;
}

export interface UserDto {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: UserDto;
}

export type DocumentStatus = 'UPLOADING' | 'PROCESSING' | 'INDEXED' | 'FAILED';

export interface DocumentMetadataDto {
  id: string;
  filename: string;
  contentType: string;
  fileSize: number;
  totalPages: number | null;
  totalChunks: number | null;
  status: DocumentStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentResponseDto {
  id: string;
  fileName: string;
  fileSize: number;
  status: DocumentStatus;
  chunksCreated: number | null;
  message: string;
}

export interface CitationDto {
  documentId: string;
  fileName: string;
  chunkIndex: number;
  pageNumber: number | null;
  snippet: string;
  similarityScore: number;
  metadata: Record<string, unknown>;
}

export interface ChatRequestDto {
  question: string;
  documentId?: string;
  topK?: number;
  minSimilarity?: number;
  conversationId?: string;
}

export interface ChatResponseDto {
  answer: string;
  conversationId: string;
  citations: CitationDto[];
  responseTimeMs: number;
}

export interface SearchRequestDto {
  query: string;
  documentId?: string;
  topK?: number;
  similaritySearch?: number;
}

export interface SearchResultDto {
  query: string;
  totalMatches: number;
  matches: CitationDto[];
}

// Conversation and Message Types
export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  messageType: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  createdAt: string;
  citations?: CitationDto[];
  responseTimeMs?: number;
  isStreaming?: boolean;
}

// UI Types
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: CitationDto[];
  responseTimeMs?: number;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  result?: DocumentResponseDto;
}

