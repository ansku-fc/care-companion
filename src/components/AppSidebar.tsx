import { Home, Calendar, ListTodo, Users, StickyNote, Clock, LogOut, PanelLeft } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import logoFull from "@/assets/foundation-clinic-logo.png";
import logoIcon from "@/assets/foundation-clinic-icon.png";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const workflowNavItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Tasks", url: "/tasks", icon: ListTodo },
  { title: "Patients", url: "/patients", icon: Users },
];

const adminNavItems = [
  { title: "Clinical Hours", url: "/clinical-hours", icon: Clock },
  { title: "Notes", url: "/notes", icon: StickyNote },
];

export function AppSidebar() {
  const { profile, role, signOut } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  const initials = (() => {
    const name = (profile?.full_name ?? "").replace(/^(Dr\.?|Nurse|Mr\.?|Mrs\.?|Ms\.?)\s+/i, "").trim();
    if (!name) return "?";
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  })();

  const renderNavItem = (item: { title: string; url: string; icon: any }) => {
    const link = (
      <NavLink
        to={item.url}
        end={item.url === "/"}
        className="relative rounded-[9px] text-[var(--fg-2)] hover:bg-[var(--app-hover)] hover:text-[var(--fg-1)] transition-colors [&>svg]:text-[var(--fg-3)]"
        activeClassName="text-[var(--fg-1)] font-medium [&>svg]:text-[var(--fg-1)] [&::before]:content-[''] [&::before]:absolute [&::before]:left-[-16px] [&::before]:top-2 [&::before]:bottom-2 [&::before]:w-[3px] [&::before]:rounded-r-[3px] [&::before]:bg-[var(--espresso)]"
      >
        <item.icon className={collapsed ? "h-[17px] w-[17px]" : "mr-3 h-[17px] w-[17px]"} strokeWidth={1.6} />
        {!collapsed && <span className="text-[13.5px]">{item.title}</span>}
      </NavLink>
    );
    return (
      <SidebarMenuItem key={item.title} className="px-2 py-px">
        <SidebarMenuButton asChild tooltip={collapsed ? item.title : undefined} className="h-9 rounded-[9px] px-2.5">
          {link}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className={collapsed ? "flex flex-col items-center gap-3 px-1 py-3" : "flex items-center justify-between gap-2 px-3 py-3"}>
          {collapsed ? (
            <>
              <img
                src={logoIcon}
                alt="Foundation Clinic"
                className="h-8 w-8 object-contain"
                style={{ mixBlendMode: "multiply" }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                title="Expand sidebar"
                className="h-7 w-7 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <img
                src={logoFull}
                alt="Foundation Clinic"
                className="h-9 w-[140px] object-contain object-left"
                style={{ mixBlendMode: "multiply" }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                title="Collapse sidebar"
                className="h-7 w-7 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {workflowNavItems.map(renderNavItem)}

              <li className="px-2 py-2">
                <Separator className="bg-sidebar-border" />
              </li>

              {adminNavItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out" className="h-7 w-7">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name || "User"}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
