import { Bus, Student, BusStop } from '../types/transit';

// Helper to construct BusStop objects with estimated morning pickup times before 8:30 AM campus arrival
function parseStopsFromRoute(routeStr: string, routeId: string): BusStop[] {
  const cleanStops = routeStr
    .replace(/\(Via\)/gi, '')
    .replace(/\(via\)/gi, '')
    .split(/[-–]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.toLowerCase().includes('campus'));

  // Always end at Sathyabama University Campus
  const allStops = [...cleanStops, 'Sathyabama University Campus'];

  return allStops.map((stopName, idx) => {
    // Generate realistic morning time between 06:40 AM and 08:30 AM
    const totalMinutes = 400 + Math.floor((idx / Math.max(1, allStops.length - 1)) * 110); // 6:40 AM to 8:30 AM
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const morningTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} AM`;
    const eveningTime = `${(hours - 2).toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} PM`;

    return {
      id: `${routeId}-stop-${idx + 1}`,
      name: stopName,
      landmark: idx === allStops.length - 1 ? 'Main Transit Hub' : `${stopName} Bus Shelter / Junction`,
      morningTime,
      eveningTime,
      order: idx + 1,
    };
  });
}

// Authentic Sathyabama Institute of Science and Technology Route Database
export const SATHYABAMA_ROUTES_CONFIG = [
  {
    routeNo: '1',
    vehicleNo: 'AU2877',
    driverName: 'IP VENKATESAN',
    driverPhone: '9789933356',
    routeStr: 'Cheyyar-Kancheepuram-Walajabath-Oragadam-Padapai-Mannivakkam-Vandalore-Kandigai',
  },
  {
    routeNo: '1A',
    vehicleNo: 'AU2787',
    driverName: 'POONGAVANAM',
    driverPhone: '9976265471',
    routeStr: 'Vandhavasi-Kancheepuram-Walajabath-Oragadam-Padapai-Mannivakkam-Vandalore-Kandigai-Kolabakkam-Mambakkam',
  },
  {
    routeNo: '1B',
    vehicleNo: 'AF2787',
    driverName: 'B.K.PERUMAL',
    driverPhone: '9710033537',
    routeStr: 'Kancheepuram-Walajabath-Oragadam-Padapai-Mannivakkam-Vandalore-Kolabakkam-Kandigai',
  },
  {
    routeNo: '1C',
    vehicleNo: 'AU3786',
    driverName: 'VIGNESHWARAN',
    driverPhone: '7538893122',
    routeStr: 'Kancheepuram-Walajabath-Oragadam-Padapai-Mannivakkam-Vandalore-Kandigai-Mambakkam',
  },
  {
    routeNo: '1D',
    vehicleNo: 'AU3678',
    driverName: 'K.C.IGNATIOUS',
    driverPhone: '9677924655',
    routeStr: 'Sriperumbudur-Pushpagiri-Manimangalam-Vandalore-Kolabakkam-Kandigai',
  },
  {
    routeNo: '1E',
    vehicleNo: 'AU3768',
    driverName: 'SURESH',
    driverPhone: '6384119283',
    routeStr: 'Kancheepuram-Walajabath-Oragadam-Padapai-Mannivakkam-Vandalore-Kandigai-Kolabakkam-Mambakkam-Kelambakkam',
  },
  {
    routeNo: '1F',
    vehicleNo: 'AK6747',
    driverName: 'RAJA',
    driverPhone: '6384028825',
    routeStr: 'Kancheepuram-Walajabath-Oragadam-Padapai-Mannivakkam-Vandalore-Kolabakkam-Kandigai',
  },
  {
    routeNo: '2',
    vehicleNo: 'AQ7449',
    driverName: 'SANKAR',
    driverPhone: '7639258401',
    routeStr: 'Melmaruvathur-Madhuranthakam-Bhukkathurai-Chengalpet-Raatina Kinaru-Thiruporur Koot Road-Thiruvadisoolam-Mullibakkam-Karumbakkam',
  },
  {
    routeNo: '2A',
    vehicleNo: 'AQ9627',
    driverName: 'RAMALINGAM',
    driverPhone: '9841528831',
    routeStr: 'Madhuranthakam-Karunkuzhi-Maamandur-Patalam-Chengalpattu-Thiruporur Koot Road-Thiruvadisoolam-Mullibakkam-Karumbakkam',
  },
  {
    routeNo: '2B',
    vehicleNo: 'AF2697',
    driverName: 'DEVAKUMAR',
    driverPhone: '8098325148',
    routeStr: 'Uthiramerur-Bhukkathurai-Chengalpet Bye pass-Chengalpet bus stand-Raatina Kinaru-Thiruporur Koot Road',
  },
  {
    routeNo: '2C',
    vehicleNo: 'AM7764',
    driverName: 'DEVARAJAN',
    driverPhone: '9790405526',
    routeStr: 'Chengalpet Bye pass-Raatina Kinaru-Thiruporur Koot Road-Thiruvadisoolam-Mullibakkam-Karumbakkam',
  },
  {
    routeNo: '2D',
    vehicleNo: 'AM7746',
    driverName: 'BALRAJ',
    driverPhone: '9600723664',
    routeStr: 'Raatina Kinaru-Thiruporur Koot Road-Thiruvadisoolam-Mullibakkam-Karumbakkam-Kottamedu-Thiruporur-Kalavakkam',
  },
  {
    routeNo: '2E',
    vehicleNo: 'AU2733',
    driverName: 'SAMINADAN',
    driverPhone: '9791076133',
    routeStr: 'Thiruporur Koot Road-Thiruvadisoolam-Mullibakkam-Karumbakkam-Kottamedu-Thiruporur',
  },
  {
    routeNo: '2F',
    vehicleNo: 'AD6774',
    driverName: 'PRABHAKAR',
    driverPhone: '8870887975',
    routeStr: 'Chengalpet-Paranur-S.P.Kovil-M.M. Nagar-SRM-Guduvancherry-Urapakkam-Vandalore-Kandigai-Mambakkam-Kelambakkam',
  },
  {
    routeNo: '2G',
    vehicleNo: 'BW9933',
    driverName: 'PANNEER',
    driverPhone: '9894027380',
    routeStr: 'Chengalpet-Paranur-S.P.Kovil-M.M. Nagar-SRM-Guduvancherry-Urapakkam-Kilambakkam-Vandalore-Kandigai-Mambakkam',
  },
  {
    routeNo: '2H',
    vehicleNo: 'AD7737',
    driverName: 'BALAMURALI',
    driverPhone: '8939896896',
    routeStr: 'Chengalpet-Paranur-S.P.Kovil-M.M. Nagar-SRM-Guduvancherry-Urapakkam-Kilambakkam-Vandalore-Kandigai-Mambakkam',
  },
  {
    routeNo: '3',
    vehicleNo: 'AQ9447',
    driverName: 'GNANAM',
    driverPhone: '9344340721',
    routeStr: 'Kannivakkam-Kaayarmedu-Guduvancherry-Urapakkam-Kilambakkam-Vandalore-Kolambakkam-Kandigai',
  },
  {
    routeNo: '3A',
    vehicleNo: 'BW1212',
    driverName: 'PANNEER',
    driverPhone: '9789845536',
    routeStr: 'Guduvancherry-Urapakkam-Kilambakkam-Vandalore-Kolambakkam-Mambakkam-Kelambakkam-Padur',
  },
  {
    routeNo: '3B',
    vehicleNo: 'AF2517',
    driverName: 'JAYACHANDRAN',
    driverPhone: '8667063867',
    routeStr: 'Urapakkam-Vandalore-Kolabakkam-Mela kottaiyur-Keela kottaiyur-Mambakkam-Pudubakkam-Kelambakkam',
  },
  {
    routeNo: '3C',
    vehicleNo: 'AU3876',
    driverName: 'TAMIL',
    driverPhone: '8056287443',
    routeStr: 'Vandalore-Kolambakkam-Kandigai-Mela kottaiyur-Keela kottaiyur-Mambakkam-Kelambakkam-Padur',
  },
  {
    routeNo: '4',
    vehicleNo: 'AQ9573',
    driverName: 'BALAMURUGAN',
    driverPhone: '8608731764',
    routeStr: 'Marakanam-Kovathur-Kathankadai-Veppancherry-Kalpakkam Indranagar-Vengambakkam-Poonjeri Toll Gate-Thiruporur-Kelambakkam',
  },
  {
    routeNo: '4A',
    vehicleNo: 'AU2778',
    driverName: 'KUMAR',
    driverPhone: '9789921037',
    routeStr: 'Kovathur-Kathankadai-Veppancherry-Kalpakkam Indra nagar-Vengambakkam-Poonjeri Toll Gate-Thiruporur-Kelambakkam',
  },
  {
    routeNo: '5',
    vehicleNo: 'AD8979',
    driverName: 'JAYAKUMAR',
    driverPhone: '9171960721',
    routeStr: 'Maanapathy-Ambur-Thiruporur Rountana-Kalavakkam-Vijaya Shanthi Apartments-Kelambakkam-Padur-Navalur',
  },
  {
    routeNo: '5C',
    vehicleNo: 'AS8376',
    driverName: 'MANIVARMAN',
    driverPhone: '8056174165',
    routeStr: 'Kelambakkam-Padur-Kazhipattur-Navalur-Ags-Semmencherry Alamaram',
  },
  {
    routeNo: '6',
    vehicleNo: 'AQ9537',
    driverName: 'KARTHICK',
    driverPhone: '8248993037',
    routeStr: 'Thalankuppam-Ennore-Ernavur-Vimco Nagar-Thiruvotriyur-Theradi-Toll gate-Tondiarpet-Kasimedu-Kalmandabam-Royapuram',
  },
  {
    routeNo: '6B',
    vehicleNo: 'AK7197',
    driverName: 'NIRMAL',
    driverPhone: '9123518260',
    routeStr: 'Thiruvotriyur-Theradi-Tondiarpet toll gate-Kasimedu-Royapuram-Beach Station-Parrys Corner-Anna square-Light House-Santhome-Pattinambakkam',
  },
  {
    routeNo: '7',
    vehicleNo: 'AQ9771',
    driverName: 'SELVAKUMAR',
    driverPhone: '9600127817',
    routeStr: 'Maathur-Madhavaram Post Office-Moolakadai-Sharma Nagar-Vyasarpadi-Walltax Road-Central-Anna Square-Vivekanandar illam',
  },
  {
    routeNo: '8',
    vehicleNo: 'AF1788',
    driverName: 'PALANI',
    driverPhone: '8681999983',
    routeStr: 'Valluvarkottam-Semmozhi Poonga-Stella Marrys College-Luz Corner-Mylapore-Mandaveli-Sathya Studio-Adyar-ECR',
  },
  {
    routeNo: '9',
    vehicleNo: 'Z4110',
    driverName: 'J.D.RAJA',
    driverPhone: '9941113402',
    routeStr: 'Besant Nagar-Vannathurai-Thiruvanmiyur-Palavakkam-V.G.P',
  },
  {
    routeNo: '10',
    vehicleNo: 'AQ7278',
    driverName: 'PAWAN KUMAR',
    driverPhone: '8807695465',
    routeStr: 'Thiruvallur-Manavalan Nagar-Poonamallee-Kumananchavadi-Ayyapanthangal-Ramapuram-Butt Road-Guindy',
  },
  {
    routeNo: '10B',
    vehicleNo: 'AD7476',
    driverName: 'BHAKTHAVASAL M',
    driverPhone: '8939101104',
    routeStr: 'Poonamallee-Ayyapanthangal-Karayanchavadi-Porur Signal-Mugalivakkam-Ramapuram-Butt Road-Guindy-Velacherry bye pass-Chennai one',
  },
  {
    routeNo: '11B',
    vehicleNo: 'AU3579',
    driverName: 'RAJI',
    driverPhone: '6383249235',
    routeStr: 'Avadi-Avadi Murugappa Polytechnic-Thirumullaivoyal-Ambattur O.T-Ambattur-Padi-Koyambedu-MMDA-Vadapalani-Alandur metro',
  },
  {
    routeNo: '12',
    vehicleNo: 'A2112',
    driverName: 'VENKATESAN',
    driverPhone: '9952934201',
    routeStr: 'Red Hills-Puzhal-Camp-Rettari-Padi-Thirumangalam-Koyambedu-Vadapalani-Alandur metro',
  },
  {
    routeNo: '14A',
    vehicleNo: 'AU3417',
    driverName: 'JEELANI',
    driverPhone: '9444585349',
    routeStr: 'T.Nagar Bus stand-Saidapet-Little Mount-Anna University-IIT-Madhyakailash-Tidel Park-SRP Tools-Kandhanchavadi',
  },
  {
    routeNo: '17',
    vehicleNo: 'AK9897',
    driverName: 'VIGNESH',
    driverPhone: '9363577543',
    routeStr: 'Porur-Lakshmi Nagar-Valasaravakkam-Alwarthiru Nagar-Kesavarthini-Virugambakkam-Guindy-Velacherry bye pass-Chennai One',
  },
  {
    routeNo: '18',
    vehicleNo: 'AQ9177',
    driverName: 'LENIN',
    driverPhone: '9500198814',
    routeStr: 'Mangadu-Kundrathur-Anakapudur-Pammal-Pallavaram-Vels college-S.Kolathur-Kamakshi Hospital-Chennai one',
  },
  {
    routeNo: '19',
    vehicleNo: 'AU3597',
    driverName: 'RAMESH',
    driverPhone: '9677515538',
    routeStr: 'Walajabath-Oragadam-Padapai-Salamangalam-Mannivakkam-Mudichur-Tambaram',
  },
  {
    routeNo: '20',
    vehicleNo: 'AD8997',
    driverName: 'RAVI',
    driverPhone: '9788028002',
    routeStr: 'Hasthinapuram-Chitlapakkam-Selaiyur Police Station-Camproad-Mahalakshmi Nagar-Rajakilpakkam-Kamarajapuram',
  },
  {
    routeNo: '21',
    vehicleNo: 'AU3795',
    driverName: 'GNANAGURU',
    driverPhone: '7708796143',
    routeStr: 'Mannivakkam-Lakshmi nagar-Mudichur-Old Perungulathore-Bharathi Nagar-Tambaram-Selaiyur-Camproad-Mahalakshmi Nagar-Sembakkam',
  },
  {
    routeNo: '22',
    vehicleNo: 'BX8070',
    driverName: 'SELVARAJ',
    driverPhone: '9884164237',
    routeStr: 'Kamakshi Hospital-Balaji Dental College-Narayanapuram-Pallikaranai-Medavakkam-Perumbakkam-Global-HCL',
  },
  {
    routeNo: '23',
    vehicleNo: 'A1500',
    driverName: 'ARJUN',
    driverPhone: '9952720962',
    routeStr: 'Axis Bank-Madipakkam Ponniyamman temple-Balaya Gardan-Sadasivam Nagar-Ram Nagar-Kaiveli-Chennai One',
  },
  {
    routeNo: '25',
    vehicleNo: 'AM6072',
    driverName: 'RAJENDRAN',
    driverPhone: '9791100217',
    routeStr: 'Axis Bank-Keelkattalai-Ganesh Nagar-S.kolathur-Kamakshi Hospital-Chennai one-PTC-Karapakkam',
  },
  {
    routeNo: '32',
    vehicleNo: 'BZ2400',
    driverName: 'A.V.RAMESH',
    driverPhone: '7010351581',
    routeStr: 'Velacherry Gurunanak college-GRT-Vijaya Nagar-Baby Nagar-Tansi Nagar-Taramani-Perungudi-Jain College-Mettukuppam',
  },
  {
    routeNo: '33',
    vehicleNo: 'AB8817',
    driverName: 'MANOJ',
    driverPhone: '9566359326',
    routeStr: 'Taramani-Perungudi Toll Gate-Thoraipakkam-Jain College-Mettukuppam PTC',
  },
  {
    routeNo: '35',
    vehicleNo: 'Z4011',
    driverName: 'PERUMAL',
    driverPhone: '7448882373',
    routeStr: 'Pudubakkam-Siruseri-Thalambur-Navalur-AGS-Semmencherry Alamaram',
  },
  {
    routeNo: '37',
    vehicleNo: 'AC5055',
    driverName: 'UMAPATHY',
    driverPhone: '9566164267',
    routeStr: 'Uthandi Toll gate-Panaiyur-Akkarai-Sholinganallur-Ponniyamman temple',
  },
];

// Build Bus list with capacity between 54 and 60
export const INITIAL_BUSES: Bus[] = SATHYABAMA_ROUTES_CONFIG.map((cfg, index) => {
  const busId = `sathyabama-bus-${cfg.routeNo.toLowerCase()}`;
  const stops = parseStopsFromRoute(cfg.routeStr, busId);

  return {
    id: busId,
    busNumber: `Route ${cfg.routeNo}`,
    routeNo: cfg.routeNo,
    routeName: `${cfg.routeStr} ➔ Sathyabama Campus`,
    vehicleNo: cfg.vehicleNo,
    registrationNumber: `TN-${cfg.vehicleNo.slice(0, 2)}-${cfg.vehicleNo.slice(2)}`,
    capacity: index % 2 === 0 ? 54 : 56, // 50 to 60 capacity
    driverName: cfg.driverName,
    driverPhone: cfg.driverPhone,
    attendantName: 'Campus Transport Staff',
    status: 'boarding',
    currentStopId: stops[0]?.id || '',
    stops,
  };
});

// Consolidate unique stops across all Sathyabama buses
export const INITIAL_STOPS: BusStop[] = (() => {
  const map = new Map<string, BusStop>();
  INITIAL_BUSES.forEach((b) => {
    b.stops.forEach((s) => {
      if (!map.has(s.name.toLowerCase())) {
        map.set(s.name.toLowerCase(), s);
      }
    });
  });
  return Array.from(map.values());
})();

// Official 54 Students from College Roster
const RAW_STUDENT_DATA: { regNo: string; name: string }[] = [
  { regNo: '146611001', name: 'AADARSH DP' },
  { regNo: '146611002', name: 'AAFIYA SHAMEEL' },
  { regNo: '146611003', name: 'AAKASH R' },
  { regNo: '146611004', name: 'ABHIVAN JAYAN S' },
  { regNo: '146611005', name: 'ABINAYA MEENAKSHI G' },
  { regNo: '146611006', name: 'ADAMS SMITH' },
  { regNo: '146611007', name: 'ADHINA SHEELA GRACE GEORGE' },
  { regNo: '146611008', name: 'ADITYA PATERIYA' },
  { regNo: '146611009', name: 'AHIRAA S' },
  { regNo: '146611010', name: 'AJAY AKASH S B' },
  { regNo: '146611011', name: 'AJAY KUMAR G' },
  { regNo: '146611012', name: 'AJEESH NARAYAN M' },
  { regNo: '146611013', name: 'AJITH V' },
  { regNo: '146611014', name: 'AKAANSHA VIKRAM' },
  { regNo: '146611015', name: 'AKHIL ALAGAR MURALIDHARAN' },
  { regNo: '146611016', name: 'AKSHARA L' },
  { regNo: '146611017', name: 'AMIRTHAA M' },
  { regNo: '146611018', name: 'AMITHRAJ A' },
  { regNo: '146611019', name: 'ANIQ MOHAMED K' },
  { regNo: '146611020', name: 'ANISH MADHAV S' },
  { regNo: '146611021', name: 'ANNE FRANEE' },
  { regNo: '146611022', name: 'ANTON JIVIN LEON P' },
  { regNo: '146611023', name: 'ANTONY VINOFER V' },
  { regNo: '146611024', name: 'ARADHANA R' },
  { regNo: '146611025', name: 'ARAVIND V I' },
  { regNo: '146611026', name: 'ARSHAD B' },
  { regNo: '146611027', name: 'ARSHATH A' },
  { regNo: '146611028', name: 'ARYAN A V' },
  { regNo: '146611029', name: 'ASHIKA R V' },
  { regNo: '146611030', name: 'ASHMITA S K' },
  { regNo: '146611031', name: 'ASHVANTHISHA A' },
  { regNo: '146611032', name: 'ASHWANI KUMAR PANDEY' },
  { regNo: '146611033', name: 'ASHWANTH S' },
  { regNo: '146611034', name: 'ASHWATH' },
  { regNo: '146611035', name: 'ASHWINRAJ E' },
  { regNo: '146611036', name: 'ASIFA' },
  { regNo: '146611037', name: 'ASWIN M' },
  { regNo: '146611038', name: 'AVINASH D' },
  { regNo: '146611039', name: 'AYUSH A' },
  { regNo: '146611040', name: 'BALAKUMAR N' },
  { regNo: '146611041', name: 'BARANITHARAN G' },
  { regNo: '146611042', name: 'BARATHI R' },
  { regNo: '146611043', name: 'BELLARMINE ROY G' },
  { regNo: '146611044', name: 'BHARATH A' },
  { regNo: '146611045', name: 'BINISHA SRI PR' },
  { regNo: '146611046', name: 'CANOLIN SANDRA A' },
  { regNo: '146611047', name: 'CASTRO X' },
  { regNo: '146611048', name: 'CHARAN KARTHIKEYA P' },
  { regNo: '146611049', name: 'CHITTURI HAASINI' },
  { regNo: '146611050', name: 'CHOKKAKU SATWIKA' },
  { regNo: '146611051', name: 'DEEPAK R S' },
  { regNo: '146611052', name: 'DEEPSHIKA SARAVANABABU' },
  { regNo: '146611053', name: 'DEETYA G S' },
  { regNo: '146611054', name: 'DHARSHAN V' },
];

// As requested: REMOVE DEFAULT BUS NUMBER AND SEAT NUMBER GIVEN TO STUDENTS.
// All students start unassigned (assignedBusId: undefined, assignedSeatNumber: undefined)
// Students have full access to select their preferred bus route, bus number, stop, and seat!
export const INITIAL_STUDENTS: Student[] = RAW_STUDENT_DATA.map((item) => {
  return {
    id: `stu-${item.regNo}`,
    cardId: item.regNo,
    name: item.name,
    rollNumber: item.regNo,
    department: 'Computer Science & Engineering',
    year: '3rd Year',
    phone: `+91 98400 ${item.regNo.slice(-5)}`,
    pin: item.regNo.slice(-4),
    // No default bus or seat: student selects their own!
    homeStopId: undefined,
    assignedBusId: undefined,
    assignedSeatNumber: undefined,
  };
});
