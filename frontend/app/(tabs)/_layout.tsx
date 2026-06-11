import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { palette } from '../../theme';
import { useSubscription } from '../../lib/subscription';

export default function TabLayout() {
  const { tier, isActive, trialHoursLeft } = useSubscription();
  const trialBadge = (tier === 'none' || tier === 'trial') && isActive && trialHoursLeft > 0
    ? `${trialHoursLeft}h`
    : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: palette.glassEdge,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 6,
          paddingBottom: 6,
          height: 64,
          position: 'absolute',
        },
        tabBarBackground: () => (
          <BlurView
            intensity={70}
            tint="dark"
            style={[StyleSheet.absoluteFill, { backgroundColor: palette.glassBg }]}
          />
        ),
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="flame" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="method"
        options={{
          title: 'Method',
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'AI Tools',
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" size={size} color={color} />,
          tabBarBadge: trialBadge,
          tabBarBadgeStyle: { backgroundColor: palette.primary, color: '#fff', fontSize: 10, fontWeight: '800', minWidth: 32 },
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color, size }) => <Ionicons name="library" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
