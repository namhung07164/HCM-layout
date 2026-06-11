import React, { useState, useEffect } from 'react';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { X, CloudUpload, Settings, Key } from 'lucide-react';

interface R2UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartExport: () => void;
  uploading: boolean;
  uploadProgress: number;
}

export default function R2UploadModal({ isOpen, onClose, onStartExport, uploading, uploadProgress }: R2UploadModalProps) {
  const [accountId, setAccountId] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [bucketName, setBucketName] = useState('');
  const [showConfig, setShowConfig] = useState(true);

  useEffect(() => {
    const storedAccountId = localStorage.getItem('r2_account_id') || '';
    const storedAccessKey = localStorage.getItem('r2_access_key') || '';
    const storedSecretKey = localStorage.getItem('r2_secret_key') || '';
    const storedBucketName = localStorage.getItem('r2_bucket_name') || '';

    setAccountId(storedAccountId);
    setAccessKey(storedAccessKey);
    setSecretKey(storedSecretKey);
    setBucketName(storedBucketName);

    if (storedAccountId && storedAccessKey && storedSecretKey && storedBucketName) {
      setShowConfig(false);
    } else {
      setShowConfig(true);
    }
  }, [isOpen]);

  const handleSaveAndUpload = () => {
    localStorage.setItem('r2_account_id', accountId);
    localStorage.setItem('r2_access_key', accessKey);
    localStorage.setItem('r2_secret_key', secretKey);
    localStorage.setItem('r2_bucket_name', bucketName);

    if (window.confirm("Đồng ý tạo (hoặc ghi đè) file Data_Mapping_Export.jpeg trên Cloudflare R2 của bạn?")) {
      onStartExport();
    }
  };

  if (!isOpen) return null;

  const isConfigured = accountId && bucketName && accessKey && secretKey;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-sans">
            <CloudUpload className="text-amber-400" />
            Upload to Cloudflare R2
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 font-sans">
          {!showConfig && isConfigured ? (
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase flex items-center gap-1">
                  <Key size={12} className="text-amber-500" /> Cấu hình hiện tại
                </span>
                <button 
                  onClick={() => setShowConfig(true)} 
                  className="text-xs text-amber-500 hover:text-amber-400 font-bold transition-colors flex items-center gap-1"
                  disabled={uploading}
                >
                  <Settings size={12} /> Cài đặt lại
                </button>
              </div>
              <div className="text-sm text-slate-300 space-y-1.5 font-mono text-[13px]">
                <div><span className="text-slate-500 font-sans">Bucket:</span> <span className="text-amber-400">{bucketName}</span></div>
                <div><span className="text-slate-500 font-sans">Account ID:</span> {accountId.substring(0, 12)}...</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isConfigured && (
                <div className="flex justify-end">
                  <button 
                    onClick={() => setShowConfig(false)} 
                    className="text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium"
                    disabled={uploading}
                  >
                    ← Ẩn bảng điền API
                  </button>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Account ID</label>
                <input
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm font-mono transition-colors"
                  placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j"
                  disabled={uploading}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Bucket Name</label>
                <input
                  type="text"
                  value={bucketName}
                  onChange={(e) => setBucketName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm font-mono transition-colors"
                  placeholder="e.g. my-taka-exports"
                  disabled={uploading}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Access Key ID</label>
                <input
                  type="text"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm font-mono transition-colors"
                  placeholder="e.g. YOUR_ACCESS_KEY_ID"
                  disabled={uploading}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Secret Access Key</label>
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm font-mono transition-colors"
                  placeholder="e.g. YOUR_SECRET_ACCESS_KEY"
                  disabled={uploading}
                />
              </div>
            </div>
          )}
          
          <div className="pt-2 text-xs text-slate-400 bg-slate-800/40 p-3 rounded-lg border border-slate-800">
            File sẽ được tạo/ghi đè với tên <strong className="text-white">Data_Mapping_Export.jpeg</strong>. Sẽ không làm tốn dung lượng Firebase.
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
          <button 
            onClick={onClose}
            className="px-4 py-2 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors text-sm font-medium font-sans"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAndUpload}
            disabled={uploading || !accountId || !bucketName || !accessKey || !secretKey}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors text-sm font-bold font-sans flex items-center justify-center min-w-[120px]"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Uploading...
              </>
            ) : (!showConfig && isConfigured ? "Upload Now" : "Save & Upload")}
          </button>
        </div>
      </div>
    </div>
  );
}
