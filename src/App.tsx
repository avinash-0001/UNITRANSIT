/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DoorScanner } from './components/DoorScanner';
import { StudentPortal } from './components/StudentPortal';
import { SeatVisualizer } from './components/SeatVisualizer';
import { RouteExplorer } from './components/RouteExplorer';
import { HardwareGuide } from './components/HardwareGuide';
import { AdminPanel } from './components/AdminPanel';
import {
  loadBuses,
  loadStops,
  loadStudents,
  loadTripSession,
  loadBoardingLogs,
  saveStudents,
  saveTripSession,
  saveBoardingLogs,
  applyScheduledStopChanges,
  getBusSeatStats,
} from './utils/transitStorage';
import { Bus, Student, BusStop, BoardingRecord, TripSession } from './types/transit';

type TabType = 'scanner' | 'student' | 'fleet' | 'routes' | 'hardware' | 'admin';

const parseTabFromUrl = (): TabType => {
  if (typeof window === 'undefined') return 'student';
  const hash = window.location.hash.toLowerCase().replace('#/', '').replace('#', '');
  if (hash === 'scanner' || hash === 'scan') return 'scanner';
  if (hash === 'fleet' || hash === 'seats') return 'fleet';
  if (hash === 'routes' || hash === 'route') return 'routes';
  if (hash === 'hardware' || hash === 'esp32') return 'hardware';
  if (hash === 'admin' || hash === 'roster') return 'admin';
  if (hash === 'student' || hash === 'login' || hash === 'bus-pass') return 'student';

  const params = new URLSearchParams(window.location.search);
  const qTab = params.get('tab') as TabType;
  if (qTab && ['scanner', 'student', 'fleet', 'routes', 'hardware', 'admin'].includes(qTab)) {
    return qTab;
  }

  // Default to student portal for public access
  return 'student';
};

export default function App() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [stops, setStops] = useState<BusStop[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [tripSession, setTripSession] = useState<TripSession>({
    date: new Date().toISOString().split('T')[0],
    tripType: 'morning',
    boardedStudentCardIds: [],
  });
  const [boardingLogs, setBoardingLogs] = useState<BoardingRecord[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>(parseTabFromUrl);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Initialize data on mount
  useEffect(() => {
    const loadedBuses = loadBuses();
    const loadedStops = loadStops();
    const loadedStudents = loadStudents();
    const loadedSession = loadTripSession();
    const loadedLogs = loadBoardingLogs();

    // Check if any scheduled boarding changes are due today
    const processedStudents = applyScheduledStopChanges(loadedStudents, loadedBuses);

    setBuses(loadedBuses);
    setStops(loadedStops);
    setStudents(processedStudents);
    setTripSession(loadedSession);
    setBoardingLogs(loadedLogs);
    setIsLoaded(true);
  }, []);

  // Sync hash routing so simple public URLs (e.g. #/student) work directly
  useEffect(() => {
    const handleHashChange = () => {
      const tab = parseTabFromUrl();
      setActiveTab(tab);
    };

    window.addEventListener('hashchange', handleHashChange);
    // If no hash was initially present, set the simple public hash to #/student
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#/student');
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = useCallback((newTab: TabType) => {
    setActiveTab(newTab);
    if (typeof window !== 'undefined') {
      window.location.hash = `#/${newTab}`;
    }
  }, []);

  const handleScanResult = (record: BoardingRecord, updatedSession: TripSession) => {
    setTripSession(updatedSession);
    saveTripSession(updatedSession);

    const updatedLogs = [record, ...boardingLogs].slice(0, 200);
    setBoardingLogs(updatedLogs);
    saveBoardingLogs(updatedLogs);
  };

  const handleUpdateStudents = (updated: Student[]) => {
    setStudents(updated);
    saveStudents(updated);
  };

  const handleUpdateSession = (updated: TripSession) => {
    setTripSession(updated);
    saveTripSession(updated);
  };

  const handleClearLogs = () => {
    setBoardingLogs([]);
    saveBoardingLogs([]);
  };

  const handleToggleTrip = () => {
    const nextType: 'morning' | 'evening' = tripSession.tripType === 'morning' ? 'evening' : 'morning';
    const updated: TripSession = {
      ...tripSession,
      tripType: nextType,
      boardedStudentCardIds: [], // New trip starts fresh with full seat capacity
    };
    setTripSession(updated);
    saveTripSession(updated);
  };

  const handleSimulateSeatScan = (cardId: string) => {
    handleTabChange('scanner');
    setTimeout(() => {
      const inputEl = document.getElementById('card-id-input') as HTMLInputElement | null;
      if (inputEl) {
        inputEl.value = cardId;
        inputEl.focus();
      }
    }, 100);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-400">Loading College Transit System...</p>
        </div>
      </div>
    );
  }

  // Calculate fleet statistics
  let totalFleetCapacity = 0;
  let totalBoarded = tripSession.boardedStudentCardIds.length;
  let totalAvailableSeats = 0;

  for (const b of buses) {
    totalFleetCapacity += b.capacity;
    const stats = getBusSeatStats(b, students, tripSession);
    totalAvailableSeats += stats.availableSeats;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header & Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        tripSession={tripSession}
        onToggleTrip={handleToggleTrip}
        totalBoarded={totalBoarded}
        totalAvailableSeats={totalAvailableSeats}
        totalFleetCapacity={totalFleetCapacity}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'student' && (
          <StudentPortal
            students={students}
            buses={buses}
            stops={stops}
            tripSession={tripSession}
            onUpdateStudents={handleUpdateStudents}
          />
        )}

        {activeTab === 'scanner' && (
          <DoorScanner
            buses={buses}
            students={students}
            tripSession={tripSession}
            onScanResult={handleScanResult}
            logs={boardingLogs}
          />
        )}

        {activeTab === 'fleet' && (
          <SeatVisualizer
            buses={buses}
            students={students}
            tripSession={tripSession}
            onSimulateSeatScan={handleSimulateSeatScan}
          />
        )}

        {activeTab === 'routes' && (
          <RouteExplorer
            buses={buses}
            stops={stops}
            students={students}
            tripSession={tripSession}
            onSelectBus={() => {
              handleTabChange('fleet');
            }}
          />
        )}

        {activeTab === 'hardware' && <HardwareGuide />}

        {activeTab === 'admin' && (
          <AdminPanel
            students={students}
            buses={buses}
            stops={stops}
            tripSession={tripSession}
            boardingLogs={boardingLogs}
            onUpdateStudents={handleUpdateStudents}
            onUpdateSession={handleUpdateSession}
            onClearLogs={handleClearLogs}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">UniTransit Fleet Control</span>
            <span>·</span>
            <span>Public Student Portal Link: <strong className="font-mono text-indigo-600 dark:text-indigo-400">#/student</strong></span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Transport Helpline: <strong>+91 (044) 2741-7000</strong></span>
            <span>·</span>
            <span>Policy: 1-Day Advance Notice for Boarding Point Changes</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
