import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  User,
  Bus,
  Calendar,
  Lock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  QrCode,
  Download,
  ArrowRight,
  Sparkles,
  Info,
  LogIn,
  LogOut,
  IdCard,
  Share2,
  Copy,
  Check,
  Search,
  Phone,
  Navigation,
  CheckSquare,
} from 'lucide-react';
import { Student, Bus as BusType, BusStop, TripSession } from '../types/transit';
import {
  getTomorrowDateString,
  getTodayDateString,
  formatDateReadable,
  requestBoardingPointChange,
  assignStudentBusAndSeat,
  getBusSeatStats,
} from '../utils/transitStorage';
import { generateQrDataUrl } from '../utils/qr';

interface StudentPortalProps {
  students: Student[];
  buses: BusType[];
  stops: BusStop[];
  tripSession: TripSession;
  onUpdateStudents: (updated: Student[]) => void;
}

const AUTH_STORAGE_KEY = 'unitransit_auth_session_v4';

export const StudentPortal: React.FC<StudentPortalProps> = ({
  students,
  buses,
  stops,
  tripSession,
  onUpdateStudents,
}) => {
  // Login form states
  const [nameInput, setNameInput] = useState<string>('');
  const [idInput, setIdInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Authenticated Student State (managed strictly via React hooks)
  const [authenticatedStudent, setAuthenticatedStudent] = useState<Student | null>(null);

  // Bus Route & Bus Number Selection state (for students choosing their bus)
  const [routeSearchTerm, setRouteSearchTerm] = useState<string>('');
  const [selectedRouteBusId, setSelectedRouteBusId] = useState<string>('');
  const [selectedBoardingStopId, setSelectedBoardingStopId] = useState<string>('');
  const [selectedSeatNum, setSelectedSeatNum] = useState<number | null>(null);
  const [selectionMessage, setSelectionMessage] = useState<{ type: 'success' | 'error' | null; text: string }>({
    type: null,
    text: '',
  });

  // Change boarding point states (for existing bus riders)
  const [selectedNewStopId, setSelectedNewStopId] = useState<string>('');
  const [pinInput, setPinInput] = useState<string>('');
  const [changeStatus, setChangeStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // 1. Session Restoration on Mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.studentId) {
          const matched = students.find(
            (s) => s.id === parsed.studentId || s.cardId === parsed.studentId || s.rollNumber === parsed.studentId
          );
          if (matched) {
            setAuthenticatedStudent(matched);
          }
        }
      }
    } catch {}
  }, [students]);

  // Sync authenticated student with updated state
  useEffect(() => {
    if (authenticatedStudent) {
      const updated = students.find((s) => s.id === authenticatedStudent.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(authenticatedStudent)) {
        setAuthenticatedStudent(updated);
      }
    }
  }, [students, authenticatedStudent]);

  // 2. Generate QR code when authenticated student has an assigned bus
  useEffect(() => {
    if (authenticatedStudent && authenticatedStudent.assignedBusId) {
      generateQrDataUrl(authenticatedStudent.cardId).then((url) => {
        setQrDataUrl(url);
      });
    } else {
      setQrDataUrl('');
    }
  }, [authenticatedStudent]);

  const normalizeText = useCallback((text: string): string => {
    return text.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, ' ');
  }, []);

  // 3. Login Verification
  const handleLogin = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError(null);
      setIsAuthenticating(true);

      const trimmedId = idInput.trim().toUpperCase();
      const rawName = nameInput.trim();
      const cleanInputName = normalizeText(rawName);

      if (!rawName) {
        setAuthError('Please enter your full Name as registered on college rolls.');
        setIsAuthenticating(false);
        return;
      }

      if (!trimmedId) {
        setAuthError('Please enter your Student ID (Register Number).');
        setIsAuthenticating(false);
        return;
      }

      const matchedById = students.find(
        (s) => s.rollNumber.toUpperCase() === trimmedId || s.cardId.toUpperCase() === trimmedId
      );

      if (!matchedById) {
        setAuthError(
          `Student ID "${trimmedId}" not found in College Transit Registry. Verify your 9-digit Register Number.`
        );
        setIsAuthenticating(false);
        return;
      }

      const cleanRecordName = normalizeText(matchedById.name);
      const inputTokens = cleanInputName.split(' ');
      const recordTokens = cleanRecordName.split(' ');

      const isExactMatch = cleanInputName === cleanRecordName;
      const isSubstringMatch = cleanRecordName.includes(cleanInputName) || cleanInputName.includes(cleanRecordName);
      const isTokenOverlap = inputTokens.some((tok) => tok.length >= 3 && recordTokens.includes(tok));

      if (!isExactMatch && !isSubstringMatch && !isTokenOverlap) {
        setAuthError(
          `Name does not match records for Student ID "${trimmedId}". Please enter your registered name as printed on college rolls.`
        );
        setIsAuthenticating(false);
        return;
      }

      setAuthenticatedStudent(matchedById);
      setIsAuthenticating(false);
      setAuthError(null);

      try {
        sessionStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({
            studentId: matchedById.id,
            rollNumber: matchedById.rollNumber,
            name: matchedById.name,
            timestamp: Date.now(),
          })
        );
      } catch {}
    },
    [idInput, nameInput, normalizeText, students]
  );

  const handleQuickLogin = useCallback(
    (name: string, studentId: string) => {
      setNameInput(name);
      setIdInput(studentId);
      setAuthError(null);

      const matched = students.find(
        (s) => s.rollNumber === studentId || s.cardId === studentId
      );
      if (matched) {
        setAuthenticatedStudent(matched);
        try {
          sessionStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({
              studentId: matched.id,
              rollNumber: matched.rollNumber,
              name: matched.name,
              timestamp: Date.now(),
            })
          );
        } catch {}
      }
    },
    [students]
  );

  const handleLogout = useCallback(() => {
    setAuthenticatedStudent(null);
    setNameInput('');
    setIdInput('');
    setAuthError(null);
    setSelectedRouteBusId('');
    setSelectedBoardingStopId('');
    setSelectedSeatNum(null);
    setChangeStatus({ type: null, message: '' });
    setSelectionMessage({ type: null, text: '' });
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {}
  }, []);

  const handleCopyPublicUrl = useCallback(() => {
    const publicUrl = `${window.location.origin}${window.location.pathname}#/student`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  }, []);

  // 4. Handle Student Bus Route & Seat Selection
  const handleConfirmBusSelection = useCallback(() => {
    if (!authenticatedStudent) return;
    if (!selectedRouteBusId) {
      setSelectionMessage({ type: 'error', text: 'Please select a Bus Route and Bus Number.' });
      return;
    }
    if (!selectedBoardingStopId) {
      setSelectionMessage({ type: 'error', text: 'Please choose your boarding stop along this route.' });
      return;
    }

    const result = assignStudentBusAndSeat(
      authenticatedStudent.id,
      selectedRouteBusId,
      selectedBoardingStopId,
      selectedSeatNum || undefined,
      students,
      buses
    );

    if (result.success && result.updatedStudents) {
      onUpdateStudents(result.updatedStudents);
      const updated = result.updatedStudents.find((s) => s.id === authenticatedStudent.id);
      if (updated) {
        setAuthenticatedStudent(updated);
      }
      setSelectionMessage({ type: 'success', text: result.message });
    } else {
      setSelectionMessage({ type: 'error', text: result.message });
    }
  }, [authenticatedStudent, selectedRouteBusId, selectedBoardingStopId, selectedSeatNum, students, buses, onUpdateStudents]);

  // 5. Handle Boarding Point Change for Tomorrow
  const handleApplyBoardingChange = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!authenticatedStudent || !selectedNewStopId) return;

      const result = requestBoardingPointChange(
        authenticatedStudent.id,
        selectedNewStopId,
        pinInput,
        students,
        buses
      );

      if (result.success && result.updatedStudents) {
        setChangeStatus({
          type: 'success',
          message: result.message,
        });
        onUpdateStudents(result.updatedStudents);
        const updated = result.updatedStudents.find((s) => s.id === authenticatedStudent.id);
        if (updated) {
          setAuthenticatedStudent(updated);
        }
        setPinInput('');
        setSelectedNewStopId('');
      } else {
        setChangeStatus({
          type: 'error',
          message: result.message,
        });
      }
    },
    [authenticatedStudent, selectedNewStopId, pinInput, students, buses, onUpdateStudents]
  );

  // Filtered Sathyabama Routes for selection
  const filteredBuses = useMemo(() => {
    const q = routeSearchTerm.toLowerCase().trim();
    if (!q) return buses;
    return buses.filter(
      (b) =>
        b.busNumber.toLowerCase().includes(q) ||
        b.routeNo.toLowerCase().includes(q) ||
        b.routeName.toLowerCase().includes(q) ||
        b.vehicleNo.toLowerCase().includes(q) ||
        b.stops.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [buses, routeSearchTerm]);

  // Selected route object
  const chosenBusForSelection = useMemo(
    () => buses.find((b) => b.id === selectedRouteBusId),
    [buses, selectedRouteBusId]
  );

  // Taken seats on chosen route
  const takenSeatsOnChosenBus = useMemo(() => {
    if (!chosenBusForSelection) return [];
    return students
      .filter((s) => s.assignedBusId === chosenBusForSelection.id && s.id !== authenticatedStudent?.id && s.assignedSeatNumber)
      .map((s) => s.assignedSeatNumber as number);
  }, [chosenBusForSelection, students, authenticatedStudent]);

  // Derived properties for authenticated student who already has a bus
  const assignedBus = useMemo(
    () => buses.find((b) => b.id === authenticatedStudent?.assignedBusId),
    [buses, authenticatedStudent]
  );

  const homeStop = useMemo(
    () => (assignedBus ? assignedBus.stops.find((s) => s.id === authenticatedStudent?.homeStopId) : null),
    [assignedBus, authenticatedStudent]
  );

  const busStats = useMemo(
    () => (assignedBus ? getBusSeatStats(assignedBus, students, tripSession) : null),
    [assignedBus, students, tripSession]
  );

  const availableStopsForChange = useMemo(
    () => (assignedBus ? assignedBus.stops.filter((s) => s.id !== authenticatedStudent?.homeStopId) : []),
    [assignedBus, authenticatedStudent]
  );

  const tomorrowStr = getTomorrowDateString();
  const todayStr = getTodayDateString();

  // Transit Route Mesh Background
  const TransitAtmosphere = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(79,70,229,0.22),rgba(15,23,42,0))]"></div>
      <svg
        className="absolute w-full h-full opacity-20 dark:opacity-30"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 800"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="routeG1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <path d="M 0 160 Q 300 280 600 200 T 1200 350" fill="none" stroke="url(#routeG1)" strokeWidth="3" strokeDasharray="6,8" />
        <path d="M 0 550 Q 400 400 800 600 T 1200 480" fill="none" stroke="url(#routeG1)" strokeWidth="2.5" />
        <circle cx="300" cy="240" r="7" fill="#10b981" />
        <circle cx="600" cy="200" r="9" fill="#06b6d4" />
        <circle cx="950" cy="380" r="10" fill="#6366f1" />
      </svg>
    </div>
  );

  // =========================================================================
  // VIEW 1: SECURE LOGIN SCREEN (UNAUTHENTICATED)
  // =========================================================================
  if (!authenticatedStudent) {
    return (
      <div className="relative min-h-[600px] flex items-center justify-center py-6 px-4">
        <TransitAtmosphere />

        <div className="relative z-10 max-w-lg w-full space-y-4">
          {/* Public Portal URL Banner */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 text-white p-3 rounded-2xl flex items-center justify-between text-xs shadow-md">
            <div className="flex items-center gap-2 truncate pr-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span className="text-slate-400 font-medium truncate">Public Student URL:</span>
              <span className="font-mono font-semibold text-emerald-400 truncate">#/student</span>
            </div>
            <button
              onClick={handleCopyPublicUrl}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied Link!' : 'Share Link'}</span>
            </button>
          </div>

          {/* Secure Login Card */}
          <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/90 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-indigo-950/20 space-y-6">
            <div className="text-center space-y-2.5">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mb-1">
                <Bus className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-widest font-bold text-indigo-600 dark:text-indigo-400">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Sathyabama Transport Registry</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Student Bus Portal Login
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Enter your <strong className="text-slate-700 dark:text-slate-200">Name</strong> and <strong className="text-slate-700 dark:text-slate-200">Student ID</strong> to select your bus route, bus number, and reserve your seat.
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="login-student-name"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Student Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    id="login-student-name"
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="e.g. AVINASH D"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-600 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-student-id"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Student ID (Register Number)
                </label>
                <div className="relative">
                  <IdCard className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    id="login-student-id"
                    type="text"
                    required
                    value={idInput}
                    onChange={(e) => setIdInput(e.target.value)}
                    placeholder="e.g. 146611038"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-600 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  9-digit register number printed on your college ID card.
                </span>
              </div>

              {authError && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-start gap-2.5 animate-in fade-in zoom-in-95">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Verify & Open Student Portal</span>
              </button>
            </form>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block text-center">
                One-Click Quick Login (From Class Roster)
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('AVINASH D', '146611038')}
                  className="p-2.5 text-left bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl hover:bg-indigo-100 transition-colors group cursor-pointer"
                >
                  <div className="font-bold text-indigo-950 dark:text-indigo-200 group-hover:text-indigo-600">
                    AVINASH D
                  </div>
                  <div className="text-[10px] font-mono text-indigo-700 dark:text-indigo-400">
                    ID: 146611038
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('AADARSH DP', '146611001')}
                  className="p-2.5 text-left bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl hover:bg-slate-100 transition-colors group cursor-pointer"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">
                    AADARSH DP
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    ID: 146611001
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('AAFIYA SHAMEEL', '146611002')}
                  className="p-2.5 text-left bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl hover:bg-slate-100 transition-colors group cursor-pointer"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">
                    AAFIYA SHAMEEL
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    ID: 146611002
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('BHARATH A', '146611044')}
                  className="p-2.5 text-left bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl hover:bg-slate-100 transition-colors group cursor-pointer"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">
                    BHARATH A
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    ID: 146611044
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                <strong>Sathyabama Transport Mandate:</strong> Morning and evening return trips use the same designated bus and seat.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATED STUDENT
  // Check if student has selected their bus route & bus number yet
  // =========================================================================
  const hasSelectedBus = Boolean(authenticatedStudent.assignedBusId && authenticatedStudent.assignedSeatNumber);

  return (
    <div className="student-portal-container relative space-y-6">
      <TransitAtmosphere />

      {/* Top Banner: Authenticated Student Profile & Actions */}
      <div className="relative z-10 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/30">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {authenticatedStudent.name}
              </h2>
              <span className="text-[11px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                ID: {authenticatedStudent.rollNumber}
              </span>
              {!hasSelectedBus && (
                <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 px-2 py-0.5 rounded font-bold">
                  Bus Route Selection Pending
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Sathyabama Institute of Science and Technology · Campus In-Time: 8:30 AM
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyPublicUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copied Link!' : 'Public URL'}</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* CASE A: STUDENT HAS NOT YET SELECTED A BUS -> SHOW BUS ROUTE SELECTION WIZARD */}
      {!hasSelectedBus ? (
        <div className="relative z-10 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
              Step 1 of 1 · Route Registration
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Select Your Sathyabama Bus Route & Seat Number
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              No default bus was assigned to your profile. Browse the official Sathyabama College transport list below, choose your bus route, select your boarding point, and pick your guaranteed seat.
            </p>
          </div>

          {/* Search Box */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={routeSearchTerm}
                onChange={(e) => setRouteSearchTerm(e.target.value)}
                placeholder="Search by stop area (e.g. Kancheepuram, Chengalpet, Tambaram, Porur, Velachery, Avadi)..."
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
              Showing {filteredBuses.length} Sathyabama routes
            </div>
          </div>

          {/* Route Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredBuses.map((b) => {
              const isSelected = selectedRouteBusId === b.id;
              const stats = getBusSeatStats(b, students, tripSession);
              return (
                <div
                  key={b.id}
                  onClick={() => {
                    setSelectedRouteBusId(b.id);
                    setSelectedBoardingStopId(b.stops[0]?.id || '');
                    setSelectedSeatNum(null);
                    setSelectionMessage({ type: null, text: '' });
                  }}
                  className={`p-4 rounded-2xl border-2 text-xs transition-all cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-black text-slate-900 dark:text-white text-base">
                        {b.busNumber}
                      </span>
                      <span className="ml-2 font-mono text-[10px] text-slate-500 font-semibold">
                        Veh: {b.vehicleNo}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {stats.availableSeats} Seats Free
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {b.routeName}
                  </p>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Driver: <strong className="text-slate-700 dark:text-slate-200">{b.driverName}</strong></span>
                    <span className="font-mono">{b.driverPhone}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Configuration for the Selected Bus */}
          {chosenBusForSelection && (
            <div className="p-5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/60 dark:border-indigo-800/60 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                    Selected Vehicle: {chosenBusForSelection.vehicleNo}
                  </span>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    {chosenBusForSelection.busNumber} — {chosenBusForSelection.driverName} ({chosenBusForSelection.driverPhone})
                  </h4>
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  Arrival: 8:30 AM at Sathyabama Campus
                </div>
              </div>

              {/* Sub-step A: Choose Boarding Stop */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  1. Choose Your Boarding Stop along this route:
                </label>
                <select
                  value={selectedBoardingStopId}
                  onChange={(e) => setSelectedBoardingStopId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                >
                  {chosenBusForSelection.stops.map((stop) => (
                    <option key={stop.id} value={stop.id}>
                      {stop.name} — Pickup: {stop.morningTime} (Evening Drop: {stop.eveningTime})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-step B: Seat Selection Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    2. Pick Your Preferred Seat Number (1 to {chosenBusForSelection.capacity}):
                  </label>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                    {selectedSeatNum ? `Selected: Seat #${selectedSeatNum}` : 'Auto-assign if unselected'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-900">
                  {Array.from({ length: chosenBusForSelection.capacity }, (_, i) => i + 1).map((sNum) => {
                    const isTaken = takenSeatsOnChosenBus.includes(sNum);
                    const isPicked = selectedSeatNum === sNum;
                    return (
                      <button
                        key={sNum}
                        type="button"
                        disabled={isTaken}
                        onClick={() => setSelectedSeatNum(sNum)}
                        className={`w-9 h-8 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                          isTaken
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            : isPicked
                            ? 'bg-amber-400 text-slate-950 ring-2 ring-indigo-600 scale-105'
                            : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        }`}
                        title={isTaken ? `Seat #${sNum} already reserved` : `Select Seat #${sNum}`}
                      >
                        {sNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectionMessage.text && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    selectionMessage.type === 'success'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{selectionMessage.text}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirmBusSelection}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Confirm & Reserve Bus {chosenBusForSelection.busNumber} Seat</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* CASE B: STUDENT ALREADY HAS A RESERVED BUS ROUTE */
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Official Sathyabama Digital Bus Pass */}
          <div className="lg:col-span-6 space-y-6">
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-indigo-900/60">
              <div className="flex items-start justify-between border-b border-indigo-800/60 pb-4 mb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-mono text-indigo-400 font-bold block">
                    Sathyabama Institute of Science & Tech
                  </span>
                  <h3 className="text-xl font-black text-white tracking-tight">
                    {authenticatedStudent.name}
                  </h3>
                  <span className="text-xs text-slate-300 font-mono">
                    Student ID: <strong className="text-amber-300">{authenticatedStudent.rollNumber}</strong>
                  </span>
                </div>
                <div className="bg-indigo-600/40 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Verified Rider</span>
                </div>
              </div>

              {/* Designated Bus & Seat Section */}
              <div className="grid grid-cols-2 gap-3 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 mb-4">
                <div>
                  <div className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold">
                    Designated Bus
                  </div>
                  <div className="text-2xl font-black text-amber-300 mt-0.5">
                    {assignedBus?.busNumber}
                  </div>
                  <div className="text-xs text-slate-300 font-mono mt-0.5">
                    Veh: {assignedBus?.vehicleNo}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold">
                    Designated Seat
                  </div>
                  <div className="text-2xl font-black text-emerald-400 mt-0.5">
                    Seat #{authenticatedStudent.assignedSeatNumber}
                  </div>
                  <div className="text-[10px] text-slate-300">
                    Zero Standing Guaranteed
                  </div>
                </div>
              </div>

              {/* Driver & Route Info */}
              <div className="space-y-2 text-xs bg-slate-950/60 p-3.5 rounded-2xl border border-indigo-900/40 mb-4">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    Boarding Stop:
                  </span>
                  <span className="font-semibold text-white">{homeStop?.name || 'Designated Stop'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Morning Pickup:
                  </span>
                  <span className="font-bold text-amber-300">{homeStop?.morningTime || '07:15 AM'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    Driver:
                  </span>
                  <span className="font-semibold text-cyan-300">
                    {assignedBus?.driverName} ({assignedBus?.driverPhone})
                  </span>
                </div>
              </div>

              {/* Policy Badge */}
              <div className="bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl flex items-center gap-2 text-xs text-emerald-200 mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Fixed Trip Sync:</strong> You board {assignedBus?.busNumber} in the morning, and the exact same {assignedBus?.busNumber} returns you in the evening.
                </span>
              </div>

              {/* QR Code and Barcode Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-indigo-800/40">
                <div className="flex items-center gap-3">
                  {qrDataUrl && (
                    <img
                      src={qrDataUrl}
                      alt="Student QR Pass"
                      className="w-16 h-16 rounded-xl bg-white p-1 shadow-md"
                    />
                  )}
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block">SCANNABLE STUDENT ID:</span>
                    <span className="font-mono font-bold text-white text-base tracking-wider">
                      {authenticatedStudent.rollNumber}
                    </span>
                    <span className="text-[10px] text-indigo-400 block mt-0.5">
                      Scan at bus door reader
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Registration</span>
                  <span className="text-xs font-semibold text-slate-200">{assignedBus?.registrationNumber}</span>
                </div>
              </div>
            </div>

            {/* Live Seat Availability */}
            {busStats && (
              <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Bus className="w-4 h-4 text-indigo-600" />
                    Live Seat Availability on {assignedBus?.busNumber}
                  </h4>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {busStats.availableSeats} of {busStats.capacity} Free
                  </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, 100 - busStats.occupancyPercent)}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <span className="text-slate-500 block text-[10px] uppercase">Capacity</span>
                    <span className="font-bold text-slate-900 dark:text-white">{busStats.capacity}</span>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <span className="text-slate-500 block text-[10px] uppercase">Boarded Now</span>
                    <span className="font-bold text-slate-900 dark:text-white">{busStats.boardedCount}</span>
                  </div>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                    <span className="text-emerald-700 dark:text-emerald-400 block text-[10px] uppercase font-semibold">
                      Open Seats
                    </span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">{busStats.availableSeats}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Change Boarding Point (1-Day Advance Notice Rule) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-base">
                    <MapPin className="w-5 h-5" />
                    <h3>Change Boarding Point</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Modify your pickup stop along Sathyabama routes.
                  </p>
                </div>

                {/* Option to re-select bus */}
                <button
                  type="button"
                  onClick={() => {
                    const confirmReselect = window.confirm(
                      'Do you want to switch to a different Sathyabama bus route? This will allow you to pick a new bus number and seat.'
                    );
                    if (confirmReselect) {
                      const updated = students.map((s) =>
                        s.id === authenticatedStudent.id
                          ? { ...s, assignedBusId: undefined, assignedSeatNumber: undefined, homeStopId: undefined }
                          : s
                      );
                      onUpdateStudents(updated);
                      const updatedAuth = updated.find((s) => s.id === authenticatedStudent.id);
                      if (updatedAuth) setAuthenticatedStudent(updatedAuth);
                    }
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  Change Bus Route
                </button>
              </div>

              {/* Strict College Rule Callout */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs space-y-2 text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                  <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>MANDATORY 1-DAY ADVANCE NOTICE RULE</span>
                </div>
                <p className="leading-relaxed">
                  As per Sathyabama College Transport Regulation, boarding point changes <strong>CANNOT</strong> be made for today&apos;s trip. Any change requested today will take effect <strong>TOMORROW ({formatDateReadable(tomorrowStr)})</strong>.
                </p>
                <div className="text-[11px] font-mono bg-white/60 dark:bg-black/30 p-2 rounded-lg flex items-center justify-between">
                  <span>Today: <strong className="text-slate-900 dark:text-white">{todayStr}</strong> (Locked)</span>
                  <span>Effective Date: <strong className="text-amber-700 dark:text-amber-300">{tomorrowStr}</strong></span>
                </div>
              </div>

              {/* Pending Change Status if already scheduled */}
              {authenticatedStudent.pendingStopChange && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs space-y-2 text-indigo-950 dark:text-indigo-200">
                  <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>CHANGE SCHEDULED FOR TOMORROW</span>
                  </div>
                  <p>
                    Your boarding point is set to change to{' '}
                    <strong>{stops.find((s) => s.id === authenticatedStudent.pendingStopChange?.newStopId)?.name}</strong> on{' '}
                    <strong>{formatDateReadable(authenticatedStudent.pendingStopChange.effectiveDate)}</strong>.
                  </p>
                </div>
              )}

              {/* Form to submit change */}
              <form onSubmit={handleApplyBoardingChange} className="space-y-4">
                <div>
                  <label htmlFor="new-stop-select" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Select New Boarding Stop
                  </label>
                  <select
                    id="new-stop-select"
                    value={selectedNewStopId}
                    onChange={(e) => setSelectedNewStopId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose a stop --</option>
                    {availableStopsForChange.map((stop) => (
                      <option key={stop.id} value={stop.id}>
                        {stop.name} (Pickup: {stop.morningTime})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="student-pin-field" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Enter 4-Digit Security PIN
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      id="student-pin-field"
                      type="password"
                      maxLength={4}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="e.g. 1234 or last 4 digits"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Default PIN for {authenticatedStudent.name}: <strong className="font-mono text-indigo-600">{authenticatedStudent.pin}</strong>
                  </p>
                </div>

                {changeStatus.type && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                      changeStatus.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    {changeStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span>{changeStatus.message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <span>Request Boarding Change (Effective Tomorrow)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
