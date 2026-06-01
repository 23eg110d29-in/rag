import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { documentApi } from '../services/api';
import { UploadCloud, Trash2, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const Upload = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [failedFile, setFailedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({
    state: 'idle', // idle, uploading, processing, success, error
    progress: 0,
    message: '',
    fileName: ''
  });
  const fileInputRef = useRef(null);

  // Fetch list of document metadata
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await documentApi.list();
      setDocuments(res.data?.data || []);
    } catch (error) {
      console.error('Error fetching documents list:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Format file size utility
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Upload file process
  const processUpload = async (file) => {
    if (!file) return;
    
    // Validate file extensions
    const allowedExtensions = ['pdf', 'docx', 'txt', 'csv', 'json'];
    const extension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      setUploadStatus({
        state: 'error',
        progress: 0,
        message: 'Invalid file format. Only PDF, DOCX, TXT, CSV, and JSON are supported.',
        fileName: file.name
      });
      setFailedFile(file);
      return;
    }

    setUploadStatus({
      state: 'uploading',
      progress: 0,
      message: 'Uploading document to server...',
      fileName: file.name
    });

    try {
      const response = await documentApi.upload(file, (progressEvent) => {
        const total = progressEvent.total || file.size || 1;
        const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
        
        if (percentCompleted === 100) {
          setUploadStatus({
            state: 'processing',
            progress: 100,
            message: 'Extracting readable text from the uploaded document...',
            fileName: file.name
          });
        } else {
          setUploadStatus(prev => ({
            ...prev,
            progress: percentCompleted
          }));
        }
      });

      const data = response.data?.data || {};
      const wordCount = data.wordCount ?? 0;
      const totalChunks = data.totalChunks ?? 0;
      setUploadStatus({
        state: 'success',
        progress: 100,
        message: `Successfully indexed "${file.name}" — ${wordCount.toLocaleString()} words split into ${totalChunks} chunk${totalChunks !== 1 ? 's' : ''}.`,
        fileName: file.name
      });
      setFailedFile(null);

      // Refresh documents list
      fetchDocuments();
    } catch (error) {
      console.error('File upload error:', error);
      const errMsg = error.response?.data?.error || error.message || '';
      let displayMessage = errMsg || 'Document processing failed.';
      
      setFailedFile(file);
      setUploadStatus({
        state: 'error',
        progress: 0,
        message: displayMessage,
        fileName: file.name
      });
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processUpload(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  // Delete document handler
  const handleDelete = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete and unindex "${filename}"?`)) return;
    
    try {
      await documentApi.delete(filename);
      // Refresh documents list
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document.');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Upload Box Container */}
      <GlassCard className="p-0 overflow-hidden border border-white/5">
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl m-4 transition-all duration-300 ${
            dragActive
              ? 'border-medical-400 bg-medical-500/5'
              : 'border-white/10 hover:border-white/20 bg-darkBg/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt,.csv,.json"
            onChange={handleFileChange}
          />
          <div className="p-4 rounded-full bg-white/5 text-medical-400 mb-4 animate-bounce-slow">
            <UploadCloud size={40} />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Drag & Drop Files Here</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Supports PDF, DOCX, TXT, CSV, and JSON
          </p>
          <button
            onClick={onButtonClick}
            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:text-white hover:bg-white/10 text-sm font-medium transition-all"
          >
            Select File from Device
          </button>
        </div>

        {/* Upload Status Card */}
        {uploadStatus.state !== 'idle' && (
          <div className="border-t border-white/5 p-6 bg-black/20 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 mb-1.5">
                {uploadStatus.state === 'uploading' && <Loader2 size={16} className="text-medical-400 animate-spin" />}
                {uploadStatus.state === 'processing' && <Loader2 size={16} className="text-indigo-400 animate-spin" />}
                {uploadStatus.state === 'success' && <CheckCircle size={16} className="text-emerald-500" />}
                {uploadStatus.state === 'error' && <AlertCircle size={16} className="text-rose-500" />}
                <span className="text-xs font-semibold text-slate-300 truncate max-w-[200px]">
                  {uploadStatus.fileName}
                </span>
                <span className="text-[10px] text-slate-400 ml-auto font-mono">
                  {uploadStatus.state.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                {uploadStatus.message}
              </p>
              
              {/* Progress bar */}
              {(uploadStatus.state === 'uploading' || uploadStatus.state === 'processing') && (
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      uploadStatus.state === 'processing' 
                        ? 'bg-indigo-500 animate-pulse' 
                        : 'bg-medical-400'
                    }`}
                    style={{ width: `${uploadStatus.progress}%` }}
                  />
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {uploadStatus.state === 'error' && failedFile && (
                <button
                  onClick={() => processUpload(failedFile)}
                  className="text-xs font-semibold text-medical-400 hover:text-medical-300 px-3 py-1.5 rounded-lg bg-medical-500/10 border border-medical-500/20 hover:bg-medical-500/20 transition-all flex items-center gap-1"
                >
                  Retry
                </button>
              )}
              
              {(uploadStatus.state === 'success' || uploadStatus.state === 'error') && (
                <button
                  onClick={() => {
                    setUploadStatus({ state: 'idle', progress: 0, message: '', fileName: '' });
                    setFailedFile(null);
                  }}
                  className="text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </GlassCard>

      {/* Uploaded Documents List */}
      <div>
        <h3 className="text-lg font-bold text-white mb-6">Indexed Documents</h3>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
            <Loader2 size={24} className="animate-spin text-medical-400" />
            <p className="text-xs">Loading metadata logs...</p>
          </div>
        ) : documents.length === 0 ? (
          <GlassCard className="py-12 flex flex-col items-center justify-center text-slate-500 text-center border border-white/5">
            <FileText size={48} className="text-slate-600 mb-3" />
            <p className="font-bold text-slate-300 text-sm">No Documents Indexed</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Upload documents using the drag-and-drop panel to break them into vector chunks.
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {documents.map((doc) => (
              <GlassCard key={doc._id} className="relative group border border-white/5 flex flex-col justify-between" hoverEffect>
                <div>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-white/5 text-medical-400">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-200 truncate" title={doc.originalName}>
                        {doc.originalName}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-widest">
                        {(doc.fileType || '').split('/').pop() || 'file'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.filename)}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all opacity-0 group-hover:opacity-100"
                      title="Unindex Document"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6 p-3 rounded-xl bg-black/20 text-xs border border-white/5">
                    <div>
                      <p className="text-slate-500 text-[10px] font-semibold uppercase">File Size</p>
                      <p className="font-medium text-slate-300 mt-0.5">{formatBytes(doc.fileSize)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[10px] font-semibold uppercase">Total Chunks</p>
                      <p className="font-medium text-slate-300 mt-0.5">{doc.totalChunks || 0} chunks</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5 mt-4 pt-3 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                  <span>{doc.wordCount || 0} words</span>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;
