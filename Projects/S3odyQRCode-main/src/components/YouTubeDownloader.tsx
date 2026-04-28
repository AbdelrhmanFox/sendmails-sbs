import React, { useState } from 'react';
import { Download, Play, AlertCircle, CheckCircle, Loader2, Youtube, Music, Video, FileText } from 'lucide-react';

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: string;
  channel: string;
  views: string;
}

interface DownloadOption {
  format: 'mp3' | 'mp4';
  quality: string;
  size: string;
  label: string;
}

export function YouTubeDownloader() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'mp3' | 'mp4'>('mp4');

  // Mock download options - in real implementation, these would come from the API
  const downloadOptions: DownloadOption[] = [
    { format: 'mp4', quality: '1080p', size: '~45MB', label: '1080p HD' },
    { format: 'mp4', quality: '720p', size: '~25MB', label: '720p HD' },
    { format: 'mp4', quality: '480p', size: '~15MB', label: '480p' },
    { format: 'mp4', quality: '360p', size: '~8MB', label: '360p' },
    { format: 'mp4', quality: '144p', size: '~3MB', label: '144p' },
    { format: 'mp3', quality: '320kbps', size: '~8MB', label: 'High Quality MP3' },
    { format: 'mp3', quality: '192kbps', size: '~5MB', label: 'Standard MP3' },
    { format: 'mp3', quality: '128kbps', size: '~3MB', label: 'Basic MP3' },
  ];

  const validateYouTubeUrl = (inputUrl: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/;
    return youtubeRegex.test(inputUrl);
  };

  const extractVideoId = (inputUrl: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = inputUrl.match(regex);
    return match ? match[1] : null;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setError('');
    setVideoInfo(null);
  };

  const fetchVideoInfo = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    if (!validateYouTubeUrl(url)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Simulate API call - in real implementation, you'd call your backend
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock video info - in real implementation, this would come from your API
      const mockVideoInfo: VideoInfo = {
        title: "Sample Video Title - How to Build Amazing Web Applications",
        thumbnail: "https://images.pexels.com/photos/1591056/pexels-photo-1591056.jpeg?auto=compress&cs=tinysrgb&w=480&h=270&dpr=1",
        duration: "12:34",
        channel: "Tech Channel",
        views: "1.2M views"
      };

      setVideoInfo(mockVideoInfo);
    } catch (err) {
      setError('Failed to fetch video information. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (option: DownloadOption) => {
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // Simulate download progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setDownloadProgress(i);
      }

      // In real implementation, you would:
      // 1. Call your backend API with the video URL and format
      // 2. Your backend would use youtube-dl or similar to download
      // 3. Return the download link or stream the file
      
      alert(`Download completed! (This is a demo - no actual file was downloaded)`);
    } catch (err) {
      setError('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const filteredOptions = downloadOptions.filter(option => option.format === selectedFormat);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-r from-red-600 to-pink-600 p-4 rounded-2xl shadow-lg">
              <Youtube className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-4">
            YouTube Downloader
          </h1>
          <p className="text-gray-600 text-xl max-w-3xl mx-auto leading-relaxed">
            Download YouTube videos in multiple formats and qualities. Convert to MP3 for audio or MP4 for video with ease.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* URL Input Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
            <div className="mb-6">
              <label htmlFor="youtube-url" className="block text-sm font-semibold text-gray-700 mb-3">
                <Youtube className="w-4 h-4 inline mr-2" />
                YouTube URL
              </label>
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <input
                    id="youtube-url"
                    type="text"
                    value={url}
                    onChange={handleUrlChange}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={`w-full px-6 py-4 text-lg border-2 rounded-2xl focus:outline-none transition-all duration-200 ${
                      error && url.trim()
                        ? 'border-red-300 focus:border-red-500 bg-red-50'
                        : 'border-gray-200 focus:border-red-500 bg-gray-50 focus:bg-white'
                    }`}
                  />
                  {error && url.trim() && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                  )}
                </div>
                <button
                  onClick={fetchVideoInfo}
                  disabled={!url.trim() || isLoading}
                  className="px-8 py-4 bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold rounded-2xl hover:from-red-600 hover:to-pink-700 focus:outline-none focus:ring-4 focus:ring-red-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Play className="w-5 h-5 mr-2" />
                      Get Info
                    </div>
                  )}
                </button>
              </div>
              {error && (
                <p className="text-red-500 text-sm mt-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {error}
                </p>
              )}
            </div>

            {/* Format Selection */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setSelectedFormat('mp4')}
                className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  selectedFormat === 'mp4'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Video className="w-4 h-4 mr-2" />
                Video (MP4)
              </button>
              <button
                onClick={() => setSelectedFormat('mp3')}
                className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  selectedFormat === 'mp3'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Music className="w-4 h-4 mr-2" />
                Audio (MP3)
              </button>
            </div>
          </div>

          {/* Video Info Display */}
          {videoInfo && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20 animate-in fade-in duration-500">
              <div className="flex items-center mb-6">
                <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
                <h3 className="text-xl font-semibold text-gray-800">Video Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Thumbnail */}
                <div className="md:col-span-1">
                  <img 
                    src={videoInfo.thumbnail} 
                    alt="Video thumbnail" 
                    className="w-full rounded-xl shadow-lg"
                  />
                </div>
                
                {/* Video Details */}
                <div className="md:col-span-2 space-y-4">
                  <h4 className="text-xl font-bold text-gray-800 leading-tight">
                    {videoInfo.title}
                  </h4>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <Youtube className="w-4 h-4 mr-1" />
                      {videoInfo.channel}
                    </span>
                    <span className="flex items-center">
                      <Play className="w-4 h-4 mr-1" />
                      {videoInfo.duration}
                    </span>
                    <span className="flex items-center">
                      <FileText className="w-4 h-4 mr-1" />
                      {videoInfo.views}
                    </span>
                  </div>
                </div>
              </div>

              {/* Download Options */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <Download className="w-5 h-5 mr-2" />
                  Download Options ({selectedFormat.toUpperCase()})
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredOptions.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleDownload(option)}
                      disabled={isDownloading}
                      className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <div className="flex items-center">
                        {option.format === 'mp3' ? (
                          <Music className="w-5 h-5 text-green-600 mr-3" />
                        ) : (
                          <Video className="w-5 h-5 text-blue-600 mr-3" />
                        )}
                        <div className="text-left">
                          <div className="font-medium text-gray-800">{option.label}</div>
                          <div className="text-sm text-gray-500">{option.size}</div>
                        </div>
                      </div>
                      <Download className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Download Progress */}
              {isDownloading && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">Downloading...</span>
                    <span className="text-sm text-blue-600">{downloadProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          {!videoInfo && !isLoading && (
            <div className="text-center mt-12 text-gray-500">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-gray-200">
                <Youtube className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">How to use</h3>
                <ol className="text-sm space-y-2 max-w-md mx-auto">
                  <li>1. Copy a YouTube video URL</li>
                  <li>2. Paste it in the input field above</li>
                  <li>3. Click "Get Info" to fetch video details</li>
                  <li>4. Choose your preferred format and quality</li>
                  <li>5. Click download to save the file</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="text-center mt-16 text-gray-400 text-sm max-w-2xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-yellow-700">
              <strong>Note:</strong> Test.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-400 text-sm">
          <p>© 2025 s3ody Tools. YouTube Downloader Demo.</p>
        </div>
      </div>
    </div>
  );
}