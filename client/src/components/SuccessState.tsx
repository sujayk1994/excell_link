import { Download, FileCheck, ArrowRight, Calendar, HardDrive, Link2 } from "lucide-react";
import { type ProcessedFile, buildUrl, api } from "@shared/routes";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface SuccessStateProps {
  file: ProcessedFile;
  onReset: () => void;
}

export function SuccessState({ file, onReset }: SuccessStateProps) {
  const downloadUrl = buildUrl(api.files.download.path, { id: file.id });

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-lg mx-auto"
    >
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-8 text-center text-white">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md">
            <FileCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-2">Processing Complete!</h2>
          <p className="text-emerald-50 opacity-90">Your links have been successfully extracted.</p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Link2 className="w-5 h-5 text-blue-600" />
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Links Extracted</p>
              </div>
              <p className="text-3xl font-bold text-slate-900">{file.linkCount}</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <HardDrive className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">File Size</p>
                  <p className="text-sm font-semibold text-slate-900">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Calendar className="w-5 h-5 text-slate-400" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Processed</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {file.createdAt ? format(new Date(file.createdAt), "MMM d, h:mm a") : "Just now"}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Original Filename</p>
              <p className="font-medium text-slate-900 truncate">{file.originalName}</p>
            </div>
          </div>

          <a
            href={downloadUrl}
            className="group w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <Download className="w-5 h-5" />
            Download Processed Excel
          </a>

          <button
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors py-2"
          >
            Process another file
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
