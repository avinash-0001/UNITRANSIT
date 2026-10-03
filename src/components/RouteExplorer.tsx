import React, { useState } from 'react';
import {
  MapPin,
  Search,
  Bus as BusIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Sparkles,
  Users,
  Compass,
} from 'lucide-react';
import { Bus, Student, BusStop, TripSession } from '../types/transit';
import { getBusSeatStats } from '../utils/transitStorage';

interface RouteExplorerProps {
  buses: Bus[];
  stops: BusStop[];
  students: Student[];
  tripSession: TripSession;
  onSelectBus?: (busId: string) => void;
}

export const RouteExplorer: React.FC<RouteExplorerProps> = ({
  buses,
  stops,
  students,
  tripSession,
  onSelectBus,
}) => {
  const [selectedStopId, setSelectedStopId] = useState<string>(stops[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const currentStop = stops.find((s) => s.id === selectedStopId);

  // Filter stops by user search query
  const filteredStops = stops.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.landmark.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find all buses that pass through the selected stop
  const servingBuses = buses.filter((b) =>
    b.stops.some((s) => s.id === selectedStopId)
  );

  // Sort buses by seat availability descending
  const busesWithStats = servingBuses.map((bus) => {
    const stats = getBusSeatStats(bus, students, tripSession);
    const stopTiming = bus.stops.find((s) => s.id === selectedStopId);
    return {
      bus,
      stats,
      stopTiming,
      isFull: stats.availableSeats <= 0,
    };
  }).sort((a, b) => b.stats.availableSeats - a.stats.availableSeats);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                Route Analyzer & Alternative Bus Finder
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your boarding stop or home location to find the right bus and check available seats.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search stop or landmark..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Quick Stop Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 text-xs">
          <span className="text-slate-400 font-semibold shrink-0">Popular Stops:</span>
          {filteredStops.slice(0, 8).map((stop) => (
            <button
              key={stop.id}
              onClick={() => setSelectedStopId(stop.id)}
              className={`px-3 py-1.5 rounded-lg shrink-0 font-medium transition-colors ${
                selectedStopId === stop.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {stop.name}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Stop Details and Bus Options */}
      {currentStop && (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                  Selected Destination / Home Stop
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {currentStop.name}
                </h3>
                <p className="text-xs text-slate-500">{currentStop.landmark}</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <span>Standard Morning Pickup: <strong>{currentStop.morningTime}</strong></span>
              <span className="mx-2">·</span>
              <span>Evening Drop: <strong>{currentStop.eveningTime}</strong></span>
            </div>
          </div>

          {/* List of Buses Serving this Stop */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <BusIcon className="w-4 h-4 text-indigo-600" />
                <span>Buses Serving {currentStop.name} ({busesWithStats.length})</span>
              </h4>
              <span className="text-xs text-slate-500">
                Sorted by highest seat availability
              </span>
            </div>

            {busesWithStats.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                No direct buses currently scheduled for this stop. Please contact college transit admin.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {busesWithStats.map((item, index) => {
                  const isRecommendedAlternative =
                    index === 0 && busesWithStats.length > 1 && item.stats.availableSeats > 5;

                  return (
                    <div
                      key={item.bus.id}
                      className={`p-5 rounded-xl border transition-all bg-white dark:bg-slate-900 shadow-sm space-y-4 ${
                        item.isFull
                          ? 'border-rose-300 dark:border-rose-900/60 opacity-80'
                          : isRecommendedAlternative
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {/* Header with Bus Number & Badge */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-slate-900 dark:text-white">
                              {item.bus.busNumber}
                            </span>
                            {isRecommendedAlternative && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                Recommended Choice
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {item.bus.routeName}
                          </p>
                        </div>

                        {/* Status Tag */}
                        <div>
                          {item.isFull ? (
                            <span className="px-2.5 py-1 rounded text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                              Bus Full (0 Free)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              {item.stats.availableSeats} Seats Free
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Seat Occupancy Meter */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                          <span>
                            Seats: <strong>{item.stats.boardedCount}</strong> / {item.bus.capacity}
                          </span>
                          <span className="font-semibold">{item.stats.occupancyPercent}% Occupied</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${
                              item.isFull
                                ? 'bg-rose-500'
                                : item.stats.occupancyPercent > 75
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, item.stats.occupancyPercent)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Driver & Bus Specs */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                        <div>
                          <span className="block text-[10px] uppercase text-slate-400">Driver</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {item.bus.driverName} ({item.bus.driverPhone})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px] uppercase text-slate-400">Capacity</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {item.bus.capacity} Seats
                          </span>
                        </div>
                      </div>

                      {/* If full, show smart alternative suggestion banner */}
                      {item.isFull && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-800 dark:text-rose-200 space-y-1">
                          <span className="font-bold flex items-center gap-1 text-rose-700 dark:text-rose-300">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Alternative Bus Required
                          </span>
                          <p className="text-[11px]">
                            {item.bus.busNumber} has reached its seating limit to prevent standing. Please check the other open buses listed above that share the {currentStop.name} stop.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Full Route Stops Timeline for the selected Bus */}
          {busesWithStats[0] && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Full Stop Route Timeline for {busesWithStats[0].bus.busNumber}</span>
              </h4>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-300 dark:before:bg-indigo-800">
                {busesWithStats[0].bus.stops.map((stop, idx) => {
                  const isCurrent = stop.id === selectedStopId;
                  return (
                    <div key={stop.id} className="relative flex items-start justify-between gap-3 text-xs">
                      {/* Node circle */}
                      <span
                        className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 transition-all ${
                          isCurrent
                            ? 'bg-indigo-600 border-white ring-4 ring-indigo-500/30'
                            : 'bg-white dark:bg-slate-900 border-indigo-400'
                        }`}
                      ></span>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isCurrent ? 'text-indigo-600 dark:text-indigo-400 text-sm' : 'text-slate-800 dark:text-slate-200'}`}>
                            {stop.name}
                          </span>
                          {isCurrent && (
                            <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              Your Selected Stop
                            </span>
                          )}
                        </div>
                        <span className="text-slate-400 text-[11px] block">{stop.landmark}</span>
                      </div>

                      <div className="text-right text-[11px] font-mono shrink-0">
                        <span className="text-amber-600 dark:text-amber-400 block font-semibold">
                          AM: {stop.morningTime}
                        </span>
                        <span className="text-cyan-600 dark:text-cyan-400 block font-semibold">
                          PM: {stop.eveningTime}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
