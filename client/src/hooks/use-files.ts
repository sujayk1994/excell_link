import { useMutation } from "@tanstack/react-query";
import { api, type ProcessedFile } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useUploadFile() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(api.files.upload.path, {
        method: api.files.upload.method,
        body: formData,
        // Don't set Content-Type header manually for FormData, let browser handle it with boundary
      });

      if (!res.ok) {
        // Try to parse error message if available
        let errorMessage = "Failed to upload file";
        try {
          const error = await res.json();
          errorMessage = error.message || errorMessage;
        } catch (e) {
          // ignore json parse error
        }
        throw new Error(errorMessage);
      }

      // Parse response with Zod schema from routes
      const data = await res.json();
      return api.files.upload.responses[200].parse(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
