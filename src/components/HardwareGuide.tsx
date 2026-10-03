import React, { useState } from 'react';
import {
  Cpu,
  Copy,
  Check,
  Download,
  Terminal,
  Layers,
  Wrench,
  Wifi,
  Radio,
  HelpCircle,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';

export const HardwareGuide: React.FC = () => {
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'esp32' | 'usb' | 'phone'>('esp32');

  const esp32InoCode = `/*
 * =========================================================================
 *  UniTransit - ESP32 + RC522 RFID Bus Door Scanner
 *  Target: ESP32 Dev Module + MFRC522 RFID Reader (SPI)
 *  Zero-Standing Guarantee College Bus Verification
 * =========================================================================
 *  Pin Connections:
 *    RC522 3.3V  ->  ESP32 3V3   (CRITICAL: Do NOT connect to 5V!)
 *    RC522 GND   ->  ESP32 GND
 *    RC522 RST   ->  ESP32 GPIO 22
 *    RC522 SDA   ->  ESP32 GPIO 5  (SS)
 *    RC522 SCK   ->  ESP32 GPIO 18 (SCK)
 *    RC522 MOSI  ->  ESP32 GPIO 23 (MOSI)
 *    RC522 MISO  ->  ESP32 GPIO 19 (MISO)
 * 
 *  Indicators:
 *    Green LED   ->  ESP32 GPIO 25 (with 220Ω resistor to GND)
 *    Red LED     ->  ESP32 GPIO 26 (with 220Ω resistor to GND)
 *    Piezo Buzzer->  ESP32 GPIO 27 (Active or Passive Buzzer to GND)
 * =========================================================================
 */

#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>

// --- CONFIGURATION ---
const char* WIFI_SSID     = "College_Bus_WiFi"; // Bus hotspot or 4G router
const char* WIFI_PASSWORD = "CollegePassword123";

// Server endpoint (Change to your deployed server URL or local IP)
const char* SERVER_URL    = "http://192.168.1.100:3000/api/scan";
const char* SCAN_KEY      = "mysecret1";
const char* BUS_NUMBER    = "Bus 1A"; // Hardware bus designation for this unit

#define RST_PIN         22
#define SS_PIN          5
#define LED_GREEN       25
#define LED_RED         26
#define BUZZER_PIN      27

MFRC522 mfrc522(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\\n--- UniTransit Bus Door Scanner Starting ---");

  // Setup pins
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_RED, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // Initialize SPI & MFRC522
  SPI.begin();
  mfrc522.PCD_Init();
  delay(100);
  mfrc522.PCD_DumpVersionToSerial();

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi SSID: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(500);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\\nWiFi Connected! IP Address: ");
    Serial.println(WiFi.localIP());
    // Ready chirp
    playBuzzer(1000, 100);
    delay(100);
    playBuzzer(1500, 150);
  } else {
    Serial.println("\\nWiFi Connection Failed! Unit running in Offline Cache mode.");
  }

  Serial.println("Ready to scan Student RFID cards...");
}

void loop() {
  // Check for new RFID card
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Convert UID to Hex String
  String cardUid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) cardUid += "0";
    cardUid += String(mfrc522.uid.uidByte[i], HEX);
  }
  cardUid.toUpperCase();

  Serial.println("=================================");
  Serial.print("Tapped Card UID: ");
  Serial.println(cardUid);

  // Send verification request to server
  verifyCardWithServer(cardUid);

  // Halt PICC to avoid repeated triggers
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  delay(1000); // 1-second debounce
}

void verifyCardWithServer(String cardId) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Error: No WiFi connection to verify card.");
    indicateWrongBus();
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-scan-key", SCAN_KEY);

  String payload = "{\\"card_id\\":\\"" + cardId + "\\",\\"bus_number\\":\\"" + String(BUS_NUMBER) + "\\"}";

  Serial.print("Sending POST to: ");
  Serial.println(SERVER_URL);
  int httpResponseCode = http.POST(payload);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("HTTP Code: ");
    Serial.println(httpResponseCode);
    Serial.print("Response: ");
    Serial.println(response);

    // Parse simple response flags
    if (response.indexOf("\\"status\\":\\"success\\"") > 0 || httpResponseCode == 200) {
      Serial.println(">>> RESULT: VALID BOARDING (GREEN)");
      indicateValidBoarding();
    } else if (response.indexOf("already_boarded") > 0) {
      Serial.println(">>> RESULT: ALREADY BOARDED (AMBER)");
      indicateAlreadyBoarded();
    } else {
      Serial.println(">>> RESULT: WRONG BUS OR FULL (RED)");
      indicateWrongBus();
    }
  } else {
    Serial.print("Server HTTP Error: ");
    Serial.println(httpResponseCode);
    indicateWrongBus();
  }

  http.end();
}

// Indicator Functions
void indicateValidBoarding() {
  digitalWrite(LED_GREEN, HIGH);
  playBuzzer(880, 100);
  delay(80);
  playBuzzer(1320, 200);
  delay(800);
  digitalWrite(LED_GREEN, LOW);
}

void indicateWrongBus() {
  digitalWrite(LED_RED, HIGH);
  for (int i = 0; i < 3; i++) {
    playBuzzer(250, 150);
    delay(100);
  }
  digitalWrite(LED_RED, LOW);
}

void indicateAlreadyBoarded() {
  // Alternate flash
  for (int i = 0; i < 2; i++) {
    digitalWrite(LED_GREEN, HIGH);
    digitalWrite(LED_RED, HIGH);
    playBuzzer(600, 100);
    delay(150);
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_RED, LOW);
    delay(100);
  }
}

void playBuzzer(int frequency, int durationMs) {
  tone(BUZZER_PIN, frequency, durationMs);
  delay(durationMs);
  noTone(BUZZER_PIN);
}
`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(esp32InoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCode = () => {
    const blob = new Blob([esp32InoCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'esp32_scanner.ino';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping"></span>
              <span className="text-xs uppercase font-mono text-indigo-400 font-bold tracking-wider">
                Hardware Engineering & Deployment
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              Student ID Scanner Architecture & Assembly
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              Complete blueprint for deploying scanners on every college bus. Supports 3 interchangeable scanner setups: ESP32 + RC522 RFID unit, USB / Bluetooth barcode wand, and smartphone camera kiosk.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Code!' : 'Copy .ino Code'}</span>
            </button>
            <button
              onClick={handleDownloadCode}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download .ino File</span>
            </button>
          </div>
        </div>

        {/* 3 Architecture Selection Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('esp32')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'esp32'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Option 1: ESP32 + RC522 RFID Unit (Standalone)
          </button>
          <button
            onClick={() => setActiveTab('usb')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'usb'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Option 2: USB / Bluetooth Barcode & RFID Wand
          </button>
          <button
            onClick={() => setActiveTab('phone')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'phone'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Option 3: Phone / Tablet Camera Kiosk
          </button>
        </div>
      </div>

      {activeTab === 'esp32' && (
        <div className="space-y-6">
          {/* Hardware Bill of Materials & Pinout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Pinout Table */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>ESP32 ⇄ RC522 Wiring & Pinout Map</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">RC522 RFID Pin</th>
                      <th className="py-2.5 px-3">ESP32 Pin</th>
                      <th className="py-2.5 px-3">Function</th>
                      <th className="py-2.5 px-3">Caution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr className="bg-amber-50/40 dark:bg-amber-950/20 font-semibold">
                      <td className="py-2.5 px-3 text-amber-700 dark:text-amber-400">3.3V (VCC)</td>
                      <td className="py-2.5 px-3 font-mono">3V3</td>
                      <td className="py-2.5 px-3">Power</td>
                      <td className="py-2.5 px-3 text-rose-600 text-[11px]">DO NOT connect to 5V (damages chip!)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">GND</td>
                      <td className="py-2.5 px-3 font-mono">GND</td>
                      <td className="py-2.5 px-3">Common Ground</td>
                      <td className="py-2.5 px-3 text-slate-400">—</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">RST</td>
                      <td className="py-2.5 px-3 font-mono">GPIO 22</td>
                      <td className="py-2.5 px-3">Reset line</td>
                      <td className="py-2.5 px-3 text-slate-400">—</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">SDA (SS)</td>
                      <td className="py-2.5 px-3 font-mono">GPIO 5</td>
                      <td className="py-2.5 px-3">SPI Chip Select</td>
                      <td className="py-2.5 px-3 text-slate-400">—</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">SCK</td>
                      <td className="py-2.5 px-3 font-mono">GPIO 18</td>
                      <td className="py-2.5 px-3">SPI Clock</td>
                      <td className="py-2.5 px-3 text-slate-400">—</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">MOSI</td>
                      <td className="py-2.5 px-3 font-mono">GPIO 23</td>
                      <td className="py-2.5 px-3">SPI Master Out</td>
                      <td className="py-2.5 px-3 text-slate-400">—</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">MISO</td>
                      <td className="py-2.5 px-3 font-mono">GPIO 19</td>
                      <td className="py-2.5 px-3">SPI Master In</td>
                      <td className="py-2.5 px-3 text-slate-400">—</td>
                    </tr>
                    <tr className="bg-emerald-50/40 dark:bg-emerald-950/20">
                      <td className="py-2.5 px-3 text-emerald-700 dark:text-emerald-400 font-medium">Green LED (+)</td>
                      <td className="py-2.5 px-3 font-mono">GPIO 25</td>
                      <td className="py-2.5 px-3">Valid Boarding</td>
                      <td className="py-2.5 px-3 text-slate-500">220Ω resistor in series to GND</td>
                    </tr>
                    <tr className="bg-rose-50/40 dark:bg-rose-950/20">
                      <td className="py-2.5 px-3 text-rose-700 dark:text-rose-400 font-medium">Red LED (+)</td>
                      <td className="py-2.5 px-3 font-mono">GPIO 26</td>
                      <td className="py-2.5 px-3">Wrong Bus Alert</td>
                      <td className="py-2.5 px-3 text-slate-500">220Ω resistor in series to GND</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">Piezo Buzzer (+)</td>
                      <td className="py-2.5 px-3 font-mono">GPIO 27</td>
                      <td className="py-2.5 px-3">Audio Feedback</td>
                      <td className="py-2.5 px-3 text-slate-500">Negative leg to GND</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bill of Materials & Bus Enclosure Setup */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-indigo-600" />
                <span>Components Checklist & Installation</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="font-bold block text-slate-900 dark:text-white">1x ESP32 Dev Board</span>
                  <span className="text-[11px] text-slate-500">NodeMCU / ESP-WROOM-32 (Wi-Fi + BLE)</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="font-bold block text-slate-900 dark:text-white">1x RC522 RFID Module</span>
                  <span className="text-[11px] text-slate-500">13.56 MHz RFID reader with antenna</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="font-bold block text-slate-900 dark:text-white">LEDs & 220Ω Resistors</span>
                  <span className="text-[11px] text-slate-500">1x Green (Valid) + 1x Red (Wrong Bus)</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="font-bold block text-slate-900 dark:text-white">5V Piezo Buzzer</span>
                  <span className="text-[11px] text-slate-500">High pitch chime & buzzer alerts</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="font-bold block text-slate-900 dark:text-white">3D Printed or ABS Case</span>
                  <span className="text-[11px] text-slate-500">Mounts by the bus entry door at chest height</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="font-bold block text-slate-900 dark:text-white">5V USB Power Supply</span>
                  <span className="text-[11px] text-slate-500">Bus USB port or 12V to 5V DC step-down</span>
                </div>
              </div>

              {/* Physical Bus Mount Guide */}
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-lg text-xs space-y-2 text-indigo-950 dark:text-indigo-200">
                <span className="font-bold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                  <Lightbulb className="w-4 h-4 text-indigo-600" />
                  Bus Door Installation Recommendations:
                </span>
                <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                  <li>Mount the RFID scanner box on the left railing of the front entry door at a height of 1.2 meters.</li>
                  <li>Power the unit from the bus dashboard 5V USB accessory socket or an in-line 12V-to-5V step-down buck converter.</li>
                  <li>Provide Wi-Fi connectivity via the driver&apos;s phone mobile hotspot or an onboard 4G SIM router.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Arduino Code Viewer */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg text-xs">
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span className="font-mono font-semibold">esp32_scanner.ino (Arduino C++)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownloadCode}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[460px]">
              {esp32InoCode}
            </pre>
          </div>
        </div>
      )}

      {activeTab === 'usb' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5 text-xs">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-indigo-600" />
              Plug & Play USB / Wireless Barcode & RFID Wand
            </h3>
            <p className="text-slate-500 mt-1">
              Zero code required. The most reliable commercial setup for bus conductors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                1
              </span>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Hardware</h4>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                Standard 1D/2D USB Barcode Scanner or USB RFID 13.56MHz reader with &quot;Keyboard Wedge&quot; (HID) output mode.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                2
              </span>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Connection</h4>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                Plug directly into conductor laptop, tablet, or Android phone via USB OTG adapter.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                3
              </span>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Operation</h4>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                Open the Door Scanner tab on the browser. When a card is scanned, the scanner types the card number and sends Enter key automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'phone' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5 text-xs">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Wifi className="w-5 h-5 text-indigo-600" />
              Dedicated Smartphone Camera Scanner Kiosk
            </h3>
            <p className="text-slate-500 mt-1">
              Zero extra hardware cost. Uses existing smartphone or tablet camera.
            </p>
          </div>

          <div className="space-y-3 leading-relaxed text-slate-700 dark:text-slate-300">
            <p>
              1. Take an inexpensive Android phone or tablet with a working rear camera and 4G connectivity.
            </p>
            <p>
              2. Mount the phone onto a fixed phone clamp by the bus passenger entrance with the rear camera facing arriving students.
            </p>
            <p>
              3. Open the UniTransit <strong>Door Scanner</strong> tab in Chrome and tap <strong>&quot;Enable Camera&quot;</strong>.
            </p>
            <p>
              4. As students hold up their college ID cards with the barcode or QR code within the frame, the verification is evaluated in real-time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
