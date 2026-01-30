import { useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { ProcessingState } from "@/components/ProcessingState";
import { SuccessState } from "@/components/SuccessState";
import { useUploadFile } from "@/hooks/use-files";
import { type ProcessedFile } from "@shared/routes";
import logoImg from "@/assets/logo.jpg";

export default function Home() {
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const uploadMutation = useUploadFile();

  const handleFileSelect = (file: File, deduplicate: boolean) => {
    uploadMutation.mutate({ file, deduplicate }, {
      onSuccess: (data) => {
        // Ensure data has linkCount or default it for the type match
        const processed: ProcessedFile = {
          ...data,
          linkCount: (data as any).linkCount ?? 0
        };
        setProcessedFile(processed);
      },
    });
  };

  const handleReset = () => {
    setProcessedFile(null);
    uploadMutation.reset();
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-primary/20 blur-3xl opacity-60 mix-blend-multiply filter" />
        <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-secondary/20 blur-3xl opacity-60 mix-blend-multiply filter" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="flex justify-center mb-6">
            <img 
              src={logoImg} 
              alt="Shaji Pappan" 
              className="w-32 h-32 rounded-full border-4 border-secondary object-cover shadow-2xl animate-in"
            />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-sm font-medium mb-4">
            <span>Official Link Extractor</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground tracking-tight">
            Shaji Pappan <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-accent">
              Link Estractor
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-foreground/80 max-w-2xl mx-auto leading-relaxed">
            Pappan sets the links free! Upload your spreadsheet and watch the magic happen.
          </p>
        </div>

        {/* Main Interaction Area */}
        <div className="transition-all duration-500 ease-in-out">
          {processedFile ? (
            <SuccessState file={processedFile} onReset={handleReset} />
          ) : uploadMutation.isPending ? (
            <ProcessingState />
          ) : (
            <Dropzone 
              onFileSelect={handleFileSelect} 
              isProcessing={uploadMutation.isPending} 
            />
          )}
        </div>

        {/* Features / Footer */}
        {!processedFile && !uploadMutation.isPending && (
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-center sm:text-left">
            <div className="space-y-3 p-6 rounded-2xl bg-white/40 border border-white/50 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mx-auto sm:mx-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-display font-semibold text-slate-900">Lightning Fast</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Processes thousands of rows instantly. No waiting around for your data.
              </p>
            </div>

            <div className="space-y-3 p-6 rounded-2xl bg-white/40 border border-white/50 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mx-auto sm:mx-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-display font-semibold text-slate-900">Secure Processing</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Your data is processed securely and never stored longer than necessary.
              </p>
            </div>

            <div className="space-y-3 p-6 rounded-2xl bg-white/40 border border-white/50 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 mx-auto sm:mx-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <h3 className="font-display font-semibold text-slate-900">Auto-Format</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                We automatically detect URL columns and format them cleanly in the output.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
