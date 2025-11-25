import { useEffect, useState } from 'react';
import { useRealtime } from '@/contexts/RealtimeContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Bell, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const RealtimeNotifications = () => {
  const { subscribeToChannel, unsubscribeFromChannel, isConnected } = useRealtime();
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !isConnected) return;

    // Subscribe to generated content changes
    const contentChannel = subscribeToChannel('content-updates', (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      let message = '';
      let notificationType = '';

      if (eventType === 'INSERT' && newRecord.table === 'generated_content') {
        message = `New AI content generated: ${newRecord.content_type}`;
        notificationType = 'content_generated';

        toast.success('New Content Generated!', {
          description: `${newRecord.content_type} content is ready to review`,
          icon: <Sparkles className="h-4 w-4" />,
        });
      } else if (eventType === 'UPDATE' && newRecord.table === 'generated_content') {
        if (oldRecord.approval_status !== newRecord.approval_status) {
          message = `Content ${newRecord.approval_status}: ${newRecord.content_type}`;
          notificationType = 'content_status_change';
        }
      } else if (eventType === 'INSERT' && newRecord.table === 'ai_generation_logs') {
        if (!newRecord.success) {
          message = `AI generation failed: ${newRecord.error_message || 'Unknown error'}`;
          notificationType = 'generation_error';

          toast.error('AI Generation Failed', {
            description: newRecord.error_message || 'Check logs for details',
          });
        }
      }

      if (message) {
        const notification: Notification = {
          id: crypto.randomUUID(),
          type: notificationType,
          message,
          timestamp: new Date(),
          read: false,
        };

        setNotifications((prev) => [notification, ...prev].slice(0, 10)); // Keep last 10
        setUnreadCount((prev) => prev + 1);
      }
    });

    return () => {
      unsubscribeFromChannel(contentChannel);
    };
  }, [isAuthenticated, isConnected, subscribeToChannel, unsubscribeFromChannel]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  if (!isAuthenticated) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {isConnected ? (
            <span className="text-xs text-green-500 flex items-center gap-1">
              <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Offline</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <>
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex flex-col items-start gap-1 cursor-pointer ${
                    !notification.read ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between w-full gap-2">
                    <p className="text-sm flex-1">{notification.message}</p>
                    {!notification.read && (
                      <span className="h-2 w-2 bg-primary rounded-full flex-shrink-0 mt-1"></span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {notification.timestamp.toLocaleTimeString()}
                  </span>
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <div className="flex gap-2 p-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={markAllAsRead}
              >
                Mark all read
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={clearAll}
              >
                Clear all
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RealtimeNotifications;
