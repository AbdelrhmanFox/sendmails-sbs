import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Square, RotateCcw, Settings, Maximize, Minimize, Upload, Trash2, Monitor } from 'lucide-react';

export function Teleprompter() {
  const [text, setText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(50);
  const [fontSize, setFontSize] = useState(48);
  const [textColor, setTextColor] = useState('#ffffff');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  
  const displayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Split text into words for smoother display
  const words = text.split(/\s+/).filter(word => word.trim() !== '');
  const totalHeight = words.length * (fontSize * 1.5); // Approximate total height

  // Much faster and smoother scrolling animation
  useEffect(() => {
    if (isPlaying && words.length > 0) {
      const animate = (currentTime: number) => {
        if (lastTimeRef.current === 0) {
          lastTimeRef.current = currentTime;
        }

        const deltaTime = currentTime - lastTimeRef.current;
        // Much faster base speed - multiply by 8 for faster scrolling
        const baseSpeed = (scrollSpeed / 100) * fontSize * 8;
        const increment = (baseSpeed * deltaTime) / 1000;

        setScrollPosition(prev => {
          const newPosition = prev + increment;
          // Stop when we reach the end
          if (newPosition >= totalHeight) {
            setIsPlaying(false);
            return totalHeight;
          }
          return newPosition;
        });

        lastTimeRef.current = currentTime;
        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      lastTimeRef.current = 0;
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, scrollSpeed, fontSize, words.length, totalHeight]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayback();
      } else if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, isFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlayback = useCallback(() => {
    if (!text.trim()) return;
    setIsPlaying(prev => !prev);
  }, [text]);

  const handleStop = () => {
    setIsPlaying(false);
    setScrollPosition(0);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setScrollPosition(0);
  };

  const enterFullscreen = async () => {
    if (containerRef.current && !isFullscreen) {
      try {
        await containerRef.current.requestFullscreen();
      } catch (error) {
        console.error('Error entering fullscreen:', error);
      }
    }
  };

  const exitFullscreen = async () => {
    if (isFullscreen) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        console.error('Error exiting fullscreen:', error);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setText(content);
      setScrollPosition(0);
    };
    reader.readAsText(file);
  };

  const handleClearText = () => {
    setText('');
    setIsPlaying(false);
    setScrollPosition(0);
  };

  // Create smooth flowing text display with better visibility
  const renderFlowingText = () => {
    if (!text.trim()) return null;

    // Split text into paragraphs and then into words with proper spacing
    const paragraphs = text.split('\n\n').filter(p => p.trim() !== '');
    
    return (
      <div
        ref={textContainerRef}
        className="transition-transform duration-75 ease-linear"
        style={{
          transform: `translateY(-${scrollPosition}px)`,
          lineHeight: `${fontSize * 1.5}px`,
          fontSize: `${fontSize}px`,
          color: textColor,
          fontWeight: '600',
          letterSpacing: '0.02em',
          textAlign: 'center',
          maxWidth: '95%',
          margin: '0 auto',
          paddingTop: isFullscreen ? '45vh' : '25vh',
          paddingBottom: isFullscreen ? '55vh' : '35vh',
        }}
      >
        {paragraphs.map((paragraph, pIndex) => (
          <div key={pIndex} style={{ marginBottom: `${fontSize * 1}px` }}>
            {paragraph.split(/\s+/).map((word, wIndex) => {
              const globalWordIndex = paragraphs.slice(0, pIndex).join(' ').split(/\s+/).length + wIndex;
              const wordPosition = globalWordIndex * (fontSize * 1.5);
              const distanceFromCenter = Math.abs(wordPosition - scrollPosition);
              const centerZone = fontSize * 3; // Larger center zone for better visibility
              
              // Much better visibility - less fade effect
              let opacity = 1;
              let scale = 1;
              let textShadow = 'none';
              
              if (distanceFromCenter < centerZone) {
                // Words in center zone - full visibility with glow
                opacity = 1;
                scale = 1.05;
                textShadow = `0 0 20px ${textColor}40, 0 2px 4px rgba(0,0,0,0.5)`;
              } else if (distanceFromCenter < centerZone * 2) {
                // Words near center - high visibility
                opacity = 0.9;
                scale = 1;
                textShadow = '0 2px 4px rgba(0,0,0,0.3)';
              } else if (distanceFromCenter < centerZone * 3) {
                // Words further away - medium visibility
                opacity = 0.7;
                scale = 0.98;
              } else {
                // Words far away - low visibility but still readable
                opacity = 0.4;
                scale = 0.95;
              }
              
              return (
                <span
                  key={`${pIndex}-${wIndex}`}
                  className="inline-block transition-all duration-200 ease-out"
                  style={{
                    opacity,
                    transform: `scale(${scale})`,
                    marginRight: `${fontSize * 0.25}px`,
                    textShadow,
                    filter: distanceFromCenter < centerZone ? 'brightness(1.1)' : 'none',
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen transition-all duration-300 ${
        isFullscreen 
          ? 'fixed inset-0 z-50' 
          : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'
      }`}
      style={isFullscreen ? { backgroundColor } : {}}
    >
      {/* Header - Hidden in fullscreen */}
      {!isFullscreen && (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-2xl shadow-lg">
                <Monitor className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Teleprompter
            </h1>
            <p className="text-gray-600 text-xl max-w-3xl mx-auto leading-relaxed">
              Professional teleprompter with ultra-fast smooth scrolling, high visibility text, and full-screen mode. Perfect for presentations, speeches, and video recording.
            </p>
          </div>
        </div>
      )}

      <div className={`${isFullscreen ? 'h-full flex' : 'container mx-auto px-4 pb-8'}`}>
        <div className={`${isFullscreen ? 'h-full flex' : 'max-w-7xl mx-auto space-y-8'}`}>
          
          {/* Settings Panel - Side panel in fullscreen, top panel otherwise */}
          {(!isFullscreen || showSettings) && (
            <div className={`${
              isFullscreen 
                ? 'w-80 bg-black/90 backdrop-blur-sm p-6 overflow-y-auto' 
                : 'bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-bold flex items-center ${
                  isFullscreen ? 'text-white' : 'text-gray-800'
                }`}>
                  <Settings className="w-6 h-6 mr-3 text-purple-600" />
                  {isFullscreen ? 'Controls' : 'Script & Controls'}
                </h2>
                {isFullscreen && (
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    <Minimize className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Text Input - Hidden in fullscreen */}
              {!isFullscreen && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-semibold text-gray-700">Script Text</label>
                    <div className="flex space-x-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".txt,.md"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
                      >
                        <Upload className="w-3 h-3 mr-1" />
                        Upload
                      </button>
                      <button
                        onClick={handleClearText}
                        className="flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Clear
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter your script here... The text will flow smoothly with fast, natural scrolling motion."
                    className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 resize-none text-gray-700 leading-relaxed"
                  />
                  <div className="text-sm text-gray-500 mt-2">
                    {words.length} words • {text.length} characters
                  </div>
                </div>
              )}

              {/* Playback Controls */}
              <div className="mb-8">
                <h3 className={`text-lg font-semibold mb-4 ${
                  isFullscreen ? 'text-white' : 'text-gray-800'
                }`}>
                  Playback Controls
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={togglePlayback}
                    disabled={!text.trim()}
                    className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>

                  <button
                    onClick={handleStop}
                    disabled={!isPlaying && scrollPosition === 0}
                    className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-pink-700 focus:outline-none focus:ring-4 focus:ring-red-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </button>

                  <button
                    onClick={handleReset}
                    className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-xl hover:from-gray-600 hover:to-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </button>

                  <button
                    onClick={isFullscreen ? exitFullscreen : enterFullscreen}
                    disabled={!text.trim()}
                    className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-700 focus:outline-none focus:ring-4 focus:ring-purple-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4 mr-2" /> : <Maximize className="w-4 h-4 mr-2" />}
                    {isFullscreen ? 'Exit' : 'Fullscreen'}
                  </button>
                </div>

                {/* Progress */}
                {words.length > 0 && (
                  <div className="mb-4">
                    <div className={`flex justify-between text-sm mb-2 ${
                      isFullscreen ? 'text-white/70' : 'text-gray-600'
                    }`}>
                      <span>Progress</span>
                      <span>{Math.round((scrollPosition / totalHeight) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (scrollPosition / totalHeight) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className={`text-sm ${isFullscreen ? 'text-white/70' : 'text-gray-500'}`}>
                  Press <kbd className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs">Space</kbd> to play/pause
                </div>
              </div>

              {/* Display Settings */}
              <div className="space-y-6">
                <h3 className={`text-lg font-semibold ${
                  isFullscreen ? 'text-white' : 'text-gray-800'
                }`}>
                  Display Settings
                </h3>

                {/* Scroll Speed */}
                <div>
                  <label className={`block text-sm font-semibold mb-3 ${
                    isFullscreen ? 'text-white' : 'text-gray-700'
                  }`}>
                    Scroll Speed: {scrollSpeed}% (Fast Mode)
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={scrollSpeed}
                    onChange={(e) => setScrollSpeed(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className={`flex justify-between text-xs mt-1 ${
                    isFullscreen ? 'text-white/50' : 'text-gray-500'
                  }`}>
                    <span>Slow</span>
                    <span>Very Fast</span>
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <label className={`block text-sm font-semibold mb-3 ${
                    isFullscreen ? 'text-white' : 'text-gray-700'
                  }`}>
                    Font Size: {fontSize}px
                  </label>
                  <input
                    type="range"
                    min="24"
                    max="120"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className={`flex justify-between text-xs mt-1 ${
                    isFullscreen ? 'text-white/50' : 'text-gray-500'
                  }`}>
                    <span>24px</span>
                    <span>120px</span>
                  </div>
                </div>

                {/* Text Color */}
                <div>
                  <label className={`block text-sm font-semibold mb-3 ${
                    isFullscreen ? 'text-white' : 'text-gray-700'
                  }`}>
                    Text Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-12 h-10 rounded-lg border-2 border-gray-200 cursor-pointer"
                    />
                    <span className={`text-sm ${
                      isFullscreen ? 'text-white/70' : 'text-gray-600'
                    }`}>
                      {textColor}
                    </span>
                  </div>
                </div>

                {/* Background Color */}
                <div>
                  <label className={`block text-sm font-semibold mb-3 ${
                    isFullscreen ? 'text-white' : 'text-gray-700'
                  }`}>
                    Background Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-12 h-10 rounded-lg border-2 border-gray-200 cursor-pointer"
                    />
                    <span className={`text-sm ${
                      isFullscreen ? 'text-white/70' : 'text-gray-600'
                    }`}>
                      {backgroundColor}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Display Area */}
          <div className={`${
            isFullscreen 
              ? 'flex-1 flex items-center justify-center relative overflow-hidden' 
              : 'bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 overflow-hidden'
          }`}>
            {/* Settings Toggle for Fullscreen */}
            {isFullscreen && !showSettings && (
              <button
                onClick={() => setShowSettings(true)}
                className="absolute top-6 left-6 z-10 p-3 bg-black/50 backdrop-blur-sm text-white rounded-xl hover:bg-black/70 transition-all duration-200"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}

            <div
              ref={displayRef}
              className={`${
                isFullscreen 
                  ? 'w-full h-full flex items-start justify-center overflow-hidden' 
                  : 'h-96 flex items-start justify-center overflow-hidden'
              }`}
              style={{ backgroundColor: isFullscreen ? backgroundColor : '#f8fafc' }}
            >
              {text.trim() ? (
                <div className="w-full h-full overflow-hidden relative">
                  {renderFlowingText()}
                </div>
              ) : (
                <div className="text-center flex items-center justify-center h-full">
                  <div>
                    <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-xl">
                      {isFullscreen ? 'No script loaded' : 'Enter your script to begin'}
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                      {isFullscreen ? 'Exit fullscreen to add content' : 'Type or upload a text file for ultra-fast scrolling'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Hidden in fullscreen */}
      {!isFullscreen && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">© 2025 s3ody Tools. Professional Teleprompter.</p>
          <p className="text-sm mt-2">Ultra-fast smooth scrolling with high visibility text.</p>
        </div>
      )}
    </div>
  );
}