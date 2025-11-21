import streamlit as st
import time
import pandas as pd
import sys
import os

# Allow importing from src folder
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.mouse_tracker import tracker

st.set_page_config(page_title="NeuroCursor", page_icon="🧠", layout="wide")

st.title("🧠 NeuroCursor | Digital Phenotyping")
st.markdown("### Real-time Motor Control Analysis")

# Start the tracker automatically
if not tracker.is_tracking:
    tracker.start()

# Create the layout
col1, col2 = st.columns(2)
metric_placeholder = col1.empty()
chart_placeholder = col2.empty()

jitter_history = []

while True:
    # Get fresh data
    score = tracker.calculate_jitter()
    jitter_history.append(score)
    if len(jitter_history) > 50:
        jitter_history.pop(0)

    # Display the Score
    with metric_placeholder.container():
        if score < 30:
            st.success(f"Status: CALM (Score: {score:.1f})")
        elif score < 60:
            st.warning(f"Status: FATIGUE (Score: {score:.1f})")
        else:
            st.error(f"Status: TREMOR DETECTED (Score: {score:.1f})")

    # Display the Graph
    chart_data = pd.DataFrame(jitter_history, columns=["Tremor Level"])
    chart_placeholder.line_chart(chart_data)
    
    time.sleep(0.1)