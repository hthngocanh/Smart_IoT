#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ===== WIFI =====
const char* WIFI_SSID = "htna";
const char* WIFI_PASSWORD = "chu ong nau";

// ===== BACKEND =====
const char* SERVER_URL =
  "http://172.20.10.4:3000/api/v1/telemetry";

// ===== DEVICE =====
const char* DEVICE_ID = "ESP32_001";

// ===== SENSOR =====
#define SOIL_SENSOR_PIN 34

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n===== ESP32 HTTP POST TEST =====");

  // 1. Đọc cảm biến
  analogReadResolution(12);

  int rawValue = analogRead(SOIL_SENSOR_PIN);

  Serial.print("Soil RAW: ");
  Serial.println(rawValue);

  // 2. Kết nối Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting WiFi");

  unsigned long startTime = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - startTime < 20000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWiFi connection FAILED");
    return;
  }

  Serial.println("\nWiFi connected!");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  // 3. Tạo JSON
  String jsonPayload = "{";
  jsonPayload += "\"deviceId\":\"";
  jsonPayload += DEVICE_ID;
  jsonPayload += "\",";
  jsonPayload += "\"soilMoistureRaw\":";
  jsonPayload += String(rawValue);
  jsonPayload += "}";

  Serial.println("\nJSON Payload:");
  Serial.println(jsonPayload);

  // 4. Gửi HTTP POST
  HTTPClient http;
  http.setTimeout(10000);

  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  Serial.println("\nSending HTTP POST...");

  int httpCode = http.POST(jsonPayload);

  Serial.print("HTTP Status: ");
  Serial.println(httpCode);

  if (httpCode > 0) {
    Serial.println("Server Response:");
    Serial.println(http.getString());
  } else {
    Serial.print("HTTP Error: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();

  Serial.println("\n===== TEST FINISHED =====");
}

void loop() {
  // Chỉ gửi một lần để tránh tạo nhiều bản ghi thử nghiệm.
  delay(1000);
}