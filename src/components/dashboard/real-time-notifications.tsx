"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Package, TrendingUp, X } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  type: "new_order" | "practice_activated" | "sync_complete";
  accountId?: string;
  practiceName?: string;
  orderId?: string;
  orderAmount?: number;
  activatedAt?: string;
  createdAt: string;
}

export function RealTimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPolling, setIsPolling] = useState(true);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!isPolling) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch("/api/notifications/recent");
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    // Initial fetch
    fetchNotifications();

    // Set up polling interval
    const interval = setInterval(fetchNotifications, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isPolling]);

  const dismissNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    // Optionally mark as read in the database
    await fetch(`/api/notifications/${id}/dismiss`, { method: "POST" });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_order":
        return <Package className="h-4 w-4" />;
      case "practice_activated":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "new_order":
        return "bg-green-100 text-green-800";
      case "practice_activated":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Real-Time Updates
            </CardTitle>
            <CardDescription>
              Live updates from CuraGenesis
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPolling(!isPolling)}
          >
            {isPolling ? "Pause" : "Resume"} Updates
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notifications.slice(0, 5).map((notification) => (
            <div
              key={notification.id}
              className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div>
                  {notification.type === "new_order" && (
                    <>
                      <p className="font-medium">New Order Placed</p>
                      <p className="text-sm text-muted-foreground">
                        {notification.practiceName} placed order #{notification.orderId}
                        {notification.orderAmount && ` ($${notification.orderAmount})`}
                      </p>
                    </>
                  )}
                  {notification.type === "practice_activated" && (
                    <>
                      <p className="font-medium">Practice Activated</p>
                      <p className="text-sm text-muted-foreground">
                        {notification.practiceName} is now active
                      </p>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateTime(notification.createdAt)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissNotification(notification.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
