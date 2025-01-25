import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';

interface UserCount {
  username: string;
  count: number;
}

export default function LeaderboardPage() {
  const [userCounts, setUserCounts] = useState<UserCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('http://localhost:3000/user-counts');
      const data = await response.json();
      
      if (data.status === 'success') {
        // Sort users by count in descending order
        const sortedUsers = data.users.sort((a: UserCount, b: UserCount) => b.count - a.count);
        setUserCounts(sortedUsers);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch leaderboard');
      }
    } catch (error) {
      setError('Error connecting to server');
      console.error('Leaderboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Video Upload Leaderboard</Text>
      <ScrollView style={styles.leaderboardContainer}>
        {userCounts.map((user, index) => (
          <View key={user.username} style={styles.userRow}>
            <View style={styles.rankContainer}>
              <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.username}>{user.username}</Text>
              <Text style={styles.count}>{user.count} videos</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  leaderboardContainer: {
    flex: 1,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    marginBottom: 10,
    borderRadius: 10,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rankContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#81b0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  count: {
    fontSize: 14,
    color: '#666',
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#f44336',
  },
}); 