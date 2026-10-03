import { Bus, Student, BusStop, BoardingRecord, TripSession } from '../types/transit';
import { INITIAL_BUSES, INITIAL_STOPS, INITIAL_STUDENTS } from '../data/seedData';

const STORAGE_KEYS = {
  BUSES: 'unitransit_buses_sathyabama_v4',
  STOPS: 'unitransit_stops_sathyabama_v4',
  STUDENTS: 'unitransit_students_sathyabama_v4',
  BOARDING_LOGS: 'unitransit_logs_sathyabama_v4',
  TRIP_SESSION: 'unitransit_session_sathyabama_v4',
};

export function getTodayDateString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export function getTomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function formatDateReadable(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

export function loadStops(): BusStop[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.STOPS);
    if (saved) return JSON.parse(saved);
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.STOPS, JSON.stringify(INITIAL_STOPS));
  return INITIAL_STOPS;
}

export function loadBuses(): Bus[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.BUSES);
    if (saved) return JSON.parse(saved);
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.BUSES, JSON.stringify(INITIAL_BUSES));
  return INITIAL_BUSES;
}

export function saveBuses(buses: Bus[]) {
  localStorage.setItem(STORAGE_KEYS.BUSES, JSON.stringify(buses));
}

export function loadStudents(): Student[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (saved) return JSON.parse(saved);
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
  return INITIAL_STUDENTS;
}

export function saveStudents(students: Student[]) {
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
}

export function loadBoardingLogs(): BoardingRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.BOARDING_LOGS);
    if (saved) return JSON.parse(saved);
  } catch {
    // fallback
  }
  return [];
}

export function saveBoardingLogs(logs: BoardingRecord[]) {
  localStorage.setItem(STORAGE_KEYS.BOARDING_LOGS, JSON.stringify(logs.slice(-200)));
}

export function loadTripSession(): TripSession {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.TRIP_SESSION);
    if (saved) {
      const session = JSON.parse(saved);
      if (session.date === getTodayDateString()) {
        return session;
      }
    }
  } catch {
    // fallback
  }

  const defaultSession: TripSession = {
    date: getTodayDateString(),
    tripType: 'morning',
    boardedStudentCardIds: [],
  };
  localStorage.setItem(STORAGE_KEYS.TRIP_SESSION, JSON.stringify(defaultSession));
  return defaultSession;
}

export function saveTripSession(session: TripSession) {
  localStorage.setItem(STORAGE_KEYS.TRIP_SESSION, JSON.stringify(session));
}

/**
 * Calculates current seat availability on a bus.
 */
export function getBusSeatStats(bus: Bus, students: Student[], tripSession: TripSession) {
  const assignedStudents = students.filter((s) => s.assignedBusId === bus.id);

  const boardedCount = assignedStudents.filter((s) =>
    tripSession.boardedStudentCardIds.includes(s.cardId)
  ).length;

  const totalAllocated = assignedStudents.length;
  const availableSeats = Math.max(0, bus.capacity - boardedCount);
  const remainingAssignable = Math.max(0, bus.capacity - totalAllocated);

  return {
    capacity: bus.capacity,
    boardedCount,
    availableSeats,
    totalAllocated,
    remainingAssignable,
    occupancyPercent: Math.round((boardedCount / bus.capacity) * 100),
  };
}

/**
 * Finds alternative buses for a given stop that have open seats
 */
export function findAlternativeBusesForStop(
  stopId: string | undefined,
  excludeBusId: string,
  buses: Bus[],
  students: Student[],
  tripSession: TripSession
): { busNumber: string; availableSeats: number; routeName: string }[] {
  if (!stopId) return [];
  const alternatives: { busNumber: string; availableSeats: number; routeName: string }[] = [];

  for (const b of buses) {
    if (b.id === excludeBusId) continue;
    const servesStop = b.stops.some((s) => s.id === stopId || s.name.toLowerCase() === stopId.toLowerCase());
    if (servesStop) {
      const stats = getBusSeatStats(b, students, tripSession);
      if (stats.availableSeats > 0) {
        alternatives.push({
          busNumber: b.busNumber,
          availableSeats: stats.availableSeats,
          routeName: b.routeName,
        });
      }
    }
  }

  return alternatives.sort((a, b) => b.availableSeats - a.availableSeats);
}

