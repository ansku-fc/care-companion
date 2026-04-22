import { Home, Calendar, ListTodo, Users, StickyNote, Clock, LogOut, PanelLeft } from "lucide-react";
import { NavLink } from "@/components/NavLink";
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

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const renderNavItem = (item: { title: string; url: string; icon: any }) => {
    const link = (
      <NavLink
        to={item.url}
        end={item.url === "/"}
        className="relative rounded-[10px] text-[hsl(240_3%_60%)] hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors [&>svg]:text-[hsl(240_3%_60%)] hover:[&>svg]:text-sidebar-foreground"
        activeClassName="bg-sidebar-primary text-sidebar-foreground font-medium [&>svg]:text-sidebar-foreground [&>span.active-pill]:opacity-100"
      >
        <span className="active-pill pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-accent opacity-0 transition-opacity" />
        <item.icon className={collapsed ? "h-[18px] w-[18px]" : "mr-3 h-[18px] w-[18px]"} />
        {!collapsed && <span className="text-[13px]">{item.title}</span>}
      </NavLink>
    );
    return (
      <SidebarMenuItem key={item.title} className="px-2 py-0.5">
        <SidebarMenuButton asChild tooltip={collapsed ? item.title : undefined} className="h-10 rounded-[10px]">
          {link}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className={collapsed ? "flex flex-col items-center gap-2 px-1 py-3" : "flex items-center justify-between gap-2 px-3 py-3"}>
          {collapsed ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                title="Expand sidebar"
                className="h-7 w-7 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground">FC</span>
            </>
          ) : (
            <>
              <span className="text-base font-semibold tracking-tight text-sidebar-foreground">Foundation Clinic</span>
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
              {role && <Badge variant="secondary" className="text-xs capitalize">{role}</Badge>}
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
