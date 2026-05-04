import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export const OfflineBadge = () => {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 backdrop-blur px-3 py-1.5 text-xs text-destructive shadow-lg animate-fade-in">
      <WifiOff className="h-3.5 w-3.5" />
      Sin conexión — viendo datos guardados
    </div>
  );
};
