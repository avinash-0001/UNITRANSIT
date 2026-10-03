import React, { useState } from 'react';
import {
  Bus as BusIcon,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  MapPin,
  Compass,
  Phone,
  Shield,
} from 'lucide-react';
import { Bus, Student, TripSession } from '../types/transit';
import { getBusSeatStats } from '../utils/transitStorage';

interface SeatVisualizerProps {
  buses: Bus[];
  students: Student[];
  tripSession: TripSession;
  onSimulateSeatScan?: (cardId: string) => void;
}

export const SeatVisualizer: React.FC<SeatVisualizerProps> = ({
  buses,
  students,
  tripSession,
  onSimulateSeatScan,
}) => {
  const [selectedBusId, setSelectedBusId] = useState<string>(buses[0]?.id || '');
  const [selectedSeatNumber, setSelectedSeatNumber] = useState<number | null>(null);

  const currentBus = buses.find((b) => b.id === selectedBusId) || buses[0];
  const busStats = currentBus ? getBusSeatStats(currentBus, students, tripSession) : null;

  // Filter students assigned to this bus
  const busStudents = students.filter((s) => s.assignedBusId === currentBus?.id);

  // Seat array from 1 to capacity (54 to 60 seats)
  const capacity = currentBus?.capacity || 54;
  const seats = Array.from({ length: capacity }, (_, i) => i + 1);

  // Group seats into rows of 4 (2 left, aisle, 2 right)
  const rows: { rowNum: number; left: number[]; right: number[] }[] = [];
  let seatIdx = 0;
  let rowCounter = 1;

  while (seatIdx < capacity) {
    const left: number[] = [];
    const right: number[] = [];

    // Left 2 seats
    if (seatIdx < capacity) left.push(seats[seatIdx++]);
    if (seatIdx < capacity) left.push(seats[seatIdx++]);

    // Right 2 seats
    if (seatIdx < capacity) right.push(seats[seatIdx++]);
    if (seatIdx < capacity) right.push(seats[seatIdx++]);

    rows.push({
      rowNum: rowCounter++,
      left,
      right,
    });
  }

  // Find info about currently selected seat
  const seatStudent = busStudents.find((s) => s.assignedSeatNumber === selectedSeatNumber);
  const isSeatBoarded = seatStudent
    ? tripSession.boardedStudentCardIds.includes(seatStudent.cardId)
    : false;

  return (
    <div className="space-y-6">
      {/* Bus Selector & Sathyabama Transport Status */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BusIcon className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                Bus Cabin & Seat Map Visualizer
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                Sathyabama Transport
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live layout of Sathyabama College buses. Campus arrival scheduled for 8:30 AM.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="seatmap-bus-select" className="text-xs font-semibold text-slate-500 shrink-0">
              Select Bus Route:
            </label>
            <select
              id="seatmap-bus-select"
              value={selectedBusId}
              onChange={(e) => {
                setSelectedBusId(e.target.value);
                setSelectedSeatNumber(null);
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none max-w-md truncate"
            >
              {buses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.busNumber} [Veh: {b.vehicleNo}] — {b.routeName.slice(0, 50)}... ({b.capacity} Seats)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bus Info Pill & Live Counters */}
        {currentBus && busStats && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                  {currentBus.busNumber}
                </span>
                <span className="text-slate-400">|</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                  Vehicle No: {currentBus.vehicleNo}
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-600 dark:text-slate-400">
                  Driver: <strong className="text-slate-900 dark:text-white">{currentBus.driverName}</strong> ({currentBus.driverPhone})
                </span>
              </div>
              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                Campus In-Time: 8:30 AM
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Total Seats
                </span>
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  {busStats.capacity}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
                  Empty / Available Seats
                </span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {busStats.availableSeats}
                </div>
              </div>

              <div className="p-3 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-700 dark:text-cyan-400">
                  Boarded Now
                </span>
                <div className="text-xl font-black text-cyan-600 dark:text-cyan-400">
                  {busStats.boardedCount}
                </div>
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 dark:text-indigo-400">
                  Reserved by Students
                </span>
                <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                  {busStats.totalAllocated} / {busStats.capacity}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Bus Cabin */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">Seat Status Legend:</span>
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600"></span>
                <span>Empty / Free</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-3.5 h-3.5 rounded bg-cyan-500 border border-cyan-600"></span>
                <span>Boarded (Scanned)</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-3.5 h-3.5 rounded bg-slate-300 dark:bg-slate-700 border border-slate-400 dark:border-slate-600"></span>
                <span>Reserved by Student</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-3.5 h-3.5 rounded ring-2 ring-indigo-600 bg-amber-400"></span>
                <span>Inspecting</span>
              </span>
            </div>
          </div>

          {/* Bus Physical Cabin Wireframe */}
          <div className="max-w-md mx-auto bg-slate-100 dark:bg-slate-950 border-4 border-slate-300 dark:border-slate-800 rounded-t-[50px] rounded-b-2xl p-5 shadow-inner">
            {/* Front of Bus (Windshield & Driver Cabin) */}
            <div className="border-b-2 border-dashed border-slate-300 dark:border-slate-800 pb-4 mb-5">
              <div className="w-36 h-2 mx-auto bg-slate-400 dark:bg-slate-700 rounded-full mb-3"></div>
              <div className="flex items-center justify-between px-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                {/* Driver */}
                <div className="flex items-center gap-2 p-2 bg-slate-200 dark:bg-slate-800 rounded-lg">
                  <span className="text-base">☸️</span>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase">Driver</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {currentBus?.driverName}
                    </span>
                    <span className="block text-[9px] font-mono text-slate-500">
                      Ph: {currentBus?.driverPhone}
                    </span>
                  </div>
                </div>

                {/* Entry Door & Scanner */}
                <div className="flex items-center gap-1.5 p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg">
                  <span className="text-base">🪪</span>
                  <div>
                    <span className="block text-[10px] uppercase font-bold">Door Scanner</span>
                    <span className="text-[11px] font-mono">Veh: {currentBus?.vehicleNo}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Aisle and Seating Grid */}
            <div className="space-y-2.5">
              {rows.map((row) => (
                <div key={row.rowNum} className="flex items-center justify-between gap-3">
                  {/* Left Side (2 seats) */}
                  <div className="flex items-center gap-1.5">
                    {row.left.map((seatNum) => {
                      const student = busStudents.find((s) => s.assignedSeatNumber === seatNum);
                      const isBoarded = student
                        ? tripSession.boardedStudentCardIds.includes(student.cardId)
                        : false;
                      const isSelected = selectedSeatNumber === seatNum;

                      let seatColor = 'bg-emerald-500 hover:bg-emerald-600 text-white'; // default empty
                      if (student) {
                        seatColor = isBoarded
                          ? 'bg-cyan-500 hover:bg-cyan-600 text-white' // boarded
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-400'; // reserved
                      }
                      if (isSelected) {
                        seatColor = 'bg-amber-400 text-slate-950 ring-2 ring-indigo-600 font-bold';
                      }

                      return (
                        <button
                          key={seatNum}
                          onClick={() => setSelectedSeatNumber(seatNum)}
                          className={`w-9 h-10 rounded-t-lg rounded-b-sm font-mono text-xs font-semibold flex flex-col items-center justify-center transition-all transform active:scale-95 shadow-sm cursor-pointer ${seatColor}`}
                          title={`Seat #${seatNum}: ${
                            student
                              ? `${student.name} (${isBoarded ? 'Boarded' : 'Reserved'})`
                              : 'Empty / Available for student selection'
                          }`}
                        >
                          <span>{seatNum}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Center Aisle */}
                  <div className="w-10 text-center font-mono text-[10px] text-slate-400 tracking-widest select-none">
                    · · ·
                  </div>

                  {/* Right Side (2 seats) */}
                  <div className="flex items-center gap-1.5">
                    {row.right.map((seatNum) => {
                      const student = busStudents.find((s) => s.assignedSeatNumber === seatNum);
                      const isBoarded = student
                        ? tripSession.boardedStudentCardIds.includes(student.cardId)
                        : false;
                      const isSelected = selectedSeatNumber === seatNum;

                      let seatColor = 'bg-emerald-500 hover:bg-emerald-600 text-white';
                      if (student) {
                        seatColor = isBoarded
                          ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-400';
                      }
                      if (isSelected) {
                        seatColor = 'bg-amber-400 text-slate-950 ring-2 ring-indigo-600 font-bold';
                      }

                      return (
                        <button
                          key={seatNum}
                          onClick={() => setSelectedSeatNumber(seatNum)}
                          className={`w-9 h-10 rounded-t-lg rounded-b-sm font-mono text-xs font-semibold flex flex-col items-center justify-center transition-all transform active:scale-95 shadow-sm cursor-pointer ${seatColor}`}
                          title={`Seat #${seatNum}: ${
                            student
                              ? `${student.name} (${isBoarded ? 'Boarded' : 'Reserved'})`
                              : 'Empty / Available for student selection'
                          }`}
                        >
                          <span>{seatNum}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Rear of Bus */}
            <div className="mt-5 pt-3 border-t-2 border-dashed border-slate-300 dark:border-slate-800 text-center text-[10px] text-slate-400 font-mono">
              [ REAR EMERGENCY EXIT ]
            </div>
          </div>
        </div>

        {/* Right Column: Seat Details & Interactive Actions */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Compass className="w-4 h-4 text-indigo-600" />
              Seat Inspector
            </h3>

            {selectedSeatNumber ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                      Inspecting Seat
                    </span>
                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                      #{selectedSeatNumber}
                    </span>
                  </div>

                  {seatStudent ? (
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Student:</span>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {seatStudent.name}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Student ID (Register No):</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                          {seatStudent.rollNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Selected Boarding Stop:</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {currentBus?.stops.find((s) => s.id === seatStudent.homeStopId)?.name || 'Designated Stop'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Boarding Status:</span>
                        {isSeatBoarded ? (
                          <span className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> On Board (Verified)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                            <Clock className="w-3.5 h-3.5" /> Awaiting Pickup at Stop
                          </span>
                        )}
                      </div>

                      {!isSeatBoarded && onSimulateSeatScan && (
                        <button
                          onClick={() => onSimulateSeatScan(seatStudent.cardId)}
                          className="w-full mt-3 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Simulate Boarding Scan for {seatStudent.name}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="py-4 text-center space-y-2">
                      <div className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-bold">
                        Empty Seat Available
                      </div>
                      <p className="text-xs text-slate-500">
                        This seat is free. Students can log into the Student Portal and choose this seat on {currentBus?.busNumber}.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Click any seat in the bus cabin to inspect who reserved it, their boarding stop, and boarding verification status.
              </div>
            )}

            {/* Sathyabama Route Info Box */}
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-lg text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
              <span className="font-bold flex items-center gap-1 text-indigo-700 dark:text-indigo-400">
                <Shield className="w-3.5 h-3.5" />
                Sathyabama Zero Standing Policy
              </span>
              <p className="text-[11px] leading-relaxed">
                Capacity on {currentBus?.busNumber} is capped at {capacity} seats. Students select their bus route and seat once, guaranteeing a seat for both morning pickup and evening return.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
