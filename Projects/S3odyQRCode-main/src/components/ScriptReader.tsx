import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, RotateCcw, Volume2, VolumeX, FileText, Upload, Trash2, Settings } from 'lucide-react';

export function ScriptReader() {
  const [text, setText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [highlightedText, setHighlightedText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Set default voice (prefer English voices)
      const englishVoice = availableVoices.find(voice => 
        voice.lang.startsWith('en') && voice.localService
      ) || availableVoices[0];
      
      setSelectedVoice(englishVoice);
    };

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (utteranceRef.current) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlay = () => {
    if (!text.trim()) return;

    if (isPaused) {
      speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    // Cancel any existing speech
    speechSynthesis.cancel();

    const textToSpeak = text.substring(currentPosition);
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    utterance.rate = speed;
    utterance.volume = isMuted ? 0 : volume;
    utterance.voice = selectedVoice;

    let charIndex = currentPosition;
    
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        charIndex = currentPosition + event.charIndex;
        setCurrentPosition(charIndex);
        
        // Highlight current sentence
        const sentences = text.split(/[.!?]+/);
        let currentSentence = '';
        let sentenceStart = 0;
        
        for (const sentence of sentences) {
          const sentenceEnd = sentenceStart + sentence.length;
          if (charIndex >= sentenceStart && charIndex <= sentenceEnd) {
            currentSentence = sentence.trim();
            break;
          }
          sentenceStart = sentenceEnd + 1;
        }
        
        setHighlightedText(currentSentence);
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentPosition(0);
      setHighlightedText('');
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleStop = () => {
    speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentPosition(0);
    setHighlightedText('');
  };

  const handleReset = () => {
    speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentPosition(0);
    setHighlightedText('');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setText(content);
      setCurrentPosition(0);
      setHighlightedText('');
    };
    reader.readAsText(file);
  };

  const handleClearText = () => {
    setText('');
    handleStop();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (utteranceRef.current && isPlaying) {
      // Restart with new volume
      const wasPlaying = isPlaying;
      handleStop();
      if (wasPlaying) {
        setTimeout(handlePlay, 100);
      }
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (utteranceRef.current && isPlaying) {
      // Restart with new speed
      const wasPlaying = isPlaying;
      handleStop();
      if (wasPlaying) {
        setTimeout(handlePlay, 100);
      }
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (utteranceRef.current && isPlaying) {
      // Restart with new volume
      const wasPlaying = isPlaying;
      handleStop();
      if (wasPlaying) {
        setTimeout(handlePlay, 100);
      }
    }
  };

  const getDisplayText = () => {
    if (!highlightedText || !text.includes(highlightedText)) {
      return text;
    }

    const parts = text.split(highlightedText);
    return (
      <>
        {parts[0]}
        <span className="bg-blue-200 text-blue-900 px-1 rounded font-medium">{highlightedText}</span>
        {parts.slice(1).join(highlightedText)}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-lg">
              <FileText className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Echo Script Reader
          </h1>
          <p className="text-gray-600 text-xl max-w-3xl mx-auto leading-relaxed">
            Transform your text into natural speech with advanced voice synthesis. Upload documents, paste content, and listen with customizable playback controls.
          </p>
        </div>

        <div className="max-w-6xl mx-auto space-y-8">
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Text Input Section - Takes 2 columns */}
            <div className="lg:col-span-2">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <FileText className="w-6 h-6 mr-3 text-blue-600" />
                    Your Script
                  </h2>
                  <div className="flex space-x-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".txt,.md,.doc,.docx"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all duration-200 font-medium"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </button>
                    <button
                      onClick={handleClearText}
                      className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all duration-200 font-medium"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear
                    </button>
                  </div>
                </div>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your text here, upload a document, or start typing your script..."
                  className="w-full h-80 p-6 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 resize-none text-gray-700 leading-relaxed text-lg transition-all duration-200"
                />

                {/* Character Count */}
                <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
                  <span>{text.length} characters</span>
                  <span>{text.split(/\s+/).filter(word => word.length > 0).length} words</span>
                </div>

                {/* Currently Reading Highlight */}
                {highlightedText && (
                  <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl">
                    <p className="text-sm text-blue-600 font-medium mb-2">Currently Reading:</p>
                    <p className="text-gray-800 font-medium text-lg">{highlightedText}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Controls Section - Takes 1 column */}
            <div className="space-y-6">
              {/* Playback Controls */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <Play className="w-5 h-5 mr-2 text-blue-600" />
                  Controls
                </h3>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    onClick={handlePlay}
                    disabled={!text.trim() || (isPlaying && !isPaused)}
                    className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {isPaused ? 'Resume' : 'Play'}
                  </button>

                  <button
                    onClick={handlePause}
                    disabled={!isPlaying}
                    className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-xl hover:from-yellow-600 hover:to-orange-600 focus:outline-none focus:ring-4 focus:ring-yellow-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </button>

                  <button
                    onClick={handleStop}
                    disabled={!isPlaying && !isPaused}
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
                </div>

                {/* Progress Bar */}
                {text && (
                  <div className="mb-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Progress</span>
                      <span>{Math.round((currentPosition / text.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-300 shadow-sm"
                        style={{ width: `${(currentPosition / text.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Settings Toggle */}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all duration-200"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {showSettings ? 'Hide Settings' : 'Show Settings'}
                </button>
              </div>

              {/* Settings Panel */}
              {showSettings && (
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-white/20 animate-in fade-in duration-300">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-blue-600" />
                    Settings
                  </h3>
                  
                  <div className="space-y-6">
                    {/* Speed Control */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Speed: {speed.toFixed(1)}x
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={speed}
                        onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0.5x</span>
                        <span>1x</span>
                        <span>2x</span>
                      </div>
                    </div>

                    {/* Volume Control */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        <div className="flex items-center justify-between">
                          <span>Volume: {Math.round(volume * 100)}%</span>
                          <button
                            onClick={toggleMute}
                            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-blue-600" />}
                          </button>
                        </div>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        disabled={isMuted}
                      />
                    </div>

                    {/* Voice Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Voice
                      </label>
                      <select
                        value={selectedVoice?.name || ''}
                        onChange={(e) => {
                          const voice = voices.find(v => v.name === e.target.value);
                          setSelectedVoice(voice || null);
                        }}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white text-sm"
                      >
                        {voices.map((voice) => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name} ({voice.lang})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Text Preview with Highlighting */}
          {text && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <FileText className="w-6 h-6 mr-3 text-blue-600" />
                Live Preview
              </h3>
              <div className="prose max-w-none text-gray-700 leading-relaxed text-lg">
                {getDisplayText()}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500">
          <p className="text-lg">© 2025 Echo Script Reader. Powered by S3ody.</p>
          <p className="text-sm mt-2">Transform text into natural speech with advanced controls.</p>
        </div>
      </div>
    </div>
  );
}