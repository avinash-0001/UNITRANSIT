import React, { useState, useEffect } from 'react';
import { Bus, Scan, User, LayoutGrid, MapPin, Cpu, ShieldCheck, Sun, Moon } from 'lucide-react';
import { TripSession } from '../types/transit';

interface NavbarProps {
  activeTab: 'scanner' | 'student' | 'fleet' | 'routes' | 'hardware' | 'admin';
  setActiveTab: (tab: 'scanner' | 'student' | 'fleet' | 'routes' | 'hardware' | 'admin') => void;
  tripSession: TripSession;
  onToggleTrip: () => void;
  totalBoarded: number;
  totalAvailableSeats: number;
  totalFleetCapacity: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  tripSession,
  onToggleTrip,
  totalBoarded,
  totalAvailableSeats,
  totalFleetCapacity,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
      {/* Top Banner with Fleet Stats & Trip Switch */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 text-xs">
        <div className="flex items-center gap-4 text-slate-300">
          <span className="flex items-center gap-1.5 font-medium text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE TRANSIT SYSTEM
          </span>
          <span className="text-slate-600">|</span>
          <span>{currentTime || '08:00:00 AM'}</span>
          <span className="text-slate-600">|</span>
          <span>Fleet Capacity: <strong className="text-white">{totalFleetCapacity}</strong></span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="hidden sm:inline">Available Seats: <strong className="text-emerald-400">{totalAvailableSeats}</strong></span>
          <span className="text-slate-600 hidden md:inline">|</span>
          <span className="hidden md:inline">Boarded Today: <strong className="text-cyan-400">{totalBoarded}</strong></span>
        </div>

        {/* Trip Session Switch (Morning vs Evening) */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Session:</span>
          <button
            onClick={onToggleTrip}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold tracking-wide transition-all ${
              tripSession.tripType === 'morning'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30'
            }`}
            title="Click to toggle between morning pickup & evening return"
          >
            {tripSession.tripType === 'morning' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>MORNING PICKUP</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>EVENING RETURN</span>
              </>
            )}
            <span className="text-[10px] bg-slate-800 text-slate-300 px-1 py-0.5 rounded ml-1">Switch</span>
          </button>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <Bus className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">UniTransit</h1>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">
                College Fleet
              </span>
            </div>
            <p className="text-xs text-slate-400">Zero Standing Guarantee · Fixed Morning & Evening Bus Allocation</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <nav className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs sm:text-sm font-medium">
          <button
            onClick={() => setActiveTab('student')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors cursor-pointer ${
              activeTab === 'student'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Student Portal</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 py-0.2 rounded font-semibold ml-0.5">
              Public
            </span>
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors cursor-pointer ${
              activeTab === 'scanner'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Scan className="w-4 h-4" />
            <span>Door Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors ${
              activeTab === 'fleet'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Seats & Fleet</span>
          </button>

          <button
            onClick={() => setActiveTab('routes')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors ${
              activeTab === 'routes'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Routes & Alternatives</span>
          </button>

          <button
            onClick={() => setActiveTab('hardware')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors ${
              activeTab === 'hardware'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>ESP32 Hardware</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors ${
              activeTab === 'admin'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Roster & Admin</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
