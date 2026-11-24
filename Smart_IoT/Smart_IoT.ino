/*
 * SMART PLANT - AUTOMATIC IRRIGATION
 * Board       : ESP32 Dev Module
 * Core        : ESP32 Arduino Core 3.3.12
 * Soil Sensor : GPIO34 (ADC1_CH6)
 * MOSFET      : GPIO26
 * Device ID   : ESP32_001
 * Backend     : NestJS + PostgreSQL (172.20.10.4:3000)
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "driver/gpio.h"
#include "soc/gpio_struct.h"

// ==================================================
// 1. CAU HINH WI-FI
// ==================================================

const char* WIFI_SSID     = "htna";
const char* WIFI_PASSWORD = "chu ong nau";

const unsigned long WIFI_RETRY_INTERVAL  = 15000; // 15 giay cho giua cac lan ket noi lai
const unsigned long WIFI_CONNECT_TIMEOUT = 25000; // 25 giay timeout ket noi

unsigned long lastWifiAttempt = 0;
unsigned int wifiReconnectCount = 0;

enum WiFiConnectionState {
  WIFI_STATE_DISCONNECTED,
  WIFI_STATE_CONNECTING,
  WIFI_STATE_CONNECTED
};

WiFiConnectionState wifiState = WIFI_STATE_DISCONNECTED;

// ==================================================
// 2. CAU HINH BACKEND HTTP
// ==================================================

const char* DEVICE_ID      = "ESP32_001";
String backendHost         = "172.20.10.4";
const int BACKEND_PORT     = 3000;
const char* TELEMETRY_PATH = "/api/v1/telemetry";

const unsigned long TELEMETRY_INTERVAL = 5000; // Chu ky 5 giay

// ==================================================
// 3. CAU HINH PHAN CUNG (HARDWARE)
// ==================================================

#define SOIL_SENSOR_PIN 34
#define PUMP_PIN 26

// ==================================================
// 4. HIEU CHUAN CAM BIEN (CALIBRATION)
// ==================================================

const int DRY_RAW = 2834;
const int WET_RAW = 1336;

const float DRY_THRESHOLD = 30.0;
const float WET_THRESHOLD = 50.0;

// ==================================================
// 5. CAU HINH AN TOAN MAY BOM (HARDWARE TIMER)
// ==================================================

const unsigned long MAX_PUMP_TIME_MS = 10000; // Gioi han chay bom toi da 10 giay
const unsigned long SOAK_TIME_MS     = 30000; // 30 giay cho nuoc ngam deu vao dat

hw_timer_t* pumpHardwareTimer = NULL;
portMUX_TYPE timerMux = portMUX_INITIALIZER_UNLOCKED;

volatile bool timerReady = false;
volatile uint32_t isrTickCount = 0; // Bo dem xac thuc ngat thuc te
volatile bool pumpOn = false;
volatile unsigned long pumpElapsedMs = 0;
volatile bool hardwareSafetyTriggered = false;

volatile bool soakActive = false;
volatile unsigned long soakStartTime = 0;

enum PumpStopReason {
  STOP_REASON_NONE,
  STOP_REASON_USER_COMMAND,    // Tat do nguoi dung ra lenh (OFF / MANUAL)
  STOP_REASON_MOISTURE_TARGET, // Tat do dat nguong do am (>= 50.0%)
  STOP_REASON_SAFETY_LIMIT,    // Tat do vuot gioi han 10s cua Hardware Timer
  STOP_REASON_SYSTEM_INIT      // Khoi tao mac dinh ban dau
};

volatile PumpStopReason lastStopReason = STOP_REASON_SYSTEM_INIT;

// ==================================================
// 6. TRANG THAI HE THONG
// ==================================================

enum Mode {
  MANUAL,
  AUTOMATIC
};

Mode currentMode = MANUAL;
bool calibrationReady = false;

int rawValue = 0;
float moisture = -1.0;

// ==================================================
// 7. BUFFER SERIAL COMMAND
// ==================================================

char serialBuffer[96];
size_t serialBufferIndex = 0;

// ==================================================
// 8. HARDWARE TIMER ISR (ESP32 CORE 3.x GPTIMER)
// ==================================================

void IRAM_ATTR onPumpHardwareTimer() {
  portENTER_CRITICAL_ISR(&timerMux);
  isrTickCount++; // Chung minh ISR thuc su chay moi 100ms

  if (pumpOn) {
    pumpElapsedMs += 100;
    if (pumpElapsedMs >= MAX_PUMP_TIME_MS) {
      // Ghi truc tiep thanh ghi xoa bit GPIO26 (0-31) -> 100% IRAM-safe, khong goi ham ngoai
      GPIO.out_w1tc = (1UL << PUMP_PIN);
      pumpOn = false;
      pumpElapsedMs = 0;
      hardwareSafetyTriggered = true;
      soakActive = true;
      soakStartTime = 0;
      lastStopReason = STOP_REASON_SAFETY_LIMIT;
    }
  }
  portEXIT_CRITICAL_ISR(&timerMux);
}

bool initHardwareSafetyTimer() {
  const uint32_t TIMER_FREQ_HZ = 10000;
  const uint64_t TIMER_ALARM_TICKS = 1000; // 1000 ticks * 0.1ms = 100ms chu ky ngat

  timerReady = false;
  GPIO.out_w1tc = (1UL << PUMP_PIN);

  portENTER_CRITICAL(&timerMux);
  isrTickCount = 0;
  portEXIT_CRITICAL(&timerMux);

  pumpHardwareTimer = timerBegin(TIMER_FREQ_HZ);
  if (pumpHardwareTimer == NULL) {
    Serial.println("[TIMER ERROR] timerBegin() returned NULL.");
    return false;
  }

  timerAttachInterrupt(pumpHardwareTimer, &onPumpHardwareTimer);
  timerAlarm(pumpHardwareTimer, TIMER_ALARM_TICKS, true, 0);

  // Cho 250ms de xac thuc ngat phan cung THUC SU nhay it nhat 2 lan (chu ky 100ms)
  delay(250);

  uint32_t verifiedTicks = 0;
  portENTER_CRITICAL(&timerMux);
  verifiedTicks = isrTickCount;
  portEXIT_CRITICAL(&timerMux);

  if (verifiedTicks < 2) {
    Serial.printf("[TIMER ERROR] ISR verification failed! Expected >= 2 ticks in 250ms, got %u.\n", verifiedTicks);
    timerEnd(pumpHardwareTimer);
    pumpHardwareTimer = NULL;
    GPIO.out_w1tc = (1UL << PUMP_PIN);
    return false;
  }

  timerReady = true;
  Serial.printf("[TIMER] Verified OK (%u ISR ticks in 250ms). 10s hardware cutoff ARMED.\n", verifiedTicks);
  return true;
}

// ==================================================
// 9. CHAN DOAN VA QUAN LY WI-FI
// ==================================================

const char* getAuthModeName(wifi_auth_mode_t authMode) {
  switch (authMode) {
    case WIFI_AUTH_OPEN:            return "OPEN";
    case WIFI_AUTH_WEP:             return "WEP";
    case WIFI_AUTH_WPA_PSK:         return "WPA_PSK";
    case WIFI_AUTH_WPA2_PSK:        return "WPA2_PSK";
    case WIFI_AUTH_WPA_WPA2_PSK:    return "WPA/WPA2_PSK";
    case WIFI_AUTH_WPA2_ENTERPRISE: return "WPA2_ENTERPRISE";
    case WIFI_AUTH_WPA3_PSK:        return "WPA3_PSK";
    case WIFI_AUTH_WPA2_WPA3_PSK:   return "WPA2/WPA3_PSK";
    default:                        return "OTHER";
  }
}

const char* getDisconnectReasonText(uint8_t reason) {
  switch (reason) {
    case 1:   return "UNSPECIFIED";
    case 2:   return "AUTH_EXPIRE";
    case 3:   return "AUTH_LEAVE";
    case 4:   return "ASSOC_EXPIRE";
    case 5:   return "ASSOC_TOOMANY";
    case 6:   return "NOT_AUTHED";
    case 7:   return "NOT_ASSOCED";
    case 8:   return "ASSOC_LEAVE";
    case 9:   return "ASSOC_NOT_AUTHED";
    case 13:  return "IE_INVALID";
    case 14:  return "MIC_FAILURE";
    case 15:  return "4WAY_HANDSHAKE_TIMEOUT";
    case 16:  return "GROUP_KEY_UPDATE_TIMEOUT";
    case 23:  return "802_1X_AUTH_FAILED";
    case 36:  return "AUTH_FAIL";
    case 200: return "BEACON_TIMEOUT";
    case 201: return "NO_AP_FOUND";
    case 202: return "AUTH_FAIL";
    case 204: return "HANDSHAKE_TIMEOUT";
    case 205: return "CONNECTION_FAIL";
    default:  return "UNKNOWN";
  }
}

void initWiFiEvents() {
  WiFi.onEvent([](WiFiEvent_t event, WiFiEventInfo_t info) {
    switch (event) {
      case ARDUINO_EVENT_WIFI_STA_GOT_IP:
        wifiState = WIFI_STATE_CONNECTED;
        wifiReconnectCount = 0;
        Serial.printf(
          "[WIFI] Connected | IP: %s | RSSI: %d dBm\n",
          WiFi.localIP().toString().c_str(),
          WiFi.RSSI()
        );
        break;

      case ARDUINO_EVENT_WIFI_STA_DISCONNECTED: {
        wifiState = WIFI_STATE_DISCONNECTED;
        uint8_t reason = info.wifi_sta_disconnected.reason;
        Serial.printf(
          "[WIFI] Disconnected | Reason: %u (%s)\n",
          reason,
          getDisconnectReasonText(reason)
        );
        break;
      }

      default:
        break;
    }
  });
}

void startWiFiConnection() {
  wifiState = WIFI_STATE_CONNECTING;
  lastWifiAttempt = millis();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.println("[WIFI] Starting connection...");
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false);
  WiFi.setSleep(false);
  WiFi.setTxPower(WIFI_POWER_19_5dBm);

  initWiFiEvents();
  startWiFiConnection();
}

void updateWiFi() {
  unsigned long now = millis();
  wl_status_t status = WiFi.status();

  if (status == WL_CONNECTED && wifiState != WIFI_STATE_CONNECTED) {
    wifiState = WIFI_STATE_CONNECTED;
    wifiReconnectCount = 0;
  }

  if (wifiState == WIFI_STATE_CONNECTED && status != WL_CONNECTED) {
    wifiState = WIFI_STATE_DISCONNECTED;
    lastWifiAttempt = now;
  }

  if (wifiState == WIFI_STATE_CONNECTING) {
    if (now - lastWifiAttempt >= WIFI_CONNECT_TIMEOUT) {
      Serial.println("[WIFI] Connection timeout.");
      WiFi.disconnect(false);
      wifiState = WIFI_STATE_DISCONNECTED;
      lastWifiAttempt = now;
    }
    return;
  }

  if (wifiState == WIFI_STATE_DISCONNECTED) {
    if (now - lastWifiAttempt >= WIFI_RETRY_INTERVAL) {
      wifiReconnectCount++;
      Serial.printf("[WIFI] Reconnecting... Attempt: %u\n", wifiReconnectCount);
      startWiFiConnection();
    }
  }
}

void scanWiFiNetworks() {
  if (pumpOn) {
    Serial.println("[SCAN] Rejected: Pump is running.");
    return;
  }

  Serial.println("\n[SCAN] Scanning Wi-Fi networks...");
  int n = WiFi.scanNetworks(false, true);

  if (n < 0) {
    Serial.println("[SCAN] Scan failed.");
  } else if (n == 0) {
    Serial.println("[SCAN] No networks found.");
  } else {
    Serial.printf("[SCAN] Found %d networks:\n", n);
    for (int i = 0; i < n; i++) {
      Serial.printf(
        "[%d] %-20s | Channel: %2d | RSSI: %4d dBm | %s\n",
        i + 1,
        WiFi.SSID(i).c_str(),
        WiFi.channel(i),
        WiFi.RSSI(i),
        getAuthModeName(WiFi.encryptionType(i))
      );
    }
  }

  WiFi.scanDelete();
}

// ==================================================
// 10. DIEU KHIEN MAY BOM & KHOA AN TOAN 30S NGAM
// ==================================================

bool isSoakActive() {
  bool active = false;
  bool justCompleted = false;
  PumpStopReason reason = STOP_REASON_NONE;

  portENTER_CRITICAL(&timerMux);
  if (soakActive) {
    if (soakStartTime == 0 || (millis() - soakStartTime < SOAK_TIME_MS)) {
      active = true;
    } else {
      soakActive = false;
      justCompleted = true;
      reason = lastStopReason;
      lastStopReason = STOP_REASON_NONE;
    }
  }
  portEXIT_CRITICAL(&timerMux);

  if (justCompleted) {
    if (reason == STOP_REASON_SAFETY_LIMIT) {
      Serial.println("[SOAK LOCKOUT] Safety lockout completed. Pump operation is now UNLOCKED.");
    } else {
      Serial.println("[SOAK] 30s soak period completed.");
    }
  }

  return active;
}

void turnPumpOn() {
  bool isLocked = false;
  unsigned long remainingSec = 0;
  PumpStopReason lockReason = STOP_REASON_NONE;

  portENTER_CRITICAL(&timerMux);

  if (pumpOn) {
    portEXIT_CRITICAL(&timerMux);
    Serial.println("[PUMP] Already ON (continuing current 10s runtime without resetting counter).");
    return;
  }

  if (!timerReady) {
    GPIO.out_w1tc = (1UL << PUMP_PIN);
    portEXIT_CRITICAL(&timerMux);
    Serial.println("[PUMP ERROR] Cannot start pump: Hardware timer is not ready or failed.");
    return;
  }

  if (soakActive) {
    if (soakStartTime == 0) {
      isLocked = true;
      remainingSec = SOAK_TIME_MS / 1000;
      lockReason = lastStopReason;
    } else {
      unsigned long elapsedSoak = millis() - soakStartTime;
      if (elapsedSoak < SOAK_TIME_MS) {
        isLocked = true;
        remainingSec = (SOAK_TIME_MS - elapsedSoak) / 1000 + 1;
        lockReason = lastStopReason;
      } else {
        soakActive = false;
      }
    }
  }

  if (isLocked) {
    portEXIT_CRITICAL(&timerMux);
    if (lockReason == STOP_REASON_SAFETY_LIMIT) {
      Serial.printf("[PUMP ERROR] LOCKED: Mandatory 30s safety lockout in progress after 10s cutoff (%lu s remaining).\n", remainingSec);
    } else {
      Serial.printf("[PUMP ERROR] LOCKED: Soil soak period in progress (%lu s remaining).\n", remainingSec);
    }
    return;
  }

  GPIO.out_w1ts = (1UL << PUMP_PIN);
  pumpElapsedMs = 0;
  pumpOn = true;

  portEXIT_CRITICAL(&timerMux);

  Serial.println("[PUMP] ON");
}

void turnPumpOff(PumpStopReason reason) {
  bool wasRunning = false;

  portENTER_CRITICAL(&timerMux);
  GPIO.out_w1tc = (1UL << PUMP_PIN);
  if (pumpOn) {
    wasRunning = true;
    pumpOn = false;
    pumpElapsedMs = 0;
    soakActive = true;
    soakStartTime = millis();
    lastStopReason = reason;
  }
  portEXIT_CRITICAL(&timerMux);

  if (wasRunning) {
    switch (reason) {
      case STOP_REASON_USER_COMMAND:
        Serial.println("[PUMP] OFF | Reason: USER_COMMAND (Tat boi nguoi dung)");
        Serial.println("[SOAK] Started. Waiting 30 seconds.");
        break;

      case STOP_REASON_MOISTURE_TARGET:
        Serial.println("[PUMP] OFF | Reason: MOISTURE_TARGET (Do am dat nguong >= 50.0%)");
        Serial.println("[SOAK] Started. Waiting 30 seconds.");
        break;

      case STOP_REASON_SAFETY_LIMIT:
        Serial.println("[PUMP] OFF | Reason: SAFETY_LIMIT (Vuot gioi han 10s cua Hardware Timer)");
        Serial.println("[SOAK LOCKOUT] Mandatory 30s safety lockout active. Re-triggering LOCKED.");
        break;

      default:
        Serial.println("[PUMP] OFF | Reason: NORMAL");
        break;
    }
  }
}

void syncHardwareSafetyState() {
  bool triggered = false;

  portENTER_CRITICAL(&timerMux);
  if (hardwareSafetyTriggered) {
    hardwareSafetyTriggered = false;
    soakStartTime = millis();
    triggered = true;
  }
  portEXIT_CRITICAL(&timerMux);

  if (triggered) {
    Serial.println("[PUMP] OFF | Reason: SAFETY_LIMIT (Hardware Timer 10s limit cutoff)");
    Serial.println("[SOAK LOCKOUT] Mandatory 30s safety lockout active. All restarts LOCKED.");
  }
}

// ==================================================
// 11. DOC CAM BIEN DO AM DAT
// ==================================================

int readSoilSensor() {
  long total = 0;
  for (int i = 0; i < 10; i++) {
    total += analogRead(SOIL_SENSOR_PIN);
    delayMicroseconds(100);
  }
  return total / 10;
}

void updateMoisture() {
  rawValue = readSoilSensor();

  if (!calibrationReady) {
    moisture = -1.0;
    return;
  }

  moisture = ((float)(rawValue - DRY_RAW) / (float)(WET_RAW - DRY_RAW)) * 100.0;
  moisture = constrain(moisture, 0.0, 100.0);
}

const char* getSoilStatusStr() {
  if (!calibrationReady) return "NOT_CALIBRATED";
  if (moisture < DRY_THRESHOLD) return "DRY";
  if (moisture < WET_THRESHOLD) return "MOIST";
  return "WET";
}

void printSensorData() {
  if (calibrationReady) {
    Serial.printf(
      "[SENSOR] RAW: %d | Moisture: %.1f%% | Status: %s\n",
      rawValue,
      moisture,
      getSoilStatusStr()
    );
  } else {
    Serial.printf(
      "[SENSOR] RAW: %d | Moisture: NOT CALIBRATED\n",
      rawValue
    );
  }
}

// ==================================================
// 12. TUOI NUOC TU DONG (AUTOMATIC IRRIGATION)
// ==================================================

void automaticControl() {
  if (!calibrationReady) {
    return;
  }

  if (!pumpOn && isSoakActive()) {
    return;
  }

  if (!pumpOn && moisture < DRY_THRESHOLD) {
    Serial.println("[AUTO] Soil is dry (< 30.0%). Starting pump.");
    turnPumpOn();
  } else if (pumpOn && moisture >= WET_THRESHOLD) {
    Serial.println("[AUTO] Soil reached wet threshold (>= 50.0%).");
    turnPumpOff(STOP_REASON_MOISTURE_TARGET);
  }
}

// ==================================================
// 13. GUI TELEMETRY QUA HTTP POST
// ==================================================

void sendTelemetry() {
  if (WiFi.status() != WL_CONNECTED || wifiState != WIFI_STATE_CONNECTED) {
    return;
  }

  HTTPClient http;
  String url = "http://" + backendHost + ":" + String(BACKEND_PORT) + TELEMETRY_PATH;

  if (!http.begin(url)) {
    Serial.println("[HTTP] Unable to initialize HTTP client.");
    return;
  }

  http.setConnectTimeout(1000);
  http.setTimeout(1500);
  http.addHeader("Content-Type", "application/json");

  String payload =
    "{\"deviceId\":\"" + String(DEVICE_ID) +
    "\",\"soilMoistureRaw\":" + String(rawValue) + "}";

  int httpCode = http.POST(payload);

  if (httpCode == 201) {
    Serial.println("[HTTP] POST SUCCESS | Status: 201");
  } else if (httpCode > 0) {
    Serial.printf("[HTTP] POST FAILED | Status: %d\n", httpCode);
  } else {
    Serial.printf(
      "[HTTP] POST ERROR | %s\n",
      http.errorToString(httpCode).c_str()
    );
  }

  http.end();
}

// ==================================================
// 14. IN TRANG THAI HE THONG (SYSTEM STATUS)
// ==================================================

const char* getStopReasonName(PumpStopReason reason) {
  switch (reason) {
    case STOP_REASON_USER_COMMAND:    return "USER_COMMAND";
    case STOP_REASON_MOISTURE_TARGET: return "MOISTURE_TARGET";
    case STOP_REASON_SAFETY_LIMIT:    return "SAFETY_LIMIT (10s Hardware Timer)";
    case STOP_REASON_SYSTEM_INIT:     return "SYSTEM_INIT";
    default:                          return "NONE";
  }
}

void printStatus() {
  Serial.println("\n========== SYSTEM STATUS ==========");
  Serial.printf("Mode            : %s\n", currentMode == MANUAL ? "MANUAL" : "AUTOMATIC");
  Serial.printf("Pump            : %s\n", pumpOn ? "ON" : "OFF");
  Serial.printf("Timer Ready     : %s\n", timerReady ? "YES" : "NO (PUMP LOCKED)");
  Serial.printf("Last Stop Reason: %s\n", getStopReasonName(lastStopReason));
  Serial.printf("Soak/Lockout    : %s\n", soakActive ? "ACTIVE (30s)" : "INACTIVE");
  Serial.printf("Calibration     : %s\n", calibrationReady ? "READY" : "NOT READY");
  Serial.printf("Sensor RAW      : %d\n", rawValue);

  if (calibrationReady) {
    Serial.printf("Moisture        : %.1f%%\n", moisture);
  } else {
    Serial.println("Moisture        : NOT CALIBRATED");
  }

  Serial.printf("Soil Status     : %s\n", getSoilStatusStr());
  Serial.printf("Wi-Fi           : %s\n", WiFi.status() == WL_CONNECTED ? "CONNECTED" : "DISCONNECTED");

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("ESP32 IP        : %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("RSSI            : %d dBm\n", WiFi.RSSI());
  }

  Serial.printf("Reconnects      : %u\n", wifiReconnectCount);
  Serial.printf("Device ID       : %s\n", DEVICE_ID);
  Serial.printf("Backend URL     : http://%s:%d%s\n", backendHost.c_str(), BACKEND_PORT, TELEMETRY_PATH);
  Serial.println("===================================\n");
}

// ==================================================
// 15. XU LY LENH SERIAL
// ==================================================

bool updateBackendIP(String newIP) {
  newIP.trim();
  IPAddress parsedIP;

  if (!parsedIP.fromString(newIP)) {
    Serial.println("[ERROR] Invalid IPv4 address. IP unchanged.");
    return false;
  }

  backendHost = parsedIP.toString();
  Serial.printf("[CONFIG] Backend IP updated: %s\n", backendHost.c_str());
  return true;
}

void processSerialCommand(char* input) {
  String command = String(input);
  command.trim();
  command.toUpperCase();

  if (command.length() == 0) {
    return;
  }

  if (command == "ON") {
    currentMode = MANUAL;
    Serial.println("[MODE] MANUAL");
    turnPumpOn();
  } else if (command == "OFF") {
    currentMode = MANUAL;
    turnPumpOff(STOP_REASON_USER_COMMAND);
    Serial.println("[MODE] MANUAL");
  } else if (command == "MANUAL") {
    currentMode = MANUAL;
    turnPumpOff(STOP_REASON_USER_COMMAND);
    Serial.println("[MODE] MANUAL");
  } else if (command == "AUTO") {
    if (!calibrationReady) {
      Serial.println("[ERROR] Sensor calibration required before AUTO.");
      return;
    }
    currentMode = AUTOMATIC;
    Serial.println("[MODE] AUTOMATIC");
  } else if (command.startsWith("IP=")) {
    String newIP = command.substring(3);
    updateBackendIP(newIP);
  } else if (command == "STATUS") {
    printStatus();
  } else if (command == "SCAN") {
    scanWiFiNetworks();
  } else {
    Serial.println("[HELP] Commands: ON | OFF | MANUAL | AUTO | STATUS | SCAN | IP=<host>");
  }
}

void handleSerialCommand() {
  while (Serial.available() > 0) {
    char incoming = Serial.read();

    if (incoming == '\n' || incoming == '\r') {
      if (serialBufferIndex > 0) {
        serialBuffer[serialBufferIndex] = '\0';
        processSerialCommand(serialBuffer);
        serialBufferIndex = 0;
      }
      continue;
    }

    if (serialBufferIndex < sizeof(serialBuffer) - 1) {
      serialBuffer[serialBufferIndex++] = incoming;
    } else {
      serialBufferIndex = 0;
      Serial.println("[ERROR] Serial command too long.");
    }
  }
}

// ==================================================
// 16. KHOI TAO HE THONG (SETUP)
// ==================================================

void setup() {
  Serial.begin(115200);

  pinMode(PUMP_PIN, OUTPUT);
  GPIO.out_w1tc = (1UL << PUMP_PIN);

  pumpOn = false;
  currentMode = MANUAL;
  lastStopReason = STOP_REASON_SYSTEM_INIT;
  soakActive = false;
  soakStartTime = 0;

  Serial.println("\n================================");
  Serial.println("       SMART PLANT SYSTEM");
  Serial.println("================================");
  Serial.println("[SYSTEM] Startup initiated.");
  Serial.println("[SYSTEM] Mode: MANUAL");
  Serial.println("[SYSTEM] Pump: OFF");

  if (!initHardwareSafetyTimer()) {
    Serial.println("[SYSTEM] CRITICAL: Hardware timer failed! Pump is PERMANENTLY LOCKED.");
  }

  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_SENSOR_PIN, ADC_11db);

  calibrationReady = (DRY_RAW > WET_RAW && WET_RAW > 0);

  if (!calibrationReady) {
    Serial.println("[SYSTEM] WARNING: Calibration invalid. AUTO disabled.");
  }

  connectWiFi();
}

// ==================================================
// 17. VONG LAP CHINH (MAIN LOOP)
// ==================================================

void loop() {
  syncHardwareSafetyState();
  isSoakActive();

  handleSerialCommand();

  unsigned long now = millis();

  static unsigned long lastSensorRead = 0;
  if (now - lastSensorRead >= 1000) {
    lastSensorRead = now;
    updateMoisture();
  }

  if (currentMode == AUTOMATIC) {
    automaticControl();
  }

  updateWiFi();

  static unsigned long lastTelemetryCycle = 0;
  if (now - lastTelemetryCycle >= TELEMETRY_INTERVAL) {
    lastTelemetryCycle = now;
    printSensorData();
    sendTelemetry();
  }
}