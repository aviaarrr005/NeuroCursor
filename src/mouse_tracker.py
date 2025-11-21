import time
import math
import pandas as pd
import threading
from pynput import mouse
import numpy as np

class NeuroTracker:
    def __init__(self):
        self.mouse_data = []
        self.is_tracking = False
        self.lock = threading.Lock()
        self.start_time = time.time()
        
        # Health Metrics
        self.jitter_score = 0.0
        
    def _on_move(self, x, y):
        if not self.is_tracking:
            return

        with self.lock:
            timestamp = time.time() - self.start_time
            self.mouse_data.append({
                'timestamp': timestamp,
                'x': x,
                'y': y
            })
            
            # Keep only last 100 points for real-time calculation
            if len(self.mouse_data) > 100:
                self.mouse_data.pop(0)

    def start(self):
        """Starts the background mouse listener"""
        self.is_tracking = True
        self.listener = mouse.Listener(on_move=self._on_move)
        self.listener.start()
        
    def stop(self):
        self.is_tracking = False
        if hasattr(self, 'listener'):
            self.listener.stop()

    def calculate_jitter(self):
        """
        Calculates how much the hand is shaking (micro-tremors).
        Returns a score from 0 (Smooth) to 100 (High Tremor).
        """
        with self.lock:
            if len(self.mouse_data) < 5:
                return 0.0
            
            df = pd.DataFrame(self.mouse_data)
            
            # Calculate changes in position (dx, dy)
            df['dx'] = df['x'].diff().fillna(0)
            df['dy'] = df['y'].diff().fillna(0)
            
            # Calculate angle of movement
            df['angle'] = np.arctan2(df['dy'], df['dx'])
            
            # Calculate how much the angle changes erratically
            # Smooth movement = low angle change. Jitter = high angle change.
            df['angle_change'] = df['angle'].diff().abs().fillna(0)
            
            raw_jitter = df['angle_change'].mean()
            
            # Normalize to a 0-100 scale
            score = min(raw_jitter * 500, 100)
            
            self.jitter_score = score
            return score

# Global instance
tracker = NeuroTracker()