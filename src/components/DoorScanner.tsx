import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Scan,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Camera,
  Radio,
  Keyboard,
  ArrowRight,
  RefreshCw,
  Sparkles,
  MapPin,
  Clock,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Bus, Student, BoardingRecord, TripSession } from '../types/transit';
import { processScan, getBusSeatStats } from '../utils/transitStorage';
import { sound } from '../utils/audio';

interface DoorScannerProps {
  buses: Bus[];
  students: Student[];
  tripSession: TripSession;
  onScanResult: (record: BoardingRecord, updatedSession: TripSession) => void;
  logs: BoardingRecord[];
}

export const DoorScanner: React.FC<DoorScannerProps> = ({
  buses,
  students,
  tripSession,
  onScanResult,
  logs,
}) => {
  const [selectedBusId, setSelectedBusId] = useState<string>(buses[0]?.id || '');
  const [inputCardId, setInputCardId] = useState<string>('');
  const [lastScanResult, setLastScanResult] = useState<{
    record: BoardingRecord;
    student?: Student;
  } | null>(null);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const currentBus = buses.find((b) => b.id === selectedBusId) || buses[0];
  const busStats = currentBus ? getBusSeatStats(currentBus, students, tripSession) : null;

  // Auto-focus input on load and when bus changes so USB/RFID readers can type directly
  useEffect(() => {
    inputRef.current?.focus();
  }, [selectedBusId]);

  // Clean up camera stream when component unmounts or camera is toggled off
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleStartCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to access camera';
      setCameraError(`Camera permission denied or camera unavailable (${msg}). You can use USB reader, typing, or simulated tap.`);
      setIsCameraActive(false);
    }
  };

  const handleStopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleExecuteScan = (cardIdToScan: string) => {
    if (!cardIdToScan.trim() || !currentBus) return;

    if (soundEnabled) {
      sound.playClick();
    }

    const { record, updatedSession, student } = processScan(
      cardIdToScan,
      currentBus.id,
      tripSession.tripType,
      buses,
      students,
      tripSession
    );

    // Audio & Visual cues
    if (soundEnabled) {
      if (record.status === 'success') {
        sound.playSuccess();
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.7 },
        });
      } else if (record.status === 'wrong_bus') {
        sound.playError();
      } else if (record.status === 'already_boarded' || record.status === 'bus_full') {
        sound.playWarning();
      } else {
        sound.playError();
      }
    }

    setLastScanResult({ record, student });
    onScanResult(record, updatedSession);
    setInputCardId('');

    // Re-focus input for next physical scan
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExecuteScan(inputCardId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Select Operating Bus & Live Seat Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
                Bus Door Scanner Station
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400">
                Trip: <strong className="text-white capitalize">{tripSession.tripType}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="bus-select" className="text-sm text-slate-300 font-medium">
                Active Bus:
              </label>
              <select
                id="bus-select"
                value={selectedBusId}
                onChange={(e) => {
                  setSelectedBusId(e.target.value);
                  setLastScanResult(null);
                }}
                className="bg-slate-800 border border-slate-700 text-white font-bold text-base rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {buses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.busNumber} — {b.routeName} ({b.capacity} Seats)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Live Seat Availability Banner */}
          {busStats && (
            <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
              <div className="text-center px-3 border-r border-slate-800">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Total Seats</div>
                <div className="text-xl font-bold text-white">{busStats.capacity}</div>
              </div>

              <div className="text-center px-3 border-r border-slate-800">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">On Board Now</div>
                <div className="text-xl font-bold text-cyan-400">{busStats.boardedCount}</div>
              </div>

              <div className="text-center px-3">
                <div className="text-[11px] uppercase tracking-wider text-emerald-400 font-medium">Available Seats</div>
                <div className="text-2xl font-black text-emerald-400">{busStats.availableSeats}</div>
              </div>

              <div className="w-full sm:w-36 mt-1 sm:mt-0">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Occupancy</span>
                  <span className="font-semibold text-white">{busStats.occupancyPercent}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      busStats.occupancyPercent >= 100
                        ? 'bg-rose-500'
                        : busStats.occupancyPercent > 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, busStats.occupancyPercent)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scanner Terminal / Input */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scan className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-slate-900 dark:text-white text-base">
                  ID Card & Barcode Reader
                </h2>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-xs flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                title="Toggle audio buzzer & confirmation sound"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-500" />
                    <span>Sound On</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4 text-slate-400" />
                    <span>Sound Muted</span>
                  </>
                )}
              </button>
            </div>

            {/* Hardware / USB Reader input box */}
            <div className="space-y-2">
              <label htmlFor="card-id-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Scan ID Card / Barcode / Tap RFID
              </label>
              <div className="relative flex items-center">
                <Keyboard className="absolute left-3.5 w-5 h-5 text-slate-400" />
                <input
                  id="card-id-input"
                  ref={inputRef}
                  type="text"
                  value={inputCardId}
                  onChange={(e) => setInputCardId(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tap RFID card, scan barcode, or type ID..."
                  className="w-full pl-11 pr-24 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-indigo-600 rounded-xl text-slate-900 dark:text-white font-mono text-base focus:outline-none transition-colors"
                />
                <button
                  onClick={() => handleExecuteScan(inputCardId)}
                  disabled={!inputCardId.trim()}
                  className="absolute right-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Verify
                </button>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <span>Tip:</span>
                <span>USB & Bluetooth barcode scanners automatically send &apos;Enter&apos; on scan.</span>
              </p>
            </div>

            {/* Camera Scanner Toggle */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-indigo-500" />
                  Phone / Laptop Camera Scanner
                </span>
                {!isCameraActive ? (
                  <button
                    onClick={handleStartCamera}
                    className="text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Enable Camera
                  </button>
                ) : (
                  <button
                    onClick={handleStopCamera}
                    className="text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Turn Camera Off
                  </button>
                )}
              </div>

              {cameraError && (
                <div className="text-xs p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 rounded-lg">
                  {cameraError}
                </div>
              )}

              {isCameraActive && (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border-2 border-indigo-500/50 shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay scanning viewfinder */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    <div className="w-56 h-36 border-2 border-indigo-400 rounded-lg relative">
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white"></div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white"></div>
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white"></div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white"></div>
                      <div className="w-full h-0.5 bg-emerald-400/80 animate-pulse absolute top-1/2"></div>
                    </div>
                    <span className="mt-3 text-xs bg-black/70 text-white px-2.5 py-1 rounded backdrop-blur-sm">
                      Align Student ID Barcode or QR in box
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Demo Simulator Buttons */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Quick Test Taps (Official Student Register Numbers)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <button
                  onClick={() => handleExecuteScan('146611001')}
                  className="p-2 text-left bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <div className="font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Right Bus
                  </div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300">146611001 (Bus 1A)</div>
                </button>

                <button
                  onClick={() => handleExecuteScan('146611038')}
                  className="p-2 text-left bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <div className="font-bold flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5 text-indigo-600" />
                    AVINASH D
                  </div>
                  <div className="text-[10px] text-indigo-700 dark:text-indigo-300">146611038 (Bus 25)</div>
                </button>

                <button
                  onClick={() => handleExecuteScan('146611025')}
                  className="p-2 text-left bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                >
                  <div className="font-bold flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    ARAVIND V I
                  </div>
                  <div className="text-[10px] text-rose-700 dark:text-rose-300">146611025 (Bus 12)</div>
                </button>

                <button
                  onClick={() => handleExecuteScan('999999999')}
                  className="p-2 text-left bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                    Unregistered
                  </div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-400">999999999</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: High-Visibility Instant Feedback Display */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm min-h-[380px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Verification Display
                </span>
                <span className="text-xs text-slate-400">Stationed on: <strong className="text-slate-900 dark:text-white">{currentBus?.busNumber}</strong></span>
              </div>

              {lastScanResult ? (
                <div className="space-y-4">
                  {/* 1. SUCCESS: GREEN */}
                  {lastScanResult.record.status === 'success' && (
                    <div className="p-5 rounded-xl bg-emerald-600 text-white shadow-lg space-y-3 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold tracking-wider uppercase text-emerald-100">
                            Valid Boarding Approved
                          </div>
                          <div className="text-xl font-black">
                            WELCOME ABOARD
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/10 p-3 rounded-lg space-y-1.5 text-sm backdrop-blur-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-emerald-100 text-xs">Student Name:</span>
                          <span className="font-bold text-white text-base">{lastScanResult.student?.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-emerald-100 text-xs">Roll Number:</span>
                          <span className="font-mono text-white text-xs">{lastScanResult.student?.rollNumber}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-emerald-100 text-xs">Designated Seat:</span>
                          <span className="font-black text-amber-300 text-lg">
                            Seat #{lastScanResult.student?.assignedSeatNumber}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-emerald-100 text-xs">Boarding Stop:</span>
                          <span className="text-white text-xs font-medium">{lastScanResult.record.stopName}</span>
                        </div>
                      </div>

                      <div className="text-xs text-emerald-100 text-center font-medium">
                        ✓ Seat counted. Same bus assigned for morning & evening return trip.
                      </div>
                    </div>
                  )}

                  {/* 2. WRONG BUS: RED */}
                  {lastScanResult.record.status === 'wrong_bus' && (
                    <div className="p-5 rounded-xl bg-rose-600 text-white shadow-lg space-y-3 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                          <XCircle className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold tracking-wider uppercase text-rose-100">
                            Access Denied
                          </div>
                          <div className="text-xl font-black">
                            WRONG BUS! ⛔
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/10 p-3 rounded-lg space-y-2 text-sm backdrop-blur-sm">
                        <p className="text-xs text-rose-100 font-medium">
                          {lastScanResult.student?.name} ({lastScanResult.student?.rollNumber}) is NOT registered on {currentBus?.busNumber}.
                        </p>
                        <div className="p-3 bg-white text-rose-900 rounded-lg font-bold text-sm shadow-sm text-center">
                          👉 MUST BOARD: <span className="text-base text-rose-600 underline underline-offset-2">{lastScanResult.record.assignedBusNumber}</span>
                        </div>
                      </div>

                      <div className="text-xs text-rose-100 text-center font-medium">
                        Students must board their designated bus to ensure seat availability.
                      </div>
                    </div>
                  )}

                  {/* 3. ALREADY BOARDED: AMBER */}
                  {lastScanResult.record.status === 'already_boarded' && (
                    <div className="p-5 rounded-xl bg-amber-500 text-slate-950 shadow-lg space-y-3 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-black/15 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-8 h-8 text-slate-950" />
                        </div>
                        <div>
                          <div className="text-xs font-bold tracking-wider uppercase text-amber-900">
                            Duplicate Scan
                          </div>
                          <div className="text-xl font-black text-slate-950">
                            ALREADY BOARDED
                          </div>
                        </div>
                      </div>

                      <div className="bg-black/10 p-3 rounded-lg space-y-1.5 text-xs text-slate-900 font-medium">
                        <p>
                          Student <strong>{lastScanResult.student?.name}</strong> has already verified their card for this {tripSession.tripType} trip.
                        </p>
                        <p>Designated Seat: <strong>#{lastScanResult.student?.assignedSeatNumber}</strong></p>
                        <p className="text-slate-800">Seat count is preserved and not subtracted twice.</p>
                      </div>
                    </div>
                  )}

                  {/* 4. BUS FULL: PURPLE / ORANGE WITH ALTERNATIVES */}
                  {lastScanResult.record.status === 'bus_full' && (
                    <div className="p-5 rounded-xl bg-purple-700 text-white shadow-lg space-y-3 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                          <Users className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold tracking-wider uppercase text-purple-200">
                            Capacity Reached
                          </div>
                          <div className="text-xl font-black">
                            BUS IS FULL! 🛑
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/10 p-3 rounded-lg space-y-2 text-xs backdrop-blur-sm">
                        <p>
                          {currentBus?.busNumber} has reached its {currentBus?.capacity} seat capacity. To ensure no student stands, please board an alternative bus:
                        </p>

                        {lastScanResult.record.alternativeBuses && lastScanResult.record.alternativeBuses.length > 0 ? (
                          <div className="space-y-1.5 mt-2">
                            <span className="font-bold text-amber-300 block">Available Alternative Buses for this stop:</span>
                            {lastScanResult.record.alternativeBuses.map((alt, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 bg-white text-slate-900 rounded font-semibold text-xs"
                              >
                                <span>{alt.busNumber} ({alt.routeName})</span>
                                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[11px]">
                                  {alt.availableSeats} free seats
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-amber-200">
                            No other scheduled bus for this stop right now. Please notify the college transport coordinator.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 5. UNREGISTERED CARD */}
                  {lastScanResult.record.status === 'unregistered_card' && (
                    <div className="p-5 rounded-xl bg-slate-800 text-white shadow-lg space-y-3 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-8 h-8 text-amber-400" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                            Card Not Found
                          </div>
                          <div className="text-xl font-bold">
                            UNREGISTERED CARD
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-900/80 rounded-lg text-xs text-slate-300">
                        {lastScanResult.record.message}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Idle State */
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <Scan className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
                      Ready for Student ID Scan
                    </h3>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                      Hold RFID card near reader, scan barcode with camera, or type card ID above.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Status Indicator */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Scanner Terminal Online
              </span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Scans On This Bus */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Recent Door Scans on {currentBus?.busNumber}
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Total Scans Logged: {logs.filter((l) => l.scannedBusId === currentBus?.id).length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Card / Student</th>
                <th className="py-2.5 px-3">Stop</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs
                .filter((l) => l.scannedBusId === currentBus?.id)
                .slice(-6)
                .reverse()
                .map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{log.timestamp}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-200">
                      {log.studentName || log.cardId}
                      {log.rollNumber && <span className="block text-[10px] text-slate-400 font-mono">{log.rollNumber}</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{log.stopName || '—'}</td>
                    <td className="py-2.5 px-3">
                      {log.status === 'success' && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                        </span>
                      )}
                      {log.status === 'wrong_bus' && (
                        <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Wrong Bus
                        </span>
                      )}
                      {log.status === 'already_boarded' && (
                        <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Duplicate
                        </span>
                      )}
                      {log.status === 'bus_full' && (
                        <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> Full
                        </span>
                      )}
                      {log.status === 'unregistered_card' && (
                        <span className="text-slate-500 font-bold">Unregistered</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{log.message}</td>
                  </tr>
                ))}
              {logs.filter((l) => l.scannedBusId === currentBus?.id).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No scans recorded on {currentBus?.busNumber} yet today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
