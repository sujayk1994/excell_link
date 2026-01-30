import { useMutation } from "@tanstack/react-query";
import { api, type ProcessedFile } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useUploadFile() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ file, deduplicate }: { file: File; deduplicate: boolean }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("deduplicate", String(deduplicate));

      const res = await fetch(api.files.upload.path, {
        method: api.files.upload.method,
        body: formData,
      });

      if (!res.ok) {
        let errorMessage = "Failed to upload file";
        try {
          const error = await res.json();
          errorMessage = error.message || errorMessage;
        } catch (e) {}
        throw new Error(errorMessage);
      }

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
