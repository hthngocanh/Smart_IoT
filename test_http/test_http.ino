
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "htna";
const char* WIFI_PASSWORD = "chu ong nau";

const char* SERVER_URL =
    "http://172.20.10.4:3000/api/v1/health";

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n===== ESP32 HTTP TEST =====");

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    Serial.print("Connecting WiFi");

    unsigned long start = millis();

    while (WiFi.status() != WL_CONNECTED &&
           millis() - start < 20000) {
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

    HTTPClient http;
    http.setTimeout(5000);

    Serial.println("\nSending HTTP GET...");
    http.begin(SERVER_URL);

    int httpCode = http.GET();

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
}

void loop() {
    delay(1000);
}
