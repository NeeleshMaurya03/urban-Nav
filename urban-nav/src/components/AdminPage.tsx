// components/AdminPage.tsx
"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  ChartPieIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  DocumentMagnifyingGlassIcon,
  CheckCircleIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";

const adminTabs = [
  {
    icon: <ChartPieIcon className="w-12 h-12 text-primary" />,
    title: "Dashboard",
    description: "System overview and performance metrics",
    keyFeatures: ["Real-time analytics", "Resource monitoring", "Performance insights"],
  },
  {
    icon: <UserGroupIcon className="w-12 h-12 text-primary" />,
    title: "User Management",
    description: "Manage user accounts and permissions",
    keyFeatures: ["User roles", "Access control", "Activity logs"],
  },
  {
    icon: <Cog6ToothIcon className="w-12 h-12 text-primary" />,
    title: "Settings",
    description: "System configuration and preferences",
    keyFeatures: ["Global settings", "API management", "Customization"],
  },
  {
    icon: <DocumentMagnifyingGlassIcon className="w-12 h-12 text-primary" />,
    title: "Audit Logs",
    description: "Security and activity monitoring",
    keyFeatures: ["Access logs", "Event tracking", "Security alerts"],
  },
];

export function AdminPage() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [expandedTab, setExpandedTab] = useState<number | null>(null);
  const router = useRouter();

  return (
    <section id ="admin" className="py-20 md:py-24">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Admin Console</h1>
          <ProfileButton name="John Doe" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {adminTabs.map((tab, idx) => (
            <motion.div
              key={tab.title}
              className={`relative bg-card rounded-xl p-4 transition-all cursor-pointer ${
                expandedTab === idx ? "col-span-2" : ""
              } ${selectedTab === idx ? "ring-1 ring-primary" : "ring-1 ring-muted"} hover:bg-muted/30`}
              onClick={() => {
                setSelectedTab(idx);
                setExpandedTab(expandedTab === idx ? null : idx);
              }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {tab.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{tab.title}</h3>
                  {expandedTab === idx && (
                    <>
                      <p className="text-muted-foreground mb-4">{tab.description}</p>
                      <div className="mt-4 space-y-2">
                        {tab.keyFeatures.map((feature, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <CheckCircleIcon className="w-4 h-4 text-primary" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProfileButton({ name }: { name: string }) {
  const router = useRouter();
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="flex items-center gap-3 bg-card rounded-full pl-4 pr-2 py-2 cursor-pointer"
      onClick={() => router.push("/profile")}
    >
      <span className="font-medium">{name}</span>
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
        <span className="text-primary-foreground font-bold">{initials}</span>
      </div>
    </motion.div>
  );
}

export function ProfilePage() {
  return (
    <section className="py-20 md:py-24">
      <div className="container mx-auto max-w-2xl">
        <div className="bg-card rounded-xl p-8 shadow-lg">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
              <span className="text-3xl text-primary-foreground font-bold">JD</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold">John Doe</h1>
              <p className="text-muted-foreground">Administrator</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-t border-muted pt-6">
              <h2 className="text-xl font-semibold mb-4">Account Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="text-muted-foreground">john@example.com</span>
                </div>
                <div className="flex justify-between">
                  <span>Role:</span>
                  <span className="text-primary">Administrator</span>
                </div>
              </div>
            </div>

            <div className="border-t border-muted pt-6">
              <h2 className="text-xl font-semibold mb-4">Security</h2>
              <button className="w-full flex justify-between items-center p-4 rounded-lg hover:bg-muted/30">
                <span>Change Password</span>
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}