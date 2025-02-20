from libsql_client import create_client_sync
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DB_URL = os.getenv('DB_URL')
DB_AUTH_TOKEN = os.getenv('DB_AUTH_TOKEN')

if not DB_URL or not DB_AUTH_TOKEN:
    raise ValueError("Database credentials not found in environment variables")

class DatabaseManager:
    def __init__(self):
        self.client = create_client_sync(
            url=DB_URL,
            auth_token=DB_AUTH_TOKEN
        )

    # User-related methods
    def create_user(self, username: str, password: str = ''):
        """Create a new user."""
        try:
            self.client.execute(
                "INSERT INTO users (username, password, count) VALUES (?, ?, 0)",
                [username, password]
            )
            return True
        except Exception as e:
            print(f"Error creating user: {e}")
            return False

    def get_user(self, username: str):
        """Get user by username."""
        try:
            result = self.client.execute(
                "SELECT * FROM users WHERE username = ?",
                [username]
            )
            return result.rows[0] if result.rows else None
        except Exception as e:
            print(f"Error getting user: {e}")
            return None

    def update_user_count(self, username: str):
        """Increment video count for a user."""
        try:
            # Create user if doesn't exist
            self.client.execute(
                "INSERT OR IGNORE INTO users (username, count) VALUES (?, 0)",
                [username]
            )
            # Increment count
            self.client.execute(
                "UPDATE users SET count = count + 1 WHERE username = ?",
                [username]
            )
            return True
        except Exception as e:
            print(f"Error updating user count: {e}")
            return False

    def get_users(self):
        """Get all users with their video counts."""
        result = self.client.execute(
            "SELECT id, username, password, count, created_at FROM users ORDER BY count DESC"
        )
        return result.rows

    # Data-related methods
    def add_data(self, name: str, data: str):
        """Add new data entry."""
        try:
            self.client.execute(
                "INSERT INTO data (name, data) VALUES (?, ?)",
                [name, data]
            )
            return True
        except Exception as e:
            print(f"Error adding data: {e}")
            return False


    def get_all_data(self):
        """Get all data entries."""
        result = self.client.execute("SELECT * FROM data ORDER BY created_at DESC")
        return result.rows


    def add_sign_video(self, name: str, data: str):
        """Add a new sign video to the database."""
        try:
            self.client.execute(
                "INSERT INTO sign_videos (name, data) VALUES (?, ?)",
                [name, data]
            )
            return True
        except Exception as e:
            print(f"Error adding sign video: {e}")
            return False

    def get_sign_video(self, name: str):
        """Get a sign video by name."""
        try:
            result = self.client.execute(
                "SELECT * FROM sign_videos WHERE name = ?",
                [name]
            )
            return result.rows[0] if result.rows else None
        except Exception as e:
            print(f"Error getting sign video: {e}")
            return None

    def get_all_sign_videos(self):
        """Get all sign videos."""
        try:
            result = self.client.execute(
                "SELECT name, created_at FROM sign_videos ORDER BY created_at DESC"
            )
            return result.rows
        except Exception as e:
            print(f"Error getting all sign videos: {e}")
            return []

