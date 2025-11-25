import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      'Supabase env vars missing (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY/VITE_SUPABASE_PUBLISHABLE_KEY). Realtime features are disabled.'
    );
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
};

const supabase = createSupabaseClient();

interface RealtimeContextType {
  supabase: SupabaseClient | null;
  isConnected: boolean;
  subscribeToChannel: (channelName: string, callback: (payload: any) => void) => RealtimeChannel | null;
  unsubscribeFromChannel: (channel: RealtimeChannel | null) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

interface RealtimeProviderProps {
  children: ReactNode;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setIsConnected(false);
      return;
    }

    // Check Supabase connection
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('users').select('count').limit(1);
        if (!error) {
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Supabase connection error:', error);
        setIsConnected(false);
      }
    };

    checkConnection();
  }, [supabase]);

  const subscribeToChannel = (channelName: string, callback: (payload: any) => void): RealtimeChannel | null => {
    if (!supabase) {
      console.warn(`Supabase not configured. Skipping subscription to channel: ${channelName}`);
      return null;
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        callback(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to channel: ${channelName}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to channel: ${channelName}`);
          console.error('Realtime may not be enabled on database tables.');
          console.error('Run: server/scripts/enable-realtime.sql in Supabase SQL Editor');
          // Don't show toast - this is normal if Realtime isn't enabled
          // Application will work fine without it
        } else if (status === 'TIMED_OUT') {
          console.warn(`⏱️  Timeout subscribing to channel: ${channelName}`);
        } else if (status === 'CLOSED') {
          console.log(`🔒 Channel closed: ${channelName}`);
        }
      });

    return channel;
  };

  const unsubscribeFromChannel = (channel: RealtimeChannel | null) => {
    if (!channel || !supabase) return;
    supabase.removeChannel(channel);
  };

  const value: RealtimeContextType = {
    supabase,
    isConnected,
    subscribeToChannel,
    unsubscribeFromChannel,
  };

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export { supabase };
