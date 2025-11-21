from flask import Flask, jsonify
from flask_cors import CORS
import time
import threading
import pandas as pd
import numpy as np
from pynput import mouse

app = Flask(__name__)
CORS(app)

class NeuroTracker:
    def __init__(self):
        self.mouse_data = []
        self.is_tracking = False
        self.lock = threading.Lock()
        self.start_time = time.time()
        # NEW: Track exactly when the last move happened
        self.last_move_time = time.time() 

    def _on_move(self, x, y):
        with self.lock:
            current_time = time.time()
            # Update the "Last Seen" timestamp
            self.last_move_time = current_time
            
            timestamp = current_time - self.start_time
            self.mouse_data.append({'x': x, 'y': y})
            
            # Keep last 50 points
            if len(self.mouse_data) > 50: 
                self.mouse_data.pop(0)

    def start(self):
        if not self.is_tracking:
            self.is_tracking = True
            self.listener = mouse.Listener(on_move=self._on_move)
            self.listener.start()

    def calculate_jitter(self):
        with self.lock:
            # --- THE FIX: TIMEOUT CHECK ---
            # If the mouse hasn't moved in 0.15 seconds, assume it stopped.
            # Force score to 0 immediately.
            time_since_last_move = time.time() - self.last_move_time
            if time_since_last_move > 0.15:
                return 0.0

            # 1. Not enough data? Return 0.
            if len(self.mouse_data) < 5:
                return 0.0
            
            df = pd.DataFrame(self.mouse_data)

            # 2. Calculate Velocity
            df['dx'] = df['x'].diff().fillna(0)
            df['dy'] = df['y'].diff().fillna(0)
            df['speed'] = np.sqrt(df['dx']**2 + df['dy']**2)

            # 3. Velocity Filter
            moving_df = df[df['speed'] > 2.0].copy()

            if len(moving_df) < 5:
                return 0.0

            # 4. Calculate Jitter (Angle Change)
            moving_df['angle'] = np.arctan2(moving_df['dy'], moving_df['dx'])
            moving_df['angle_change'] = moving_df['angle'].diff().abs()

            # Fix Wrap-around
            moving_df['angle_change'] = np.where(
                moving_df['angle_change'] > np.pi, 
                2*np.pi - moving_df['angle_change'], 
                moving_df['angle_change']
            )

            raw_jitter = moving_df['angle_change'].mean()

            if np.isnan(raw_jitter): 
                return 0.0

            # 5. Scale Score
            score = raw_jitter * 200
            return max(0, min(score, 100))

tracker = NeuroTracker()
tracker.start()

@app.route('/data', methods=['GET'])
def get_data():
    score = tracker.calculate_jitter()
    
    status = "CALM"
    if score > 35: status = "FATIGUE"
    if score > 65: status = "TREMOR"
    
    return jsonify({
        "score": round(score, 1),
        "status": status,
        "timestamp": time.time()
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)