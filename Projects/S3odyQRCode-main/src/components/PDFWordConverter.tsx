import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, File, ArrowRightLeft, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react';

interface ConversionFile {
  file: File;
  name: string;
  size: string;
  type: 'pdf' | 'word';
}

export function PDFWordConverter() {
  const [conversionType, setConversionType] = useState<'pdf-to-word' | 'word-to-pdf'>('pdf-to-word');
  const [uploadedFile, setUploadedFile] = useState<ConversionFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [isConverted, setIsConverted] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): boolean => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (file.size > maxSize) {
      setError('File size must be less than 50MB');
      return false;
    }

    if (conversionType === 'pdf-to-word') {
      if (file.type !== 'application/pdf') {
        setError('Please select a PDF file');
        return false;
      }
    } else {
      const wordTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.ms-word'
      ];
      if (!wordTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.docx') && !file.name.toLowerCase().endsWith('.doc')) {
        setError('Please select a Word document (.doc or .docx)');
        return false;
      }
    }

    return true;
  };

  const handleFileSelect = async (file: File) => {
    setError('');
    setIsConverted(false);
    
    if (!validateFile(file)) {
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setUploadProgress(i);
    }

    const fileType = conversionType === 'pdf-to-word' ? 'pdf' : 'word';
    const uploadedFileInfo: ConversionFile = {
      file,
      name: file.name,
      size: formatFileSize(file.size),
      type: fileType
    };

    setUploadedFile(uploadedFileInfo);
    setIsUploading(false);
    setUploadProgress(0);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleConvert = async () => {
    if (!uploadedFile) return;

    setIsConverting(true);
    setConversionProgress(0);
    setError('');

    try {
      // Simulate conversion progress
      for (let i = 0; i <= 100; i += 5) {
        await new Promise(resolve => setTimeout(resolve, 150));
        setConversionProgress(i);
      }

      setIsConverted(true);
    } catch (err) {
      setError('Conversion failed. Please try again.');
    } finally {
      setIsConverting(false);
      setConversionProgress(0);
    }
  };

  const handleDownload = () => {
    if (!uploadedFile) return;

    // In a real implementation, this would download the converted file
    const outputExtension = conversionType === 'pdf-to-word' ? '.docx' : '.pdf';
    const originalName = uploadedFile.name.replace(/\.[^/.]+$/, '');
    const downloadName = `${originalName}_converted${outputExtension}`;
    
    alert(`Download started: ${downloadName}\n(This is a demo - no actual file was downloaded)`);
  };

  const resetConverter = () => {
    setUploadedFile(null);
    setIsConverted(false);
    setError('');
    setUploadProgress(0);
    setConversionProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const switchConversionType = (type: 'pdf-to-word' | 'word-to-pdf') => {
    setConversionType(type);
    resetConverter();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 rounded-2xl shadow-lg">
              <ArrowRightLeft className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
            PDF ↔ Word Converter
          </h1>
          <p className="text-gray-600 text-xl max-w-3xl mx-auto leading-relaxed">
            Convert between PDF and Word formats instantly. Upload your file, choose conversion type, and download the converted document.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Conversion Type Selector */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Choose Conversion Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => switchConversionType('pdf-to-word')}
                className={`p-6 rounded-2xl border-2 transition-all duration-200 ${
                  conversionType === 'pdf-to-word'
                    ? 'border-emerald-500 bg-emerald-50 shadow-lg transform scale-105'
                    : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50'
                }`}
              >
                <div className="flex items-center justify-center mb-4">
                  <div className="flex items-center space-x-3">
                    <File className="w-8 h-8 text-red-500" />
                    <ArrowRightLeft className="w-6 h-6 text-gray-400" />
                    <FileText className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">PDF to Word</h3>
                <p className="text-gray-600 text-sm">Convert PDF documents to editable Word files (.docx)</p>
              </button>

              <button
                onClick={() => switchConversionType('word-to-pdf')}
                className={`p-6 rounded-2xl border-2 transition-all duration-200 ${
                  conversionType === 'word-to-pdf'
                    ? 'border-emerald-500 bg-emerald-50 shadow-lg transform scale-105'
                    : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50'
                }`}
              >
                <div className="flex items-center justify-center mb-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <ArrowRightLeft className="w-6 h-6 text-gray-400" />
                    <File className="w-8 h-8 text-red-500" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Word to PDF</h3>
                <p className="text-gray-600 text-sm">Convert Word documents to PDF format (.pdf)</p>
              </button>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                <Upload className="w-6 h-6 mr-3 text-emerald-600" />
                Upload File
              </h3>
              <div className="flex items-center text-sm text-gray-500">
                <Info className="w-4 h-4 mr-1" />
                Max size: 50MB
              </div>
            </div>

            {!uploadedFile ? (
              <div
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  accept={conversionType === 'pdf-to-word' ? '.pdf' : '.doc,.docx'}
                  className="hidden"
                />
                
                <div className="mb-6">
                  {conversionType === 'pdf-to-word' ? (
                    <File className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  ) : (
                    <FileText className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                  )}
                  <h4 className="text-xl font-semibold text-gray-700 mb-2">
                    Drop your {conversionType === 'pdf-to-word' ? 'PDF' : 'Word'} file here
                  </h4>
                  <p className="text-gray-500 mb-4">
                    or click to browse and select a file
                  </p>
                  <p className="text-sm text-gray-400">
                    Supported formats: {conversionType === 'pdf-to-word' ? 'PDF' : 'DOC, DOCX'}
                  </p>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3 px-8 rounded-xl hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Upload className="w-5 h-5 inline mr-2" />
                  Choose File
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {uploadedFile.type === 'pdf' ? (
                      <File className="w-8 h-8 text-red-500 mr-4" />
                    ) : (
                      <FileText className="w-8 h-8 text-blue-500 mr-4" />
                    )}
                    <div>
                      <h4 className="font-semibold text-gray-800">{uploadedFile.name}</h4>
                      <p className="text-sm text-gray-500">{uploadedFile.size}</p>
                    </div>
                  </div>
                  <button
                    onClick={resetConverter}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <AlertCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="mt-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>

          {/* Conversion Section */}
          {uploadedFile && !error && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20 animate-in fade-in duration-500">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <ArrowRightLeft className="w-6 h-6 mr-3 text-emerald-600" />
                Convert File
              </h3>

              {!isConverted ? (
                <div className="text-center">
                  <div className="mb-6">
                    <div className="flex items-center justify-center space-x-4 mb-4">
                      {conversionType === 'pdf-to-word' ? (
                        <>
                          <File className="w-12 h-12 text-red-500" />
                          <ArrowRightLeft className="w-8 h-8 text-gray-400" />
                          <FileText className="w-12 h-12 text-blue-500" />
                        </>
                      ) : (
                        <>
                          <FileText className="w-12 h-12 text-blue-500" />
                          <ArrowRightLeft className="w-8 h-8 text-gray-400" />
                          <File className="w-12 h-12 text-red-500" />
                        </>
                      )}
                    </div>
                    <p className="text-gray-600 mb-6">
                      Ready to convert your {conversionType === 'pdf-to-word' ? 'PDF to Word' : 'Word to PDF'}
                    </p>
                  </div>

                  <button
                    onClick={handleConvert}
                    disabled={isConverting}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-4 px-8 rounded-2xl hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {isConverting ? (
                      <div className="flex items-center">
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Converting...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <ArrowRightLeft className="w-5 h-5 mr-2" />
                        Convert File
                      </div>
                    )}
                  </button>

                  {/* Conversion Progress */}
                  {isConverting && (
                    <div className="mt-6">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Converting...</span>
                        <span>{conversionProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${conversionProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className="mb-6">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h4 className="text-xl font-semibold text-gray-800 mb-2">Conversion Complete!</h4>
                    <p className="text-gray-600">
                      Your file has been successfully converted to {conversionType === 'pdf-to-word' ? 'Word format' : 'PDF format'}
                    </p>
                  </div>

                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={handleDownload}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 px-8 rounded-2xl hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-200 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <Download className="w-5 h-5 inline mr-2" />
                      Download Converted File
                    </button>

                    <button
                      onClick={resetConverter}
                      className="bg-gray-100 text-gray-700 font-semibold py-3 px-8 rounded-2xl hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-200"
                    >
                      Convert Another File
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Features Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 text-center">
              <div className="bg-emerald-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ArrowRightLeft className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Fast Conversion</h3>
              <p className="text-sm text-gray-600">Convert files quickly with high-quality output</p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Preserve Formatting</h3>
              <p className="text-sm text-gray-600">Maintain original layout and formatting</p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 text-center">
              <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Secure & Private</h3>
              <p className="text-sm text-gray-600">Your files are processed securely</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500">
          <p className="text-lg">© 2025 s3ody Tools. PDF ↔ Word Converter.</p>
          <p className="text-sm mt-2">Convert between PDF and Word formats with ease.</p>
        </div>
      </div>
    </div>
  );
}