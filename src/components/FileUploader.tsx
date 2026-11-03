import React, { useState } from 'react';
import { Upload, FileCheck, X } from 'lucide-react';

interface FileUploaderProps {
  label?: string;
  value?: string;
  onChange: (url: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ label = "Digital Signature", value, onChange }) => {
  const [fileName, setFileName] = useState<string>(value ? 'signature_uploaded' : '');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      // Generate object URL / data URL for local storage
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange(event.target?.result as string || '');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClear = () => {
    setFileName('');
    onChange('');
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      {fileName ? (
        <div className="flex items-center justify-between bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl px-3 py-2 text-xs font-semibold text-[#166534]">
          <div className="flex items-center gap-2 truncate">
            <FileCheck className="h-4 w-4 text-[#16A34A] shrink-0" />
            <span className="truncate">{fileName}</span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 bg-white hover:bg-[#F9F8F5] border border-dashed border-[#C5A059] rounded-xl px-3 py-2 text-xs font-bold text-[#D94B5A] cursor-pointer transition-colors shadow-2xs">
          <Upload className="h-4 w-4 text-[#FDE7E6]" />
          <span>Upload PNG / JPG / PDF</span>
          <input  id="file_52" name="file" aria-label="file"type="file" accept="image/png,image/jpeg,application/pdf" onChange={handleFileChange} className="hidden" />
        </label>
      )}
    </div>
  );
};

export default FileUploader;
