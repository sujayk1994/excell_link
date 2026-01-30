import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle2, XCircle } from "lucide-react";

export default function Health() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/health"],
  });

  const isHealthy = data && (data as any).status === "ok";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-secondary" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <span className="font-medium text-foreground">API Health</span>
            {isLoading ? (
              <div className="h-6 w-24 bg-muted animate-pulse rounded" />
            ) : isHealthy ? (
              <div className="flex items-center gap-1 text-green-600 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Healthy</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-destructive font-semibold">
                <XCircle className="w-4 h-4" />
                <span>Error</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Last Check: {data ? new Date((data as any).timestamp).toLocaleString() : "N/A"}
            </p>
            {error && (
              <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                {(error as Error).message}
              </p>
            )}
          </div>

          <div className="pt-4 border-t flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Environment</span>
              <span className="font-mono">{import.meta.env.MODE}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Status Code</span>
              <span className="font-mono text-green-600">200 OK</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