/**
 * Process a card scan at the bus door
 */
export function processScan(
  scannedCardId: string,
  scannedBusId: string,
  tripType: 'morning' | 'evening',
  buses: Bus[],
  students: Student[],
  tripSession: TripSession
): {
  record: BoardingRecord;
  updatedSession: TripSession;
  student?: Student;
} {
  const trimmedCardId = scannedCardId.trim().toUpperCase();
  const currentBus = buses.find((b) => b.id === scannedBusId);
  const scannedBusNumber = currentBus ? currentBus.busNumber : 'Unknown Bus';

  const student = students.find(
    (s) => s.cardId.toUpperCase() === trimmedCardId || s.rollNumber.toUpperCase() === trimmedCardId
  );

  const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // 1. Unregistered student card
  if (!student) {
    const record: BoardingRecord = {
      id: 'log-' + Date.now(),
      timestamp: nowTime,
      cardId: trimmedCardId,
      scannedBusId,
      scannedBusNumber,
      tripType,
      status: 'unregistered_card',
      message: `Card ID / Register Number "${trimmedCardId}" is not registered in College Transit. Please verify with the Transport Desk.`,
    };
    return { record, updatedSession: tripSession };
  }

  // 2. Unassigned bus check (Student hasn't picked their bus yet)
  if (!student.assignedBusId) {
    const record: BoardingRecord = {
      id: 'log-' + Date.now(),
      timestamp: nowTime,
      cardId: student.cardId,
      studentName: student.name,
      rollNumber: student.rollNumber,
      scannedBusId,
      scannedBusNumber,
      tripType,
      status: 'unassigned_bus',
      message: `${student.name} (${student.rollNumber}) has not selected a bus route yet! Please open the Student Portal and choose your Bus Route & Seat.`,
    };
    return { record, updatedSession: tripSession, student };
  }

  const assignedBus = buses.find((b) => b.id === student.assignedBusId);
  const assignedBusNumber = assignedBus ? assignedBus.busNumber : 'Not Assigned';
  const stop = currentBus?.stops.find((s) => s.id === student.homeStopId);
  const stopName = stop ? stop.name : 'Designated Stop';

  // 3. Wrong bus check!
  if (student.assignedBusId !== scannedBusId) {
    const record: BoardingRecord = {
      id: 'log-' + Date.now(),
      timestamp: nowTime,
      cardId: student.cardId,
      studentName: student.name,
      rollNumber: student.rollNumber,
      scannedBusId,
      scannedBusNumber,
      assignedBusId: student.assignedBusId,
      assignedBusNumber,
      tripType,
      status: 'wrong_bus',
      message: `WRONG BUS! ${student.name} is registered for ${assignedBusNumber} (${assignedBus?.routeName}). You cannot board ${scannedBusNumber}.`,
      stopName,
    };
    return { record, updatedSession: tripSession, student };
  }

  // 4. Already boarded check for this trip
  if (tripSession.boardedStudentCardIds.includes(student.cardId)) {
    const record: BoardingRecord = {
      id: 'log-' + Date.now(),
      timestamp: nowTime,
      cardId: student.cardId,
      studentName: student.name,
      rollNumber: student.rollNumber,
      scannedBusId,
      scannedBusNumber,
      assignedBusId: student.assignedBusId,
      assignedBusNumber,
      tripType,
      status: 'already_boarded',
      message: `${student.name} has already boarded ${scannedBusNumber} for this ${tripType} trip! Seat #${student.assignedSeatNumber} is confirmed.`,
      stopName,
    };
    return { record, updatedSession: tripSession, student };
  }

  // 5. Bus Full check
  if (currentBus) {
    const stats = getBusSeatStats(currentBus, students, tripSession);
    if (stats.availableSeats <= 0) {
      const alternatives = findAlternativeBusesForStop(
        student.homeStopId,
        currentBus.id,
        buses,
        students,
        tripSession
      );

      const record: BoardingRecord = {
        id: 'log-' + Date.now(),
        timestamp: nowTime,
        cardId: student.cardId,
        studentName: student.name,
        rollNumber: student.rollNumber,
        scannedBusId,
        scannedBusNumber,
        assignedBusId: student.assignedBusId,
        assignedBusNumber,
        tripType,
        status: 'bus_full',
        message: `${scannedBusNumber} is currently at full capacity (${currentBus.capacity}/${currentBus.capacity}). To prevent standing, please board an alternative bus below.`,
        stopName,
        alternativeBuses: alternatives,
      };
      return { record, updatedSession: tripSession, student };
    }
  }

  // 6. Successful Boarding!
  const updatedBoarded = [...tripSession.boardedStudentCardIds, student.cardId];
  const updatedSession: TripSession = {
    ...tripSession,
    boardedStudentCardIds: updatedBoarded,
  };

  const remainingAfter = currentBus ? Math.max(0, currentBus.capacity - updatedBoarded.filter(
    (cid) => students.find((s) => s.cardId === cid)?.assignedBusId === scannedBusId
  ).length) : 0;

  const record: BoardingRecord = {
    id: 'log-' + Date.now(),
    timestamp: nowTime,
    cardId: student.cardId,
    studentName: student.name,
    rollNumber: student.rollNumber,
    scannedBusId,
    scannedBusNumber,
    assignedBusId: student.assignedBusId,
    assignedBusNumber,
    tripType,
    status: 'success',
    message: `BOARDING VERIFIED! Welcome aboard, ${student.name}. Designated Seat #${student.assignedSeatNumber}. ${remainingAfter} seats remaining on ${scannedBusNumber}.`,
    stopName,
  };

  return { record, updatedSession, student };
}

