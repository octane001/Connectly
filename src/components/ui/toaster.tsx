import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast, type Toast } from "@/components/ui/use-toast";

const tone: Record<Toast["kind"], string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  error: "border-red-200 bg-red-50 text-red-950",
  info: "border-border bg-card text-card-foreground",
};

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div key={toast.id} className={`rounded-lg border p-4 shadow-subtle ${tone[toast.kind]}`} role="status">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description ? <p className="mt-1 text-sm opacity-80">{toast.description}</p> : null}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => dismiss(toast.id)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
