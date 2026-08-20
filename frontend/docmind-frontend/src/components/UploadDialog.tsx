import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  X, Upload, FileText, CheckCircle, AlertCircle, Loader2, Plus,
  File, FileImage, FileCode, FilePieChart, Trash2
} from 'lucide-react';
import { documentApi } from '../services/api';
import { useDocumentStore } from '../store/documentStore';
import type { UploadingFile } from '../types';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'text/csv': ['.csv'],
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileText className="w-4 h-4 text-red-400" />;
  if (ext === 'csv') return <FilePieChart className="w-4 h-4 text-green-400" />;
  if (ext === 'md') return <FileCode className="w-4 h-4 text-purple-400" />;
  if (ext === 'docx') return <FileImage className="w-4 h-4 text-blue-400" />;
  return <File className="w-4 h-4 text-slate-400" />;
}

const UploadDialog: React.FC<UploadDialogProps> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { fetchDocuments } = useDocumentStore();

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles: UploadingFile[] = accepted.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      progress: 0,
      status: 'pending',
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpload = async () => {
    const pending = files.filter((f) => f.status === 'pending');
    if (pending.length === 0) return;
    setIsUploading(true);

    await Promise.all(
      pending.map(async (uf) => {
        setFiles((prev) => prev.map((f) => (f.id === uf.id ? { ...f, status: 'uploading' } : f)));
        try {
          const res = await documentApi.upload(uf.file, (pct) => {
            setFiles((prev) => prev.map((f) => (f.id === uf.id ? { ...f, progress: pct } : f)));
          });
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uf.id ? { ...f, status: 'done', progress: 100, result: res.data } : f
            )
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Upload failed';
          setFiles((prev) => prev.map((f) => (f.id === uf.id ? { ...f, status: 'error', error: msg } : f)));
        }
      })
    );

    setIsUploading(false);
    await fetchDocuments();
    const successCount = files.filter((f) => f.status !== 'error').length;
    if (successCount > 0) toast.success(`${successCount} document(s) uploaded & indexed`);
  };

  const handleClose = () => {
    if (!isUploading) { setFiles([]); onClose(); }
  };

  const allDone = files.length > 0 && files.every((f) => f.status === 'done' || f.status === 'error');
  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg bg-[#1e293b] border border-[#334155] rounded-2xl shadow-2xl shadow-black/50 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <Upload className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Upload Documents</h2>
              <p className="text-xs text-slate-400">PDF · DOCX · TXT · MD · CSV</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-1.5 hover:bg-[#334155] rounded-lg transition-colors text-slate-400 hover:text-white disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drop zone */}
        <div className="p-5">
          <div
            {...getRootProps()}
            className={clsx(
              'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 overflow-hidden group',
              isDragActive
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-[#334155] hover:border-indigo-500/50 hover:bg-white/[0.02]'
            )}
          >
            <input {...getInputProps()} />
            {/* Animated background blob */}
            <div className={clsx(
              'absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 transition-opacity duration-300',
              isDragActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )} />
            <div className="relative flex flex-col items-center gap-3">
              <div className={clsx(
                'w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300',
                isDragActive ? 'bg-indigo-500/20 scale-110' : 'bg-[#0f172a] group-hover:scale-105'
              )}>
                <Upload className={clsx('w-6 h-6 transition-colors', isDragActive ? 'text-indigo-400' : 'text-slate-400')} />
              </div>
              <div>
                <p className="text-white font-medium">
                  {isDragActive ? '✨ Drop to upload' : 'Drag & drop files here'}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  or <span className="text-indigo-400 hover:underline">click to browse</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                {[
                  { ext: 'PDF', color: 'text-red-400 bg-red-400/10' },
                  { ext: 'DOCX', color: 'text-blue-400 bg-blue-400/10' },
                  { ext: 'TXT', color: 'text-slate-300 bg-slate-400/10' },
                  { ext: 'MD', color: 'text-purple-400 bg-purple-400/10' },
                  { ext: 'CSV', color: 'text-green-400 bg-green-400/10' },
                ].map(({ ext, color }) => (
                  <span key={ext} className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', color)}>
                    .{ext.toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Stats bar when files selected */}
          {files.length > 0 && (
            <div className="flex items-center justify-between mt-3 px-1">
              <span className="text-xs text-slate-400">{files.length} file(s) · {formatBytes(totalSize)}</span>
              <button
                onClick={() => setFiles([])}
                disabled={isUploading}
                className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors disabled:opacity-40"
              >
                <Trash2 className="w-3 h-3" /> Clear all
              </button>
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1">
              {files.map((uf) => (
                <div key={uf.id} className="flex items-center gap-3 p-3 bg-[#0f172a] rounded-xl border border-[#334155]">
                  <div className="p-2 bg-[#1e293b] rounded-lg flex-shrink-0">
                    {getFileIcon(uf.file.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs text-white font-medium truncate max-w-[200px]">{uf.file.name}</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        <span className="text-xs text-slate-500">{formatBytes(uf.file.size)}</span>
                        {uf.status === 'pending' && (
                          <button onClick={() => removeFile(uf.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        {uf.status === 'uploading' && <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
                        {uf.status === 'done' && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
                        {uf.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-[#334155] rounded-full h-1">
                      <div
                        className={clsx(
                          'h-1 rounded-full transition-all duration-300',
                          uf.status === 'done' ? 'bg-green-500' :
                          uf.status === 'error' ? 'bg-red-500' :
                          uf.status === 'uploading' ? 'bg-indigo-500' : 'bg-[#334155]'
                        )}
                        style={{ width: uf.status === 'pending' ? '0%' : `${uf.progress}%` }}
                      />
                    </div>
                    {uf.status === 'error' && (
                      <p className="text-xs text-red-400 mt-1">{uf.error}</p>
                    )}
                    {uf.status === 'done' && uf.result && (
                      <p className="text-xs text-green-400 mt-1">
                        ✓ {uf.result.chunksCreated ?? 0} chunks indexed
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#334155]">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-[#334155] hover:border-[#475569] rounded-xl transition-colors disabled:opacity-50"
          >
            {allDone ? 'Close' : 'Cancel'}
          </button>
          {!allDone && (
            <button
              onClick={handleUpload}
              disabled={isUploading || pendingCount === 0}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
            >
              {isUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
              ) : (
                <><Plus className="w-4 h-4" /> Upload {pendingCount} file{pendingCount !== 1 ? 's' : ''}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadDialog;