/**
 * Assign or update a student's chosen bus route and seat
 */
export function assignStudentBusAndSeat(
  studentId: string,
  busId: string,
  stopId: string,
  preferredSeatNumber: number | undefined,
  students: Student[],
  buses: Bus[]
): {
  success: boolean;
  message: string;
  updatedStudents?: Student[];
  assignedSeatNumber?: number;
  assignedBus?: Bus;
} {
  const student = students.find((s) => s.id === studentId);
  const bus = buses.find((b) => b.id === busId);

  if (!student) {
    return { success: false, message: 'Student record not found.' };
  }
  if (!bus) {
    return { success: false, message: 'Selected bus route not found.' };
  }

  // Check currently taken seats on this bus
  const takenSeats = students
    .filter((s) => s.assignedBusId === busId && s.id !== studentId && s.assignedSeatNumber)
    .map((s) => s.assignedSeatNumber as number);

  if (takenSeats.length >= bus.capacity) {
    return {
      success: false,
      message: `${bus.busNumber} has reached its maximum seating limit (${bus.capacity}/${bus.capacity}). Please choose an alternative bus route to ensure zero standing.`,
    };
  }

  let finalSeat: number = 1;
  if (preferredSeatNumber && preferredSeatNumber >= 1 && preferredSeatNumber <= bus.capacity && !takenSeats.includes(preferredSeatNumber)) {
    finalSeat = preferredSeatNumber;
  } else {
    while (takenSeats.includes(finalSeat) && finalSeat <= bus.capacity) {
      finalSeat++;
    }
  }

  const updatedStudents = students.map((s) => {
    if (s.id === studentId) {
      return {
        ...s,
        assignedBusId: busId,
        homeStopId: stopId,
        assignedSeatNumber: finalSeat,
      };
    }
    return s;
  });

  saveStudents(updatedStudents);

  return {
    success: true,
    message: `Bus Route selection confirmed! Assigned ${bus.busNumber} (${bus.routeName}) with guaranteed Seat #${finalSeat} for both morning and evening trips.`,
    updatedStudents,
    assignedSeatNumber: finalSeat,
    assignedBus: bus,
  };
}

