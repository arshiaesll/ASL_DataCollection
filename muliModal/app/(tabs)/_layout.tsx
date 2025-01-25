import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#81b0ff',
        tabBarInactiveTintColor: '#666',
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Record',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="video-camera" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="trophy" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sign-in"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
