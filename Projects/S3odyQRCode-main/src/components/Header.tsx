import React, { useState } from 'react';
import { QrCode, FileText, User, LogOut, Monitor, Youtube, ArrowRightLeft, Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface HeaderProps {
  currentPage: 'qr-generator' | 'script-reader' | 'teleprompter' | 'youtube-downloader' | 'pdf-word-converter';
  onPageChange: (page: 'qr-generator' | 'script-reader' | 'teleprompter' | 'youtube-downloader' | 'pdf-word-converter') => void;
}

export function Header({ currentPage, onPageChange }: HeaderProps) {
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handlePageChange = (page: 'qr-generator' | 'script-reader' | 'teleprompter' | 'youtube-downloader' | 'pdf-word-converter') => {
    onPageChange(page);
    setIsMenuOpen(false);
  };

  const navigationItems = [
    {
      id: 'qr-generator',
      label: 'QR Generator',
      icon: QrCode,
      gradient: 'from-blue-500 to-purple-600',
      hoverColor: 'hover:text-blue-600 hover:bg-blue-50'
    },
    {
      id: 'script-reader',
      label: 'Script Reader',
      icon: FileText,
      gradient: 'from-blue-500 to-purple-600',
      hoverColor: 'hover:text-blue-600 hover:bg-blue-50'
    },
    {
      id: 'teleprompter',
      label: 'Teleprompter',
      icon: Monitor,
      gradient: 'from-purple-500 to-pink-600',
      hoverColor: 'hover:text-purple-600 hover:bg-purple-50'
    },
    {
      id: 'youtube-downloader',
      label: 'YouTube Downloader',
      icon: Youtube,
      gradient: 'from-red-500 to-pink-600',
      hoverColor: 'hover:text-red-600 hover:bg-red-50'
    },
    {
      id: 'pdf-word-converter',
      label: 'PDF ↔ Word',
      icon: ArrowRightLeft,
      gradient: 'from-emerald-500 to-teal-600',
      hoverColor: 'hover:text-emerald-600 hover:bg-emerald-50'
    }
  ];

  return (
    <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-xl shadow-lg mr-3">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              s3ody Tools
            </h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            <nav className="flex space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handlePageChange(item.id as any)}
                    className={`flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                      isActive
                        ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg`
                        : `text-gray-600 ${item.hoverColor}`
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* User Info */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-gray-600">
                <User className="w-4 h-4 mr-2" />
                <span className="text-sm">{user?.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center text-gray-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-1" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center space-x-4">
            <div className="flex items-center text-gray-600">
              <User className="w-4 h-4 mr-2" />
              <span className="text-sm hidden sm:inline">{user?.email}</span>
            </div>
            <button
              onClick={toggleMenu}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-gray-200 pt-4 animate-in fade-in duration-200">
            <nav className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handlePageChange(item.id as any)}
                    className={`w-full flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                      isActive
                        ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg`
                        : `text-gray-600 ${item.hoverColor}`
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            
            {/* Mobile Sign Out */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-4 py-3 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}