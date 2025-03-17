import { Link } from "wouter";
import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

type HeaderProps = {
  title: string;
  onOpenSidebar: () => void;
};

export default function Header({ title, onOpenSidebar }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onOpenSidebar}
            >
              <Menu className="h-6 w-6 text-gray-500" />
            </Button>
            <div className="flex items-center">
              <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
            </div>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-500">
              <Bell className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
