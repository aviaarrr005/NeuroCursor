import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import './App.css';

function App() {
  const [dataHistory, setDataHistory] = useState([]);
  const [metrics, setMetrics] = useState({
    score: 0,
    meters: 0,
    efficiency: 0,
    status: "INITIALIZING...",
    insight: "Calibrating...",
    prescription: "Analyzing..."
  });
  
  const canvasRef = useRef(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastSpeechTime = useRef(0);
  const isMounted = useRef(true);

  // --- OPTIMIZED FETCH LOOP ---
  const fetchData = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      const start = Date.now();
      const response = await axios.get('http://localhost:5000/data');
      const { score, status, meters, efficiency, insight, prescription, x, y, timestamp } = response.data;
      
      // 1. Batch State Updates (Reduces Re-renders)
      setMetrics({ score, status, meters, efficiency, insight, prescription });

      // 2. Update History (Limit to 30 points for performance)
      setDataHistory(prev => {
        const newData = [...prev, { time: timestamp, score: score }];
        if (newData.length > 30) newData.shift(); 
        return newData;
      });

      // 3. Draw Map directly (No State dependency)
      drawNeuroMap(x, y, score);
      
      // 4. Audio Check
      handleVoiceAlert(status);

      // Calculate remaining time to maintain ~60fps target (approx 16ms)
      // or fallback to 100ms polling if fast.
      const elapsed = Date.now() - start;
      const delay = Math.max(0, 100 - elapsed); 
      
      setTimeout(fetchData, delay); // Recursive call

    } catch (err) {
      console.log("Backend offline");
      setTimeout(fetchData, 500); // Retry slower if offline
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchData(); // Start the loop
    return () => { isMounted.current = false; };
  }, [fetchData]);

  // --- AUDIO LOGIC ---
  const handleVoiceAlert = (currentStatus) => {
    const now = Date.now();
    if (now - lastSpeechTime.current > 20000) { 
      if (currentStatus === "TREMOR") {
        speak("High instability.");
        lastSpeechTime.current = now;
      } 
    }
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.2; // Faster speech to unlock thread
      window.speechSynthesis.speak(utterance);
    }
  };

  // --- CANVAS LOGIC ---
  const drawNeuroMap = (x, y, score) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Hardcoded scale for performance (Avoid calculating every frame)
    const scaleX = canvas.width / 1920;
    const scaleY = canvas.height / 1080;
    const drawX = x * scaleX;
    const drawY = y * scaleY;

    let color = "#00ff00"; 
    if (score > 35) color = "#ffff00"; 
    if (score > 65) color = "#ff0000"; 

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    // Distance check to prevent cross-canvas lines
    const dist = Math.abs(drawX - lastPos.current.x) + Math.abs(drawY - lastPos.current.y);
    if (dist > 2 && dist < 100) {
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(drawX, drawY);
        ctx.stroke();
    }
    
    // Optimized Fade (FillRect is expensive, do it less opacity)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    lastPos.current = { x: drawX, y: drawY };
  };

  const getThemeColor = () => {
    if (metrics.status === "CALM") return "#00ff00";
    if (metrics.status === "FATIGUE") return "#ffa500";
    if (metrics.status === "TREMOR") return "#ff0000";
    return "#888"; 
  };

  return (
    <div className={`App ${metrics.status}`}>
      
      <div className={`hud-warning ${metrics.status === "TREMOR" ? "active" : ""}`}>
        ⚠ CRITICAL INSTABILITY
      </div>

      <header className="App-header">
        <h1>🧠 NEURO<span style={{color: getThemeColor()}}>CURSOR</span></h1>
        <p>REAL-TIME BIOMETRIC ENGINE</p>
      </header>

      <div className="diagnosis-container">
        <div className="insight-box" style={{borderLeftColor: getThemeColor()}}>
            <span className="label">AI ANALYSIS:</span> {metrics.insight}
        </div>
        <div className="prescription-box" style={{borderColor: getThemeColor(), color: getThemeColor()}}>
             <span className="label">ACTION:</span> {metrics.prescription}
        </div>
      </div>

      <div className="dashboard-grid">
        
        <div className="metric-column">
            <div className="card metric-card" style={{borderColor: getThemeColor()}}>
                <h2>STABILITY</h2>
                <div className="score-display" style={{color: getThemeColor()}}>
                    {metrics.score}
                </div>
            </div>

            <div className="card metric-card">
                <h2>COGNITIVE EFFICIENCY</h2>
                <div className="score-display" style={{color: metrics.efficiency < 60 ? '#ff4444' : '#fff'}}>
                    {metrics.efficiency}%
                </div>
            </div>

            <div className="card metric-card">
                <h2>WRIST TRAVEL</h2>
                <div className="score-display" style={{color: '#00d8ff'}}>
                    {metrics.meters}<span style={{fontSize:'20px'}}>m</span>
                </div>
            </div>
        </div>

        <div className="visual-column">
            <div className="card map-card">
                <h3>LIVE NEURO-MAP</h3>
                <canvas ref={canvasRef} width={600} height={280} style={{backgroundColor: '#050505', borderRadius: '8px'}}/>
            </div>

            <div className="card graph-card">
                <h3>BIOMETRIC HISTORY</h3>
                {/* Recharts Optimization: Removed Tooltip, Animation, and reduced logic */}
                <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={dataHistory}>
                        <XAxis dataKey="time" hide={true} />
                        <YAxis domain={[0, 100]} hide={true} />
                        <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke={getThemeColor()} 
                            strokeWidth={2} 
                            dot={false} 
                            isAnimationActive={false} 
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

      </div>
    </div>
  );
}

export default App;