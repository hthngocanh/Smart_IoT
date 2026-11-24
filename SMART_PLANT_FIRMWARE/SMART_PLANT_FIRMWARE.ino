/*
 * ============================================================
 * SMART PLANT - ESP32 FIRMWARE
 * Giai doan 3: Doc cam bien va dieu khien bom
 *
 * GPIO34: Cam bien do am dat (analog)
 * GPIO26: Tin hieu dieu khien module MOSFET
 *
 * Luu y:
 * - Chua hieu chuan cam bien nen chua cho phep AUTO.
 * - Bom tu dong tat sau toi da 10 giay moi lan bat.
 * - HIGH = BAT BOM, LOW = TAT BOM (theo lan test phan cung).
 * ============================================================
 */

#include <Arduino.h>

// ==================== CAU HINH CHAN ====================

const int SOIL_SENSOR_PIN = 34;
const int PUMP_PIN = 26;


// ==================== CAU HINH AN TOAN ====================

const unsigned long SENSOR_INTERVAL_MS = 1000;
const unsigned long PUMP_MAX_RUNTIME_MS = 10000;

// Chua hieu chuan cam bien, tam thoi de false.
// Chi doi thanh true sau khi da hieu chuan va kiem tra lai.
const bool CALIBRATION_READY = false;

// ==================== TRANG THAI HE THONG ====================

enum OperatingMode {
  MANUAL_MODE,
  AUTO_MODE
};

OperatingMode currentMode = MANUAL_MODE;

bool pumpIsOn = false;

unsigned long pumpStartedAt = 0;
unsigned long lastSensorReadAt = 0;

int soilRawValue = 0;

// ==================== DIEU KHIEN BOM ====================

void turnPumpOn() {
  if (pumpIsOn) {
    Serial.println("[INFO] Bom dang bat.");
    return;
  }

  digitalWrite(PUMP_PIN, HIGH);

  pumpIsOn = true;
  pumpStartedAt = millis();

  Serial.println("[PUMP] ON");
}

void turnPumpOff() {
  digitalWrite(PUMP_PIN, LOW);

  if (pumpIsOn) {
    Serial.println("[PUMP] OFF");
  }

  pumpIsOn = false;
}

// ==================== DOC CAM BIEN ====================

int readSoilSensor() {
  const int SAMPLE_COUNT = 10;
  long total = 0;

  for (int i = 0; i < SAMPLE_COUNT; i++) {
    total += analogRead(SOIL_SENSOR_PIN);
  }

  return total / SAMPLE_COUNT;
}

void updateSensor() {
  unsigned long now = millis();

  if (now - lastSensorReadAt < SENSOR_INTERVAL_MS) {
    return;
  }

  lastSensorReadAt = now;
  soilRawValue = readSoilSensor();

  Serial.print("[SENSOR] Soil RAW: ");
  Serial.println(soilRawValue);
}

// ==================== BAO VE BOM ====================

void checkPumpSafety() {
  if (!pumpIsOn) {
    return;
  }

  unsigned long runningTime = millis() - pumpStartedAt;

  if (runningTime >= PUMP_MAX_RUNTIME_MS) {
    Serial.println("[SAFETY] Bom da chay toi da 10 giay.");
    turnPumpOff();
  }
}

// ==================== CHE DO TU DONG ====================

void automaticControl() {
  // Chua hieu chuan thi khong cho phep tu dong.
  if (!CALIBRATION_READY) {
    return;
  }

  /*
   * Se bo sung logic AUTO sau khi hieu chuan:
   * - Do am duoi nguong kho: bat bom.
   * - Do am dat nguong du: tat bom.
   * - Co thoi gian cho nuoc tham vao dat.
   *
   * Khong tu y bat AUTO khi chua co gia tri hieu chuan.
   */
}

// ==================== HIEN THI TRANG THAI ====================

void printStatus() {
  Serial.println();
  Serial.println("========== SMART PLANT ==========");

  Serial.print("Mode: ");
  Serial.println(
    currentMode == MANUAL_MODE ? "MANUAL" : "AUTO"
  );

  Serial.print("Pump: ");
  Serial.println(pumpIsOn ? "ON" : "OFF");

  Serial.print("Soil RAW: ");
  Serial.println(soilRawValue);

  Serial.print("Calibration: ");
  Serial.println(CALIBRATION_READY ? "READY" : "NOT READY");

  Serial.println("=================================");
  Serial.println();
}

// ==================== XU LY LENH SERIAL ====================

void handleSerialCommand() {
  if (!Serial.available()) {
    return;
  }

  String command = Serial.readStringUntil('\n');
  command.trim();
  command.toUpperCase();

  if (command == "ON") {
    currentMode = MANUAL_MODE;
    turnPumpOn();
  }
  else if (command == "OFF") {
    currentMode = MANUAL_MODE;
    turnPumpOff();
  }
  else if (command == "MANUAL") {
    currentMode = MANUAL_MODE;
    turnPumpOff();

    Serial.println("[MODE] MANUAL");
  }
  else if (command == "AUTO") {
    if (!CALIBRATION_READY) {
      Serial.println(
        "[ERROR] Chua hieu chuan cam bien. AUTO bi khoa."
      );
    }
    else {
      currentMode = AUTO_MODE;
      turnPumpOff();

      Serial.println("[MODE] AUTO");
    }
  }
  else if (command == "STATUS") {
    printStatus();
  }
  else if (command.length() > 0) {
    Serial.println("[ERROR] Lenh khong hop le.");
    Serial.println("Lenh: ON, OFF, MANUAL, AUTO, STATUS");
  }
}

// ==================== SETUP ====================

void setup() {
  Serial.begin(115200);

  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, LOW);

  analogReadResolution(12);

  currentMode = MANUAL_MODE;
  pumpIsOn = false;

  Serial.println();
  Serial.println("SMART PLANT - FIRMWARE STARTED");

  Serial.println("Pump: OFF");
  Serial.println("Mode: MANUAL");

  if (!CALIBRATION_READY) {
    Serial.println("Calibration: NOT READY");
    Serial.println("Automatic irrigation is locked.");
  }

  Serial.println();
  Serial.println("Available commands:");
  Serial.println("ON");
  Serial.println("OFF");
  Serial.println("MANUAL");
  Serial.println("AUTO");
  Serial.println("STATUS");
  Serial.println();
}

// ==================== MAIN LOOP ====================

void loop() {
  handleSerialCommand();

  updateSensor();

  checkPumpSafety();

  if (currentMode == AUTO_MODE) {
    automaticControl();
  }
}