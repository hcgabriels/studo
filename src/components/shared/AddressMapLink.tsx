import { ExternalLink, MapPin } from "lucide-react";
import { buildGoogleMapsSearchUrl } from "@/lib/maps";

export const AddressMapLink = ({ address }: { address: string }) => {
  if (address.trim().length < 5) {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        Digite o endereço para conferir a localização.
      </p>
    );
  }

  return (
    <a
      href={buildGoogleMapsSearchUrl(address)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <MapPin className="h-3.5 w-3.5" />
      Conferir no Google Maps
      <ExternalLink className="h-3 w-3" />
    </a>
  );
};
