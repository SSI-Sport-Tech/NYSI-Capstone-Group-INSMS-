import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Search as SearchIcon, BookOpen } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon?: string;
  href: string;
}

interface ViewTabsProps {
  tabs: Tab[];
}

const ViewTabs: React.FC<ViewTabsProps> = ({ tabs }) => {
  const pathname = usePathname();

  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case "globe":
        return <Globe className="w-4 h-4" />;
      case "search":
        return <SearchIcon className="w-4 h-4" />;
      case "library":
        return <BookOpen className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.id === "inventory" &&
              (pathname === "/search" || pathname === "/inventory")); // Handle both legacy search and new inventory routes

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                isActive
                  ? "border-black text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.icon && <span className="mr-2">{getIcon(tab.icon)}</span>}
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default ViewTabs;
