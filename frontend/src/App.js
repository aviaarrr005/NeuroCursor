import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

function App() {
  const [dataHistory, setDataHistory] = useState([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [status, setStatus] = useState("INITIALIZING...");

  useEffect(() => {
    const interval = setInterval(() => {
      axios.get('http://localhost:5000/data')
        .then(response => {
          const { score, status, timestamp } = response.data;
          
          setCurrentScore(score);
          setStatus(status);

          setDataHistory(prev => {
            const newData = [...prev, { time: timestamp, score: score }];
            if (newData.length > 60) newData.shift(); // Keep last 60 points
            return newData;
          });
        })
        .catch(err => {
          console.log("Backend offline");
          setStatus("CONNECTING...");
        });
    }, 100); // Refresh every 100ms

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (status === "CALM") return "#00ff00";    // Green
    if (status === "FATIGUE") return "#ffff00"; // Yellow
    if (status === "TREMOR") return "#ff0000";  // Red
    return "#888"; // Grey for Connecting
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🧠 NEURO<span style={{color: getStatusColor()}}>CURSOR</span></h1>
        <p>DIGITAL PHENOTYPING ENGINE v1.0</p>
      </header>

      <div className="dashboard-grid">
        {/* Card 1: The Score */}
        <div className="card metric-card" style={{borderColor: getStatusColor()}}>
          <h2>MOTOR INSTABILITY</h2>
          <div className="score-display" style={{color: getStatusColor()}}>
            {currentScore}
          </div>
          <div className="status-badge" style={{backgroundColor: getStatusColor(), color: '#000'}}>
            {status}
          </div>
        </div>

        {/* Card 2: The Graph */}
        <div className="card graph-card">
          <h3>REAL-TIME TREMOR MONITOR</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dataHistory}>
              <XAxis dataKey="time" hide={true} />
              <YAxis domain={[0, 100]} hide={false} stroke="#888" />
              <Tooltip 
                contentStyle={{backgroundColor: '#111', border: '1px solid #333'}} 
                itemStyle={{color: '#fff'}}
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke={getStatusColor()} 
                strokeWidth={3} 
                dot={false} 
                isAnimationActive={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default App;