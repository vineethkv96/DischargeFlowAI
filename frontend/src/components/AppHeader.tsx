import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Activity, ArrowLeft, Users, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  showBackButton?: boolean;
  backButtonPath?: string;
}

export function AppHeader({ title, subtitle, action, showBackButton = false, backButtonPath = "/" }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isDischargeFlow = location.pathname.startsWith('/dischargeflow');
  const isPatientCare = !isDischargeFlow && location.pathname !== '/login';

  const handleBack = () => {
    navigate(backButtonPath);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "doctor":
        return "default";
      case "nurse":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="border-b bg-card shadow-sm">
      <div className="container mx-auto px-6 py-4">
        {/* Navigation Tabs */}
        {isPatientCare || isDischargeFlow ? (
          <div className="flex items-center gap-2 mb-4 pb-2 border-b">
            <Button
              variant={isPatientCare ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate("/")}
              className={cn("gap-2", isPatientCare && "bg-primary text-primary-foreground")}
            >
              <Users className="h-4 w-4" />
              PatientCare Hub
            </Button>
            <Button
              variant={isDischargeFlow ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate("/dischargeflow")}
              className={cn("gap-2", isDischargeFlow && "bg-primary text-primary-foreground")}
            >
              <Workflow className="h-4 w-4" />
              DischargeFlow AI
            </Button>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Button variant="outline" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {action}
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {user ? getInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email || ""}
                    </p>
                    {user?.role && (
                      <div className="pt-1">
                        <Badge variant={getRoleBadgeColor(user.role) as any}>
                          {user.role}
                        </Badge>
                      </div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

