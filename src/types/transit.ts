export interface BusStop {
  id: string;
  name: string;
  landmark: string;
  morningTime: string;
  eveningTime: string;
  order: number;
}

export interface Bus {
  id: string;
  busNumber: string; // e.g. "Route 1", "Route 1A", "Route 2F"
  routeNo: string; // e.g. "1", "1A", "2F", "18", "25"
  routeName: string; // Full official route path from Sathyabama PDF
  vehicleNo: string; // e.g. "AU2877", "AU2787"
  registrationNumber: string; // e.g. "TN-21-AU-2877"
  capacity: number; // 50 to 60 seats
  driverName: string;
  driverPhone: string;
  attendantName: string;
  status: 'scheduled' | 'boarding' | 'in-transit' | 'arrived';
  currentStopId: string;
  stops: BusStop[];
}

export interface Student {
  id: string;
  cardId: string; // Barcode or RFID UID / Register Number
  name: string;
  rollNumber: string; // 9-digit Register Number
  department: string;
  year: string;
  phone: string;
  pin: string; // 4-digit security PIN for boarding point changes
  homeStopId?: string; // Optional until selected by student
  assignedBusId?: string; // Optional until selected by student (synced for morning and evening)
  assignedSeatNumber?: number; // Optional until selected (1 to capacity)
  pendingStopChange?: {
    newStopId: string;
    newBusId: string;
    effectiveDate: string; // Format: YYYY-MM-DD (always tomorrow)
    requestedAt: string;
    status: 'scheduled_tomorrow' | 'applied';
  };
}

export interface BoardingRecord {
  id: string;
  timestamp: string;
  cardId: string;
  studentName?: string;
  rollNumber?: string;
  scannedBusId: string;
  scannedBusNumber: string;
  assignedBusId?: string;
  assignedBusNumber?: string;
  tripType: 'morning' | 'evening';
  status: 'success' | 'wrong_bus' | 'already_boarded' | 'bus_full' | 'unregistered_card' | 'unassigned_bus';
  message: string;
  stopName?: string;
  alternativeBuses?: {
    busNumber: string;
    availableSeats: number;
    routeName: string;
  }[];
}

export interface TripSession {
  date: string;
  tripType: 'morning' | 'evening';
  boardedStudentCardIds: string[]; // Set of cardIds currently boarded
}
