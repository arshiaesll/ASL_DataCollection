import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from datetime import datetime
import io
import base64
import os
import time
from ahrs.filters import Madgwick
from filterpy.kalman import KalmanFilter
from filterpy.common import Q_discrete_white_noise

class MotionAnalyzer:
    def __init__(self):
        # Initialize Kalman filters for each axis
        self.kf_x = self._create_kalman_filter()
        self.kf_y = self._create_kalman_filter()
        self.kf_z = self._create_kalman_filter()
        
        # Current position
        self.current_x = 0
        self.current_y = 0
        self.current_z = 0
        
        # Store the path for visualization
        self.path_x = []
        self.path_y = []
        self.path_z = []
        # Maximum points to keep in memory
        self.MAX_POINTS = 500
        # Time of last plot
        self.last_plot_time = 0
        # Plot interval in seconds
        self.PLOT_INTERVAL = 5.0
        # Initialize Madgwick filter for orientation
        self.madgwick = Madgwick()
        # Store orientation quaternion
        self.quaternion = np.array([1.0, 0.0, 0.0, 0.0])
        # Store last update time
        self.last_update = None
        # Create plots directory if it doesn't exist
        self.plots_dir = os.path.join(os.path.dirname(__file__), 'plots')
        if os.path.exists(self.plots_dir):
            for f in os.listdir(self.plots_dir):
                os.remove(os.path.join(self.plots_dir, f))
        else:
            os.makedirs(self.plots_dir)

    def _create_kalman_filter(self):
        """
        Create a Kalman filter for position tracking.
        State vector: [position, velocity, acceleration]
        """
        kf = KalmanFilter(dim_x=3, dim_z=1)
        dt = 0.1  # time step
        
        # State transition matrix
        kf.F = np.array([
            [1, dt, 0.5*dt**2],
            [0,  1,        dt],
            [0,  0,         1]
        ])
        
        # Measurement matrix (we only measure acceleration)
        kf.H = np.array([[0, 0, 1]])
        
        # Measurement noise
        kf.R = np.array([[0.1]])
        
        # Process noise
        kf.Q = Q_discrete_white_noise(dim=3, dt=dt, var=0.1)
        
        # Initial state uncertainty
        kf.P *= 1000
        
        return kf
        
    def update_position(self, acceleration_data):
        """
        Update position based on new acceleration data using Kalman filter.
        """
        current_time = acceleration_data["timestamp"] / 1000.0  # Convert to seconds
        
        if self.last_update is None:
            self.last_update = current_time
            return None
        
        # Calculate time delta
        dt = current_time - self.last_update
        if dt <= 0:
            return None
            
        # Extract acceleration values
        accel = np.array([
            acceleration_data["x"],
            acceleration_data["y"],
            acceleration_data["z"]
        ])
        
        # Update orientation using Madgwick filter
        self.quaternion = self.madgwick.updateIMU(self.quaternion, gyr=np.zeros(3), acc=accel)
        
        # Remove gravity from acceleration using quaternion rotation
        gravity = np.array([0, 0, 9.81])
        quat_conjugate = np.array([self.quaternion[0], -self.quaternion[1], 
                                 -self.quaternion[2], -self.quaternion[3]])
        accel_rotated = self._rotate_by_quaternion(accel - gravity, quat_conjugate)
        
        # Update Kalman filters with new measurements
        self.kf_x.predict()
        self.kf_y.predict()
        self.kf_z.predict()
        
        self.kf_x.update(accel_rotated[0])
        self.kf_y.update(accel_rotated[1])
        self.kf_z.update(accel_rotated[2])
        
        # Get position estimates
        x = self.kf_x.x[0]
        y = self.kf_y.x[0]
        z = self.kf_z.x[0]
        
        # Store current position
        self.current_x = x
        self.current_y = y
        self.current_z = z
        
        # Store the new position
        self.path_x.append(x)
        self.path_y.append(y)
        self.path_z.append(z)
        
        # Keep only last MAX_POINTS
        if len(self.path_x) > self.MAX_POINTS:
            self.path_x.pop(0)
            self.path_y.pop(0)
            self.path_z.pop(0)
        
        self.last_update = current_time
        
        # Check if it's time to create a new plot
        current_plot_time = time.time()
        if current_plot_time - self.last_plot_time >= self.PLOT_INTERVAL:
            self.create_visualization()
            self.last_plot_time = current_plot_time
        
        # Encode the image as base64
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
        
        buf.seek(0)
        image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
        
        return {
            'image': image_base64,
            'current_position': {
                'x': float(self.current_x),
                'y': float(self.current_y),
                'z': float(self.current_z),
                'vx': float(self.kf_x.x[1]),
                'vy': float(self.kf_y.x[1]),
                'vz': float(self.kf_z.x[1]),
                'ax': float(self.kf_x.x[2]),
                'ay': float(self.kf_y.x[2]),
                'az': float(self.kf_z.x[2]),
                'quaternion': self.quaternion.tolist()
            }
        }
    
    def _rotate_by_quaternion(self, v, q):
        """Helper function to rotate a vector by a quaternion."""
        w = q[0]
        x = q[1]
        y = q[2]
        z = q[3]
        
        return np.array([
            v[0] * (1 - 2*y*y - 2*z*z) + v[1] * (2*x*y - 2*w*z) + v[2] * (2*x*z + 2*w*y),
            v[0] * (2*x*y + 2*w*z) + v[1] * (1 - 2*x*x - 2*z*z) + v[2] * (2*y*z - 2*w*x),
            v[0] * (2*x*z - 2*w*y) + v[1] * (2*y*z + 2*w*x) + v[2] * (1 - 2*x*x - 2*y*y)
        ])
    
    def create_visualization(self):
        """
        Create and save a visualization of the 3D movement path
        """
        fig = plt.figure(figsize=(12, 8))
        ax = fig.add_subplot(111, projection='3d')
        
        # Plot the path
        ax.plot3D(self.path_x, self.path_y, self.path_z, 'b-', label='Movement Path')
        
        # Plot current position
        ax.scatter([self.path_x[-1]], [self.path_y[-1]], [self.path_z[-1]], 
                  color='red', s=100, label='Current Position')
        
        # Add direction arrow
        if len(self.path_x) > 1:
            dx = self.path_x[-1] - self.path_x[-2]
            dy = self.path_y[-1] - self.path_y[-2]
            dz = self.path_z[-1] - self.path_z[-2]
            ax.quiver(self.path_x[-1], self.path_y[-1], self.path_z[-1],
                     dx, dy, dz, color='red', length=0.1)
        
        ax.set_title('3D Movement Path')
        ax.set_xlabel('X Position (m)')
        ax.set_ylabel('Y Position (m)')
        ax.set_zlabel('Z Position (m)')
        ax.grid(True)
        ax.legend()
        
        # Set equal aspect ratio
        max_range = np.array([
            max(self.path_x) - min(self.path_x),
            max(self.path_y) - min(self.path_y),
            max(self.path_z) - min(self.path_z)
        ]).max() / 2.0
        
        mean_x = np.mean(self.path_x)
        mean_y = np.mean(self.path_y)
        mean_z = np.mean(self.path_z)
        
        ax.set_xlim(mean_x - max_range, mean_x + max_range)
        ax.set_ylim(mean_y - max_range, mean_y + max_range)
        ax.set_zlim(mean_z - max_range, mean_z + max_range)
        
        # Save plot to file with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filepath = os.path.join(self.plots_dir, f'movement_path_{timestamp}.png')
        plt.savefig(filepath)
        
        # Also save to memory buffer for base64 encoding
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
        
        # Encode the image as base64
        buf.seek(0)
        image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
        
        return {
            'image': image_base64,
            'current_position': {
                'x': float(self.current_x),
                'y': float(self.current_y),
                'z': float(self.current_z),
                'vx': float(self.kf_x.x[1]),
                'vy': float(self.kf_y.x[1]),
                'vz': float(self.kf_z.x[1]),
                'ax': float(self.kf_x.x[2]),
                'ay': float(self.kf_y.x[2]),
                'az': float(self.kf_z.x[2]),
                'quaternion': self.quaternion.tolist()
            }
        } 