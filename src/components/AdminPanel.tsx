import React, { useState } from 'react';
import {
  ShieldCheck,
  RotateCcw,
  UserPlus,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Clock,
  Bus as BusIcon,
  Trash2,
  Calendar,
} from 'lucide-react';
import { Student, Bus, BusStop, BoardingRecord, TripSession } from '../types/transit';
import { getBusSeatStats, saveStudents, saveTripSession, saveBoardingLogs } from '../utils/transitStorage';

interface AdminPanelProps {
  students: Student[];
  buses: Bus[];
  stops: BusStop[];
  tripSession: TripSession;
  boardingLogs: BoardingRecord[];
  onUpdateStudents: (updated: Student[]) => void;
  onUpdateSession: (updated: TripSession) => void;
  onClearLogs: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  students,
  buses,
  stops,
  tripSession,
  boardingLogs,
  onUpdateStudents,
  onUpdateSession,
  onClearLogs,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBusFilter, setSelectedBusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'roster' | 'logs' | 'import'>('roster');

  // Form states for adding new student
  const [newName, setNewName] = useState<string>('');
  const [newCardId, setNewCardId] = useState<string>('');
  const [newRoll, setNewRoll] = useState<string>('');
  const [newDept, setNewDept] = useState<string>('Computer Science & Eng');
  const [newYear, setNewYear] = useState<string>('1st Year');
  const [newPin, setNewPin] = useState<string>('1234');
  const [newStopId, setNewStopId] = useState<string>(stops[0]?.id || '');
  const [newPhone, setNewPhone] = useState<string>('+91 98840 00000');

