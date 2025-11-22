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
        self.last_move_time = time.time()
        
        # Physics Metrics
        self.total_pixels_moved = 0.0
        self.prev_x = None
        self.prev_y = None

    def _on_move(self, x, y):
        with self.lock:
            current_time = time.time()
            self.last_move_time = current_time
            
            # CALCULATE TOTAL DISTANCE
            if self.prev_x is not None:
                dist = np.sqrt((x - self.prev_x)**2 + (y - self.prev_y)**2)
                self.total_pixels_moved += dist
            
            self.prev_x = x
            self.prev_y = y
            
            # Add to buffer
            self.mouse_data.append({'x': x, 'y': y})
            
            # Keep last 50 points
            if len(self.mouse_data) > 50: 
                self.mouse_data.pop(0)

    def start(self):
        if not self.is_tracking:
            self.is_tracking = True
            self.listener = mouse.Listener(on_move=self._on_move)
            self.listener.start()

    def calculate_metrics(self):
        with self.lock:
            # IDLE CHECK
            if time.time() - self.last_move_time > 0.15:
                return 0.0, (self.total_pixels_moved / 39370.0), 0.0
            
            if len(self.mouse_data) < 5:
                return 0.0, (self.total_pixels_moved / 39370.0), 0.0
            
            df = pd.DataFrame(self.mouse_data)
            
            # JITTER CALCULATION
            df['dx'] = df['x'].diff().fillna(0)
            df['dy'] = df['y'].diff().fillna(0)
            df['speed'] = np.sqrt(df['dx']**2 + df['dy']**2)
            
            moving_df = df[df['speed'] > 2.0].copy()
            
            if len(moving_df) < 5:
                jitter_score = 0.0
            else:
                moving_df['angle'] = np.arctan2(moving_df['dy'], moving_df['dx'])
                moving_df['angle_change'] = moving_df['angle'].diff().abs()
                moving_df['angle_change'] = np.where(
                    moving_df['angle_change'] > np.pi, 
                    2*np.pi - moving_df['angle_change'], 
                    moving_df['angle_change']
                )
                jitter_score = moving_df['angle_change'].mean() * 200
            
            final_jitter = max(0, min(jitter_score, 100))

            # EFFICIENCY CALCULATION
            actual_path_dist = df['speed'].sum()
            start_point = self.mouse_data[0]
            end_point = self.mouse_data[-1]
            ideal_dist = np.sqrt((end_point['x'] - start_point['x'])**2 + (end_point['y'] - start_point['y'])**2)
            
            if actual_path_dist > 0:
                efficiency = (ideal_dist / actual_path_dist) * 100
            else:
                efficiency = 0.0
            
            efficiency = max(0, min(efficiency, 100))
            meters = self.total_pixels_moved / 39370.0
            
            return final_jitter, meters, efficiency

tracker = NeuroTracker()
tracker.start()

@app.route('/data', methods=['GET'])
def get_data():
    score, meters, efficiency = tracker.calculate_metrics()
    
    # Status Logic
    status = "CALM"
    if score > 35: status = "FATIGUE"
    if score > 65: status = "TREMOR"
    
    # Prescription Logic
    insight = "System Optimal."
    prescription = "Maintain current workflow."
    
    if score == 0 and efficiency == 0:
        insight = "User Idle."
        prescription = "None."
    elif efficiency < 50:
        insight = "Cognitive Efficiency Low (Brain Fog)."
        prescription = "ACTION: 20-20-20 Vision Break."
    elif meters > 500:
        insight = "Wrist Travel Limit Exceeded."
        prescription = "ACTION: Wrist Stretches."
    elif score > 40:
        insight = "Neurological Micro-Tremors detected."
        prescription = "ACTION: Box Breathing (4-4-4)."

    # GET LAST COORDINATE (For the Map)
    last_x = 0
    last_y = 0
    with tracker.lock:
        if len(tracker.mouse_data) > 0:
            last_x = tracker.mouse_data[-1]['x']
            last_y = tracker.mouse_data[-1]['y']

    return jsonify({
        "score": round(score, 1),
        "status": status,
        "meters": round(meters, 2),
        "efficiency": round(efficiency, 0),
        "insight": insight,
        "prescription": prescription,
        "x": last_x,
        "y": last_y,
        "timestamp": time.time()
    })

if __name__ == '__main__':
    print("Starting NeuroCursor Engine...")
    app.run(debug=True, port=5000)