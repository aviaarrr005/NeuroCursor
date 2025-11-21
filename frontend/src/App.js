import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

function App() {
  const [dataHistory, setDataHistory] = useState([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [meters, setMeters] = useState(0);
  const [efficiency, setEfficiency] = useState(0);
  const [status, setStatus] = useState("INITIALIZING...");
  const [insight, setInsight] = useState("Calibrating...");
  const [prescription, setPrescription] = useState("Analyzing...");

  useEffect(() => {
    const interval = setInterval(() => {
      axios.get('http://localhost:5000/data')
        .then(response => {
          const { score, status, meters, efficiency, insight, prescription, timestamp } = response.data;
          
          setCurrentScore(score);
          setStatus(status);
          setMeters(meters);
          setEfficiency(efficiency);
          setInsight(insight);
          setPrescription(prescription);

          setDataHistory(prev => {
            const newData = [...prev, { time: timestamp, score: score }];
            if (newData.length > 60) newData.shift(); 
            return newData;
          });
        })
        .catch(err => console.log("Backend offline"));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (status === "CALM") return "#00ff00"; 
    if (status === "FATIGUE") return "#ffff00"; 
    if (status === "TREMOR") return "#ff0000"; 
    return "#888"; 
  };

  const getEfficiencyColor = () => {
      if (efficiency === 0) return "#444"; 
      if (efficiency < 60) return "#ff4444"; 
      return "#00ff00"; 
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🧠 NEURO<span style={{color: getStatusColor()}}>CURSOR</span></h1>
        <p>PREVENTATIVE HEALTH & ERGONOMICS ENGINE</p>
      </header>

      {/* The Medical Diagnosis Section */}
      <div className="diagnosis-container">
        <div className="insight-box">
            <span className="label">DIAGNOSIS:</span> {insight}
        </div>
        
        {/* Conditional Rendering: Only blink red if there is a problem */}
        {prescription !== "None." && prescription !== "Maintain current workflow." ? (
             <div className="prescription-box blink">
                <span className="label">⚠ RECOMMENDED ACTION:</span> {prescription}
            </div>
        ) : (
            <div className="prescription-box" style={{borderColor: '#00ff00', color: '#00ff00'}}>
                <span className="label">STATUS:</span> System Optimal. Continue work.
            </div>
        )}
      </div>

      <div className="dashboard-grid">
        <div className="card metric-card">
          <h2>MOTOR STABILITY</h2>
          <div className="score-display" style={{color: getStatusColor()}}>{currentScore}</div>
          <div className="status-badge" style={{backgroundColor: getStatusColor(), color: 'black'}}>{status}</div>
        </div>

        <div className="card metric-card">
          <h2>COGNITIVE FOCUS</h2>
          <div className="score-display" style={{color: getEfficiencyColor()}}>{efficiency}%</div>
          <div className="status-badge" style={{backgroundColor: '#333', color: '#fff'}}>
             {efficiency === 0 ? "IDLE" : (efficiency > 80 ? "FLOW STATE" : "DISTRACTED")}
          </div>
        </div>

        <div className="card metric-card">
          <h2>WRIST TRAVEL</h2>
          <div className="score-display" style={{color: '#00d8ff'}}>{meters} <span style={{fontSize:'30px', color:'#888'}}>m</span></div>
          <div className="status-badge" style={{backgroundColor: '#00d8ff', color: 'black'}}>PHYSICAL LOAD</div>
        </div>

        <div className="card graph-card" style={{width: '100%', maxWidth: '100%'}}>
          <h3>LIVE BIOMETRIC FEEDBACK</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dataHistory}>
              <XAxis dataKey="time" hide={true} />
              <YAxis domain={[0, 100]} hide={false} stroke="#888" />
              <Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333'}} itemStyle={{color:'#fff'}}/>
              <Line type="monotone" dataKey="score" stroke={getStatusColor()} strokeWidth={3} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default App;