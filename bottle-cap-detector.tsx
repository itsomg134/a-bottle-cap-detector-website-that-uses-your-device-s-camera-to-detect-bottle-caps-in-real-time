import React, { useState, useRef, useEffect } from 'react';
import { Camera, Circle, AlertCircle } from 'lucide-react';

export default function BottleCapDetector() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedCaps, setDetectedCaps] = useState([]);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsDetecting(true);
        setError('');
      }
    } catch (err) {
      setError('Unable to access camera. Please grant camera permissions.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsDetecting(false);
      setDetectedCaps([]);
    }
  };

  const detectCircles = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Simple edge detection and circle approximation
    const detected = [];
    const step = 20;
    const radius = 15;

    for (let y = radius; y < canvas.height - radius; y += step) {
      for (let x = radius; x < canvas.width - radius; x += step) {
        let edgeCount = 0;
        const centerIdx = (y * canvas.width + x) * 4;
        const centerBrightness = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3;

        // Check circular pattern
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
          const checkX = Math.round(x + Math.cos(angle) * radius);
          const checkY = Math.round(y + Math.sin(angle) * radius);
          const idx = (checkY * canvas.width + checkX) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          
          if (Math.abs(brightness - centerBrightness) > 30) {
            edgeCount++;
          }
        }

        // If enough edges detected in circular pattern, mark as potential cap
        if (edgeCount >= 10) {
          detected.push({ x, y, radius, confidence: edgeCount / 16 });
        }
      }
    }

    // Filter overlapping detections
    const filtered = [];
    detected.forEach(cap => {
      const overlapping = filtered.some(existing => {
        const dist = Math.sqrt(Math.pow(cap.x - existing.x, 2) + Math.pow(cap.y - existing.y, 2));
        return dist < radius * 2;
      });
      if (!overlapping) {
        filtered.push(cap);
      }
    });

    setDetectedCaps(filtered);
  };

  useEffect(() => {
    let interval;
    if (isDetecting) {
      interval = setInterval(detectCircles, 500);
    }
    return () => clearInterval(interval);
  }, [isDetecting]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Circle className="w-8 h-8 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-800">Bottle Cap Detector</h1>
          </div>
          <p className="text-gray-600">Point your camera at bottle caps to detect them</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
            {!isDetecting ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={startCamera}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  Start Camera
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-auto"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Detection overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {detectedCaps.map((cap, idx) => {
                    const scaleX = videoRef.current ? videoRef.current.offsetWidth / videoRef.current.videoWidth : 1;
                    const scaleY = videoRef.current ? videoRef.current.offsetHeight / videoRef.current.videoHeight : 1;
                    
                    return (
                      <g key={idx}>
                        <circle
                          cx={cap.x * scaleX}
                          cy={cap.y * scaleY}
                          r={cap.radius * scaleX}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3"
                        />
                        <circle
                          cx={cap.x * scaleX}
                          cy={cap.y * scaleY}
                          r="4"
                          fill="#10b981"
                        />
                      </g>
                    );
                  })}
                </svg>
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {isDetecting && (
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold">
                  {detectedCaps.length} Cap{detectedCaps.length !== 1 ? 's' : ''} Detected
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Detecting...</span>
                </div>
              </div>
              <button
                onClick={stopCamera}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Stop Camera
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">How to Use</h2>
          <ol className="space-y-2 text-gray-600">
            <li className="flex gap-2">
              <span className="font-semibold text-indigo-600">1.</span>
              <span>Click "Start Camera" to enable your device camera</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-indigo-600">2.</span>
              <span>Point the camera at bottle caps (works best with contrasting backgrounds)</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-indigo-600">3.</span>
              <span>Detected caps will be highlighted with green circles</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-indigo-600">4.</span>
              <span>The counter shows how many caps are currently detected</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}