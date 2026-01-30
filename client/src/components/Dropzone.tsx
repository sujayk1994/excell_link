import { useCallback, useState } from "react";
import { UploadCloud, FileSpreadsheet, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export function Dropzone({ onFileSelect, isProcessing }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) setIsDragActive(true);
  }, [isProcessing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const validateFile = (file: File) => {
    // Check extension
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel" // .xls
    ];
    
    // Also check extension string as backup since mime types can vary by OS
    const isExcel = validTypes.includes(file.type) || 
                   file.name.endsWith('.xlsx') || 
                   file.name.endsWith('.xls');

    if (!isExcel) {
      setError("Please upload a valid Excel file (.xlsx or .xls)");
      return false;
    }
    
    setError(null);
    return true;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect, isProcessing]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative group cursor-pointer transition-all duration-300 ease-out",
          "border-2 border-dashed rounded-3xl p-12 text-center",
          "bg-white/50 hover:bg-white/80 backdrop-blur-sm",
          isDragActive 
            ? "border-primary scale-[1.02] shadow-2xl shadow-primary/10 bg-primary/5" 
            : "border-slate-200 hover:border-primary/50 shadow-lg shadow-slate-200/50",
          isProcessing && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          onChange={handleFileInput}
          disabled={isProcessing}
          accept=".xlsx, .xls"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={cn(
            "p-4 rounded-full transition-colors duration-300",
            isDragActive ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400 group-hover:bg-primary/5 group-hover:text-primary/70"
          )}>
            <UploadCloud className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-display font-semibold text-slate-900">
              {isDragActive ? "Drop your Excel file here" : "Upload your Excel file"}
            </h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              Drag and drop or click to browse. We support .xlsx and .xls files.
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
