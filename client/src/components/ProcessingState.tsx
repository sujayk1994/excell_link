import { Loader2 } from "lucide-react";

export function ProcessingState() {
  return (
    <div className="text-center py-16 space-y-6 animate-in">
      <div className="relative inline-flex">
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
        <div className="relative bg-white p-4 rounded-2xl shadow-xl shadow-primary/10 border border-slate-100">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-xl font-display font-bold text-slate-900">
          Processing your file...
        </h3>
        <p className="text-slate-500">
          We're extracting links from your spreadsheet. This usually takes a few seconds.
        </p>
      </div>
    </div>
  );
}
