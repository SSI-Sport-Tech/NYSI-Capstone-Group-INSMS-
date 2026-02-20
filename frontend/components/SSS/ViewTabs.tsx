import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Archive, BookOpenText, TestTube } from "lucide-react";

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
      case "inventory":
        return <Archive className="w-4 h-4" />;
      case "scraper":
        return <Globe className="w-4 h-4" />;
      case "library":
        return <BookOpenText className="w-4 h-4" />;
      case "batch":
        return <TestTube className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="mb-6 border-b rounded-t-xl">
      <div className="flex space-x-1 px-2">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.id === "inventory" &&
              (pathname === "/search" || pathname === "/inventory")); // Handle both legacy search and new inventory routes

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`
                inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all
                ${
                  isActive
                    ? "bg-gray-50 text-gray-900 border-b-2 border-gray-900"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }
              `}
            >
              {tab.icon && <span>{getIcon(tab.icon)}</span>}
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ViewTabs;
