import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';

export default function SignInPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if already signed in
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      router.replace('/');
    }
  }, []);

  const handleSignIn = () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    try {
      // Store username in localStorage for persistence
      localStorage.setItem('username', username.trim());
      
      // Trigger storage event manually since it doesn't fire in the same window
      window.dispatchEvent(new Event('storage'));
      
      // Navigate to home page
      router.replace('/');
    } catch (error) {
      setError('Failed to sign in. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Sign In</Text>
        
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            setError(''); // Clear error when user types
          }}
          placeholder="Enter your username"
          placeholderTextColor="#999"
          autoCapitalize="none"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity 
          style={styles.signInButton}
          onPress={handleSignIn}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  signInButton: {
    backgroundColor: '#81b0ff',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#f44336',
    marginBottom: 10,
    textAlign: 'center',
  },
}); 