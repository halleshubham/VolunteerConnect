import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Home, Users, Calendar, ClipboardList, Settings, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button
        style={{ "visibility": isOpen ? "hidden" : "visible" }}
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={toggleSidebar}
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Sidebar */}
      <div className={`bg-white border-r border-gray-200 w-64 flex-shrink-0 fixed inset-y-0 left-0 z-30 transition-transform shadow-lg md:shadow-none md:translate-x-0 md:static ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h1 className="text-xl font-bold text-primary">Contact Manager</h1>
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden" 
              onClick={closeSidebar}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Main</h3>
              <Link href="/" onClick={closeSidebar}>
                <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 ${
                  location === "/" ? "bg-primary/10 text-primary border-l-3 border-primary" : "text-gray-700"
                }`}>
                  <Home className="h-5 w-5 mr-3" />
                  Dashboard
                </a>
              </Link>
              <Link href="/contacts" onClick={closeSidebar}>
                <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 ${
                  location.startsWith("/contacts") ? "bg-primary/10 text-primary border-l-3 border-primary" : "text-gray-700"
                }`}>
                  <Users className="h-5 w-5 mr-3" />
                  Contacts
                </a>
              </Link>
              {user?.role == 'admin' && 
              <>
                <Link href="/events" onClick={closeSidebar}>
                  <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 ${
                    location.startsWith("/events") ? "bg-primary/10 text-primary border-l-3 border-primary" : "text-gray-700"
                  }`}>
                    <Calendar className="h-5 w-5 mr-3" />
                    Events
                  </a>
                </Link>
                <Link href="/tasks" onClick={closeSidebar}>
                  <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 ${
                    location.startsWith("/tasks") ? "bg-primary/10 text-primary border-l-3 border-primary" : "text-gray-700"
                  }`}>
                    <ClipboardList className="h-5 w-5 mr-3" />
                    Tasks
                  </a>
                </Link>
              </>}
            </div>
            
            <div className="mt-8 space-y-1">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Settings</h3>
              {user?.role == 'admin' && <Link href="/settings" onClick={closeSidebar}>
                <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 ${
                  location.startsWith("/settings") ? "bg-primary/10 text-primary border-l-3 border-primary" : "text-gray-700"
                }`}>
                  <Settings className="h-5 w-5 mr-3" />
                  Settings
                </a>
              </Link>}
              <Button 
                variant="ghost" 
                className="flex w-full items-center justify-start px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  logoutMutation.mutate();
                  closeSidebar();
                }}
              >
                <LogOut className="h-5 w-5 mr-3" />
                Logout
              </Button>
            </div>
          </nav>
          
          <div className="p-4 border-t">
            <div className="flex items-center">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user?.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user?.username}</p>
                <p className="text-xs font-medium text-gray-500">Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
