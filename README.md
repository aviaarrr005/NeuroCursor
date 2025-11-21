# NeuroCursor 🖱️🧠
> The first non-invasive digital biomarker for mental fatigue.

## 💡 The Inspiration
We treat physical health with care, but ignore "Digital Burnout." 
NeuroCursor turns your standard computer mouse into a **neurological health diagnostic tool**. By analyzing micro-tremors and jitter in your cursor movements (phenotyping), we detect stress and fatigue before you even feel them.

## 🚀 How It Works
1. **Invisible Tracking:** A background script (`src/mouse_tracker.py`) records mouse coordinates (x, y) every 10ms.
2. **Math & ML:** We calculate **Micro-Jitter** and **Velocity Spikes** using `scikit-learn`.
3. **Real-Time Alerts:** If your tremor score exceeds the threshold, the Dashboard alerts you to take a break.

## 🛠️ Tech Stack
- **Python** (Logic)
- **Pynput** (Mouse Tracking)
- **Scikit-Learn** (Anomaly Detection/Isolation Forest)
- **Streamlit** (Live Dashboard)

## 📸 Screenshots
(Upload images to the 'assets' folder and link them here. E.g., ![Graph](assets/graph.png))

## ⚡ How to Run
```bash
pip install -r requirements.txt
python run.py