  // CSV Import state
  const [csvText, setCsvText] = useState<string>('');
  const [csvFeedback, setCsvFeedback] = useState<string | null>(null);

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.cardId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBus = selectedBusFilter === 'all' || s.assignedBusId === selectedBusFilter;
    return matchesSearch && matchesBus;
  });

  // Handle Add Student
  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCardId.trim()) return;

    // Pick candidate buses for the chosen stop
    const candidateBuses = buses.filter((b) => b.stops.some((s) => s.id === newStopId));
    if (candidateBuses.length === 0) {
      alert('No bus serves this stop! Please choose another stop.');
      return;
    }

    // Find the bus with the most available seats (least allocated)
    let bestBus = candidateBuses[0];
    let minAllocated = 999;
    for (const b of candidateBuses) {
      const allocated = students.filter((s) => s.assignedBusId === b.id).length;
      if (allocated < b.capacity && allocated < minAllocated) {
        minAllocated = allocated;
        bestBus = b;
      }
    }

    // Calculate next available seat number on that bus
    const occupiedSeats = students
      .filter((s) => s.assignedBusId === bestBus.id)
      .map((s) => s.assignedSeatNumber);
    let nextSeat = 1;
    while (occupiedSeats.includes(nextSeat) && nextSeat <= bestBus.capacity) {
      nextSeat++;
    }

    const newStudentObj: Student = {
      id: 'stu-' + Date.now(),
      cardId: newCardId.trim().toUpperCase(),
      name: newName.trim(),
      rollNumber: newRoll.trim() || `ROLL-${Date.now().toString().slice(-4)}`,
      department: newDept,
      year: newYear,
      phone: newPhone,
      pin: newPin || '1234',
      homeStopId: newStopId,
      assignedBusId: bestBus.id,
      assignedSeatNumber: nextSeat,
    };

    const updated = [...students, newStudentObj];
    onUpdateStudents(updated);
    saveStudents(updated);

    // Reset form
    setNewName('');
    setNewCardId('');
    setNewRoll('');
    setShowAddModal(false);
  };

  // Reset Trip Session (Clear today's scans)
  const handleResetScans = (mode: 'morning' | 'evening' | 'fresh_day') => {
    const confirmMsg =
      mode === 'fresh_day'
        ? "Reset all boarding records for a fresh day? This will clear all today's scans."
        : `Switch active session to ${mode.toUpperCase()} and clear current trip boarding records?`;

    if (window.confirm(confirmMsg)) {
      const updated: TripSession = {
        date: tripSession.date,
        tripType: mode === 'fresh_day' ? 'morning' : mode,
        boardedStudentCardIds: [],
      };
      onUpdateSession(updated);
      saveTripSession(updated);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Card_ID', 'Student_Name', 'Roll_Number', 'Department', 'Assigned_Bus', 'Seat_Number', 'Boarding_Stop', 'Security_PIN'];
    const rows = students.map((s) => {
      const bus = buses.find((b) => b.id === s.assignedBusId);
      const stop = stops.find((st) => st.id === s.homeStopId);
      return [
        `"${s.cardId}"`,
        `"${s.name}"`,
        `"${s.rollNumber}"`,
        `"${s.department}"`,
        `"${bus?.busNumber || 'None'}"`,
        s.assignedSeatNumber,
        `"${stop?.name || 'None'}"`,
        `"${s.pin}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `UniTransit_Students_Roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse and import CSV
  const handleProcessCsvImport = () => {
    if (!csvText.trim()) return;

    try {
      const lines = csvText.trim().split('\n');
      let importCount = 0;
      const newStudentsList = [...students];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || i === 0 && line.toLowerCase().includes('card_id')) continue; // Skip header

        const parts = line.split(',').map((p) => p.replace(/"/g, '').trim());
        if (parts.length >= 3) {
          const [cardId, name, roll, dept] = parts;
          if (!newStudentsList.some((s) => s.cardId.toUpperCase() === cardId.toUpperCase())) {
            // Assign to first bus with space
            const targetBus = buses[importCount % buses.length];
            const allocatedSeats = newStudentsList
              .filter((s) => s.assignedBusId === targetBus.id)
              .map((s) => s.assignedSeatNumber);
            let nextSeat = 1;
            while (allocatedSeats.includes(nextSeat) && nextSeat <= targetBus.capacity) {
              nextSeat++;
            }

            newStudentsList.push({
              id: 'stu-csv-' + Date.now() + '-' + importCount,
              cardId: cardId.toUpperCase(),
              name: name || 'Student ' + (importCount + 1),
              rollNumber: roll || `2026-ROLL-${importCount}`,
              department: dept || 'Engineering',
              year: '1st Year',
              phone: '+91 90000 00000',
              pin: '1234',
              homeStopId: stops[0]?.id || 'stop-01',
              assignedBusId: targetBus.id,
              assignedSeatNumber: nextSeat,
            });
            importCount++;
          }
        }
      }

      onUpdateStudents(newStudentsList);
      saveStudents(newStudentsList);
      setCsvFeedback(`Successfully imported ${importCount} new student records with verified seat allocations.`);
      setCsvText('');
    } catch {
      setCsvFeedback('Error parsing CSV format. Please verify the comma-separated format.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Actions & Session Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Transport Administration & Roster
              </h2>
              <p className="text-xs text-slate-500">
                Manage bus capacities, student assignments, CSV batch imports, and trip resets
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Student</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => handleResetScans('fresh_day')}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Daily Scans</span>
            </button>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'roster'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Registered Students ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'logs'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Live Boarding Audit Log ({boardingLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'import'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Batch CSV Import
          </button>
        </div>
      </div>

      {/* TAB 1: ROSTER TABLE */}
      {activeTab === 'roster' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, roll no, or card ID..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filter by Bus */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedBusFilter}
                onChange={(e) => setSelectedBusFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Buses ({buses.length})</option>
                {buses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.busNumber} ({students.filter((s) => s.assignedBusId === b.id).length}/{b.capacity})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Card / RFID ID</th>
                  <th className="py-2.5 px-3">Roll & Dept</th>
                  <th className="py-2.5 px-3">Designated Bus</th>
                  <th className="py-2.5 px-3">Seat #</th>
                  <th className="py-2.5 px-3">Boarding Stop</th>
                  <th className="py-2.5 px-3">Status Today</th>
                  <th className="py-2.5 px-3">Tomorrow Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((stu) => {
                  const bus = buses.find((b) => b.id === stu.assignedBusId);
                  const stop = stops.find((s) => s.id === stu.homeStopId);
                  const isBoarded = tripSession.boardedStudentCardIds.includes(stu.cardId);

                  return (
                    <tr key={stu.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {stu.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {stu.cardId}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        <div>{stu.rollNumber}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{stu.department}</div>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                        {bus?.busNumber || 'None'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        #{stu.assignedSeatNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {stop?.name || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        {isBoarded ? (
                          <span className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Boarded
                          </span>
                        ) : (
                          <span className="text-slate-400">Awaiting</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {stu.pendingStopChange ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                            Effective Tomorrow
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      No students found matching your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Full Boarding Audit Trail</span>
            </h3>
            <button
              onClick={onClearLogs}
              className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Card / Student</th>
                  <th className="py-2.5 px-3">Bus Scanned</th>
                  <th className="py-2.5 px-3">Assigned Bus</th>
                  <th className="py-2.5 px-3">Result</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {boardingLogs.slice().reverse().map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{log.timestamp}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-200">
                      {log.studentName || log.cardId}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-300">
                      {log.scannedBusNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {log.assignedBusNumber || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      {log.status === 'success' && (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                        </span>
                      )}
                      {log.status === 'wrong_bus' && (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Wrong Bus
                        </span>
                      )}
                      {log.status === 'already_boarded' && (
                        <span className="text-amber-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Duplicate
                        </span>
                      )}
                      {log.status === 'bus_full' && (
                        <span className="text-purple-600 font-bold flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> Full
                        </span>
                      )}
                      {log.status === 'unregistered_card' && (
                        <span className="text-slate-500 font-bold">Unregistered</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-sm truncate">{log.message}</td>
                  </tr>
                ))}
                {boardingLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No boarding logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CSV IMPORT */}
      {activeTab === 'import' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-600" />
              Batch CSV Student Import
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Quickly register hundreds of students with their ID card barcodes or RFID hex UIDs.
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Paste CSV Data (format: Card_ID, Name, Roll_Number, Department):
            </label>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="CARD-9001, John Doe, 2024-CS-101, Computer Science&#10;CARD-9002, Jane Smith, 2024-EC-102, Electronics"
              className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            ></textarea>

            {csvFeedback && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 rounded-lg">
                {csvFeedback}
              </div>
            )}

            <button
              onClick={handleProcessCsvImport}
              disabled={!csvText.trim()}
              className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Students & Assign Seats</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Register New Student
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Student Full Name:
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Ramesh Krishnan"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Card ID / RFID UID:
                  </label>
                  <input
                    type="text"
                    required
                    value={newCardId}
                    onChange={(e) => setNewCardId(e.target.value)}
                    placeholder="e.g. CARD-5005 or E4-A2-9F"
                    className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Roll Number:
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoll}
                    onChange={(e) => setNewRoll(e.target.value)}
                    placeholder="e.g. 2024-CS-099"
                    className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Department:
                  </label>
                  <input
                    type="text"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    4-Digit Security PIN:
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="1234"
                    className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Home Boarding Stop:
                </label>
                <select
                  value={newStopId}
                  onChange={(e) => setNewStopId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  {stops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.landmark})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg text-emerald-900 dark:text-emerald-200 text-[11px]">
                UniTransit automatically assigns the student to the optimal bus serving this stop with open seats and guarantees designated seating for both morning and evening trips.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Save & Allocate Seat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
