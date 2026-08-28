import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: [
            "group toast",
            "group-[.toaster]:bg-card group-[.toaster]:text-foreground",
            "group-[.toaster]:border group-[.toaster]:border-border",
            "group-[.toaster]:rounded-xl group-[.toaster]:shadow-lg",
            "group-[.toaster]:px-4 group-[.toaster]:py-3 group-[.toaster]:gap-2",
          ].join(" "),
          title: "group-[.toast]:text-[14px] group-[.toast]:font-semibold",
          description:
            "group-[.toast]:text-[13px] group-[.toast]:text-muted-foreground group-[.toast]:leading-relaxed",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-medium",
          cancelButton:
            "group-[.toast]:bg-secondary group-[.toast]:text-muted-foreground",
          success:
            "group-[.toast]:border-success/30 group-[.toast]:bg-[hsl(var(--success)/0.08)]",
          error:
            "group-[.toast]:border-destructive/30 group-[.toast]:bg-[hsl(var(--destructive)/0.08)]",
          warning:
            "group-[.toast]:border-warning/30 group-[.toast]:bg-[hsl(var(--warning)/0.08)]",
          info: "group-[.toast]:border-info/30 group-[.toast]:bg-[hsl(var(--info)/0.08)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
