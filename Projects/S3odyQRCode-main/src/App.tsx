import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthForm } from './components/AuthForm';
import { QRGenerator } from './components/QRGenerator';
import { ScriptReader } from './components/ScriptReader';
import { Teleprompter } from './components/Teleprompter';
import { YouTubeDownloader } from './components/YouTubeDownloader';
import { PDFWordConverter } from './components/PDFWordConverter';
import { Header } from './components/Header';

function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<'qr-generator' | 'script-reader' | 'teleprompter' | 'youtube-downloader' | 'pdf-word-converter'>('qr-generator');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="pt-0">
        {currentPage === 'qr-generator' && <QRGenerator />}
        {currentPage === 'script-reader' && <ScriptReader />}
        {currentPage === 'teleprompter' && <Teleprompter />}
        {currentPage === 'youtube-downloader' && <YouTubeDownloader />}
        {currentPage === 'pdf-word-converter' && <PDFWordConverter />}
      </div>
    </div>
  );
}

export default App;