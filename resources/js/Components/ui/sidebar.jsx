import * as React from "react";
import { PanelLeft } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const SIDEBAR_COOKIE_NAME = "sidebar:state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "4.25rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

const SidebarContext = React.createContext(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}) {
  const [isMobile, setIsMobile] = React.useState(false);
  const [openMobile, setOpenMobile] = React.useState(false);

  const [_open, _setOpen] = React.useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar:state");
      if (saved !== null) return saved === "true";
    }
    return defaultOpen;
  });

  const open = openProp !== undefined ? openProp : _open;
  const setOpen = React.useCallback(
    (value) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("sidebar:state", String(openState));
      }
    },
    [setOpenProp, open],
  );

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((prev) => !prev) : setOpen((prev) => !prev);
  }, [isMobile, setOpen, setOpenMobile]);

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const state = open ? "expanded" : "collapsed";

  const contextValue = React.useMemo(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        style={{
          "--sidebar-width": SIDEBAR_WIDTH,
          "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
          ...style,
        }}
        className={cn(
          "group/sidebar-wrapper flex min-h-screen w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "icon",
  className,
  children,
  ...props
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === "none") {
    return (
      <div
        className={cn(
          "flex h-full w-[--sidebar-width] flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-800",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <>
        {openMobile && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
            onClick={() => setOpenMobile(false)}
          />
        )}
        <div
          className={cn(
            "fixed inset-y-0 z-50 flex h-full w-[--sidebar-width] max-w-[80vw] flex-col bg-white dark:bg-gray-900 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
            side === "left"
              ? openMobile
                ? "translate-x-0"
                : "-translate-x-full"
              : openMobile
                ? "translate-x-0"
                : "translate-x-full",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </>
    );
  }

  return (
    <div
      className={cn(
        "group peer hidden lg:block text-gray-900 dark:text-gray-100 transition-[width] duration-300 ease-in-out shrink-0",
        state === "collapsed"
          ? "w-[--sidebar-width-icon]"
          : "w-[--sidebar-width]",
      )}
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
    >
      <div
        className={cn(
          "fixed inset-y-0 z-40 hidden h-screen transition-[width] duration-300 ease-in-out lg:flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900",
          state === "collapsed"
            ? "w-[--sidebar-width-icon]"
            : "w-[--sidebar-width]",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export function SidebarTrigger({ className, onClick, ...props }) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      title="Toggle Sidebar (Ctrl+B)"
      {...props}
    >
      <PanelLeft className="h-5 w-5" />
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  );
}

export function SidebarHeader({ className, ...props }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 border-b border-gray-200 dark:border-gray-800",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarContent({ className, ...props }) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarGroup({ className, ...props }) {
  return (
    <div
      className={cn("relative flex w-full min-w-0 flex-col p-1.5", className)}
      {...props}
    />
  );
}

export function SidebarGroupLabel({ className, ...props }) {
  const { state } = useSidebar();
  if (state === "collapsed") return null;

  return (
    <div
      className={cn(
        "px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarGroupContent({ className, ...props }) {
  return <div className={cn("w-full text-sm", className)} {...props} />;
}

export function SidebarMenu({ className, ...props }) {
  return (
    <ul
      className={cn(
        "flex w-full min-w-0 flex-col gap-1 list-none p-0 m-0",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarMenuItem({ className, ...props }) {
  return (
    <li className={cn("relative group/menu-item", className)} {...props} />
  );
}

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-3 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-indigo-500 active:bg-gray-200 dark:active:bg-gray-700 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white",
        active:
          "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold",
      },
      size: {
        default: "h-10 text-sm",
        sm: "h-8 text-xs",
        lg: "h-12 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  children,
  ...props
}) {
  const { state } = useSidebar();
  const effectiveVariant = isActive ? "active" : variant;

  return (
    <div className="relative group/btn w-full">
      <button
        type="button"
        className={cn(
          sidebarMenuButtonVariants({ variant: effectiveVariant, size }),
          state === "collapsed" && "justify-center px-0",
          className,
        )}
        {...props}
      >
        {children}
      </button>

      {/* shadcn Floating Tooltip in collapsed state */}
      {state === "collapsed" && tooltip && (
        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover/btn:flex items-center z-50">
          <div className="rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-md dark:bg-gray-100 dark:text-gray-900 whitespace-nowrap">
            {tooltip}
          </div>
        </div>
      )}
    </div>
  );
}

export function SidebarMenuBadge({ className, ...props }) {
  const { state } = useSidebar();

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white transition-all",
        state === "collapsed"
          ? "absolute top-1.5 right-1.5 h-3.5 min-w-[14px] px-0.5"
          : "ml-auto px-2 py-0.5 text-xs",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 border-t border-gray-200 dark:border-gray-800 mt-auto",
        className,
      )}
      {...props}
    />
  );
}
