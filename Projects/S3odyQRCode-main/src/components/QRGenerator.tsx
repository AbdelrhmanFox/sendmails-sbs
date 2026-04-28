import React, { useState, useRef } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Link, Check, AlertCircle } from 'lucide-react';

export function QRGenerator() {
  const [url, setUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [hasGenerated, setHasGenerated] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const validateUrl = (inputUrl: string): boolean => {
    if (!inputUrl.trim()) return true; // Empty is valid (no error shown)
    
    try {
      // Add protocol if missing
      const urlToTest = inputUrl.startsWith('http://') || inputUrl.startsWith('https://') 
        ? inputUrl 
        : `https://${inputUrl}`;
      
      new URL(urlToTest);
      return true;
    } catch {
      return false;
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setIsValidUrl(validateUrl(newUrl));
  };

  const generateQRCode = async () => {
    if (!url.trim() || !isValidUrl) return;

    setIsGenerating(true);
    
    try {
      // Add protocol if missing
      const urlToEncode = url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `https://${url}`;

      const dataUrl = await QRCode.toDataURL(urlToEncode, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1e293b',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });
      
      setQrCodeDataUrl(dataUrl);
      setHasGenerated(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.download = `qr-code-${Date.now()}.png`;
    link.href = qrCodeDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      generateQRCode();
    }
  };

  // Helper function to format URL for display
  const getDisplayUrl = () => {
    const hasProtocol = url.startsWith('http://') || url.startsWith('https://');
    return hasProtocol ? url : `https://${url}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            QR Code Generator
          </h2>
          <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto">
            Generate beautiful QR codes for any URL instantly. Fast, free, and secure.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Input Section */}
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border border-gray-100">
            <div className="mb-6">
              <label htmlFor="url-input" className="block text-sm font-semibold text-gray-700 mb-3">
                <Link className="w-4 h-4 inline mr-2" />
                Enter your URL
              </label>
              <div className="relative">
                <input
                  id="url-input"
                  type="text"
                  value={url}
                  onChange={handleUrlChange}
                  onKeyPress={handleKeyPress}
                  placeholder="https://example.com or just example.com"
                  className={`w-full px-6 py-4 text-lg border-2 rounded-2xl focus:outline-none transition-all duration-200 ${
                    !isValidUrl && url.trim()
                      ? 'border-red-300 focus:border-red-500 bg-red-50'
                      : 'border-gray-200 focus:border-blue-500 bg-gray-50 focus:bg-white'
                  }`}
                />
                {!isValidUrl && url.trim() && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                )}
              </div>
              {!isValidUrl && url.trim() && (
                <p className="text-red-500 text-sm mt-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Please enter a valid URL
                </p>
              )}
            </div>

            <button
              onClick={generateQRCode}
              disabled={!url.trim() || !isValidUrl || isGenerating}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-4 px-8 rounded-2xl hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Generating...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <QrCode className="w-5 h-5 mr-2" />
                  Generate QR Code
                </div>
              )}
            </button>
          </div>

          {/* QR Code Display */}
          {qrCodeDataUrl && (
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 animate-in fade-in duration-500">
              <div className="text-center">
                <div className="flex items-center justify-center mb-6">
                  <Check className="w-6 h-6 text-green-500 mr-2" />
                  <h3 className="text-xl font-semibold text-gray-800">QR Code Generated!</h3>
                </div>
                
                <div className="bg-gray-50 rounded-2xl p-8 mb-6 inline-block">
                  <img 
                    src={qrCodeDataUrl} 
                    alt="Generated QR Code" 
                    className="mx-auto shadow-lg rounded-lg"
                    style={{ maxWidth: '300px', width: '100%', height: 'auto' }}
                  />
                </div>

                <div className="text-sm text-gray-600 mb-6 break-all bg-gray-50 rounded-xl p-4">
                  <strong>URL:</strong> {getDisplayUrl()}
                </div>

                <button
                  onClick={downloadQRCode}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 px-8 rounded-2xl hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-200 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Download className="w-5 h-5 inline mr-2" />
                  Download PNG
                </button>
              </div>
            </div>
          )}

          {/* Instructions */}
          {!hasGenerated && (
            <div className="text-center mt-12 text-gray-500">
              <p className="text-sm">
                Enter any URL above and click "Generate QR Code" to create your QR code
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-400 text-sm">
          <p>© 2025 s3ody Tools. Free QR code generator for everyone.</p>
        </div>
      </div>
    </div>
  );
}