/**
 * Request boarding point change - strictly takes effect TOMORROW
 */
export function requestBoardingPointChange(
  studentId: string,
  newStopId: string,
  pin: string,
  students: Student[],
  buses: Bus[]
): {
  success: boolean;
  message: string;
  updatedStudents?: Student[];
  assignedBusNumber?: string;
  effectiveDate?: string;
} {
  const student = students.find((s) => s.id === studentId);
  if (!student) {
    return { success: false, message: 'Student record not found.' };
  }

  if (student.pin !== pin) {
    return { success: false, message: 'Invalid security PIN. Please enter your 4-digit PIN.' };
  }

  if (student.homeStopId === newStopId) {
    return { success: false, message: 'You are already registered at this boarding stop.' };
  }

  const tomorrow = getTomorrowDateString();

  // Check if current bus covers the new stop
  const currentBus = buses.find((b) => b.id === student.assignedBusId);
  let targetBus = currentBus && currentBus.stops.some((s) => s.id === newStopId) ? currentBus : null;

  if (!targetBus) {
    const candidateBuses = buses.filter((b) => b.stops.some((s) => s.id === newStopId));
    if (candidateBuses.length === 0) {
      return { success: false, message: 'No college buses serve the requested stop.' };
    }

    let bestBus: Bus | null = null;
    let minAllocated = 999;

    for (const cb of candidateBuses) {
      const allocated = students.filter((s) => s.assignedBusId === cb.id).length;
      if (allocated < cb.capacity && allocated < minAllocated) {
        minAllocated = allocated;
        bestBus = cb;
      }
    }

    if (!bestBus) {
      return {
        success: false,
        message: 'All buses serving that stop are currently full for tomorrow. Capacity limit reached to prevent standing.',
      };
    }

    targetBus = bestBus;
  }

  const updatedStudents = students.map((s) => {
    if (s.id === student.id) {
      return {
        ...s,
        pendingStopChange: {
          newStopId,
          newBusId: targetBus!.id,
          effectiveDate: tomorrow,
          requestedAt: new Date().toISOString(),
          status: 'scheduled_tomorrow' as const,
        },
      };
    }
    return s;
  });

  return {
    success: true,
    message: `Boarding stop change confirmed! Changes take effect starting TOMORROW (${formatDateReadable(tomorrow)}). Your bus will be ${targetBus.busNumber}.`,
    updatedStudents,
    assignedBusNumber: targetBus.busNumber,
    effectiveDate: tomorrow,
  };
}

/**
 * Apply pending stop changes that are due
 */
export function applyScheduledStopChanges(students: Student[], buses: Bus[]): Student[] {
  const today = getTodayDateString();
  let changed = false;

  const updated = students.map((s) => {
    if (s.pendingStopChange && s.pendingStopChange.effectiveDate <= today) {
      changed = true;
      const newBus = buses.find((b) => b.id === s.pendingStopChange!.newBusId);
      const existingSeats = students
        .filter((other) => other.assignedBusId === s.pendingStopChange!.newBusId && other.id !== s.id && other.assignedSeatNumber)
        .map((other) => other.assignedSeatNumber as number);

      let nextSeat = 1;
      while (existingSeats.includes(nextSeat) && nextSeat <= (newBus?.capacity || 60)) {
        nextSeat++;
      }

      return {
        ...s,
        homeStopId: s.pendingStopChange.newStopId,
        assignedBusId: s.pendingStopChange.newBusId,
        assignedSeatNumber: nextSeat,
        pendingStopChange: undefined,
      };
    }
    return s;
  });

  if (changed) {
    saveStudents(updated);
  }
  return updated;
}
