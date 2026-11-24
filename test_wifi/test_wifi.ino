/*
 * ESP32 Wi-Fi Connection Diagnostic & Test
 * Bo mach: ESP32 DevKit V1
 * Muc tieu: Chan doan qua trinh L2 Connected va cap phat IP qua DHCP
 */

#include <Arduino.h>
#include <WiFi.h>

// ==========================================
// 1. CAU HINH WI-FI
// ==========================================

const char* WIFI_SSID = "htna";
const char* WIFI_PASSWORD = "chu ong nau";

// ==========================================
// 2. BIEN TRANG THAI VA THOI GIAN
// ==========================================

bool isConnectedL2 = false;
bool hasGotIP = false;
unsigned long connectStartTime = 0;
unsigned long lastStatusPrint = 0;

// ==========================================
// 3. CAC HAM TRO GIUP CHAN DOAN
// ==========================================

const char* getWiFiStatusName(wl_status_t status) {
  switch (status) {
    case WL_NO_SHIELD:        return "WL_NO_SHIELD (255)";
    case WL_IDLE_STATUS:      return "WL_IDLE_STATUS (0 - Dang cho/Khoi dong)";
    case WL_NO_SSID_AVAIL:    return "WL_NO_SSID_AVAIL (1 - Khong tim thay SSID)";
    case WL_SCAN_COMPLETED:   return "WL_SCAN_COMPLETED (2 - Da quet xong)";
    case WL_CONNECTED:        return "WL_CONNECTED (3 - Da ket noi)";
    case WL_CONNECT_FAILED:   return "WL_CONNECT_FAILED (4 - Ket noi that bai)";
    case WL_CONNECTION_LOST:  return "WL_CONNECTION_LOST (5 - Mat ket noi)";
    case WL_DISCONNECTED:     return "WL_DISCONNECTED (6 - Ngat ket noi)";
    default:                  return "UNKNOWN";
  }
}

const char* getDisconnectReasonText(uint8_t reason) {
  switch (reason) {
    case 1:   return "UNSPECIFIED (Loi chung chua xac dinh)";
    case 2:   return "AUTH_EXPIRE (Het han xac thuc / Khong nhan duoc phan hoi xac thuc)";
    case 3:   return "AUTH_LEAVE";
    case 4:   return "ASSOC_EXPIRE";
    case 5:   return "ASSOC_TOOMANY";
    case 6:   return "NOT_AUTHED";
    case 7:   return "NOT_ASSOCED";
    case 8:   return "ASSOC_LEAVE";
    case 9:   return "ASSOC_NOT_AUTHED";
    case 13:  return "IE_INVALID";
    case 14:  return "MIC_FAILURE";
    case 15:  return "4WAY_HANDSHAKE_TIMEOUT (Qua thoi gian bat tay 4 buoc)";
    case 16:  return "GROUP_KEY_UPDATE_TIMEOUT";
    case 23:  return "802_1X_AUTH_FAILED";
    case 36:  return "AUTH_FAIL (Xac thuc that bai cap IEEE 802.11)";
    case 200: return "BEACON_TIMEOUT (Mat goi tin beacon tu AP)";
    case 201: return "NO_AP_FOUND (Khong tim thay Access Point voi SSID muc tieu)";
    case 202: return "AUTH_FAIL (Xac thuc that bai)";
    case 204: return "HANDSHAKE_TIMEOUT (Qua thoi gian bat tay)";
    case 205: return "CONNECTION_FAIL";
    default:  return "MA_LOI_KHAC";
  }
}

// ==========================================
// 4. BO LANG NGHE SU KIEN WI-FI EVENT
// ==========================================

void setupWiFiEvents() {
  WiFi.onEvent([](WiFiEvent_t event, WiFiEventInfo_t info) {
    switch (event) {
      case ARDUINO_EVENT_WIFI_STA_START:
        Serial.println("[EVENT] ARDUINO_EVENT_WIFI_STA_START: Wi-Fi STA san sang.");
        break;

      case ARDUINO_EVENT_WIFI_STA_CONNECTED:
        isConnectedL2 = true;
        Serial.println("\n----------------------------------------");
        Serial.println("[EVENT] ARDUINO_EVENT_WIFI_STA_CONNECTED");
        Serial.println("  -> Da ket noi L2 Link toi Access Point!");
        Serial.println("  -> Dang cho DHCP Server cap phat dia chi IP...");
        Serial.println("----------------------------------------\n");
        break;

      case ARDUINO_EVENT_WIFI_STA_GOT_IP:
        hasGotIP = true;
        Serial.println("\n========================================");
        Serial.println("   [EVENT] ARDUINO_EVENT_WIFI_STA_GOT_IP");
        Serial.println("   ESP32 DA NHAN DUOC IP THANH CONG!");
        Serial.println("========================================");
        Serial.printf("  SSID       : %s\n", WiFi.SSID().c_str());
        Serial.printf("  IP Address : %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("  Gateway    : %s\n", WiFi.gatewayIP().toString().c_str());
        Serial.printf("  Subnet Mask: %s\n", WiFi.subnetMask().toString().c_str());
        Serial.printf("  DNS IP     : %s\n", WiFi.dnsIP().toString().c_str());
        Serial.printf("  RSSI (Song): %d dBm\n", WiFi.RSSI());
        Serial.println("========================================\n");
        break;

      case ARDUINO_EVENT_WIFI_STA_DISCONNECTED: {
        isConnectedL2 = false;
        hasGotIP = false;
        uint8_t reason = info.wifi_sta_disconnected.reason;
        Serial.printf("[EVENT] ARDUINO_EVENT_WIFI_STA_DISCONNECTED! Reason code: %d - %s\n",
                      reason, getDisconnectReasonText(reason));
        break;
      }

      default:
        break;
    }
  });
}

// ==========================================
// 5. SETUP VA LOOP
// ==========================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================");
  Serial.println("   ESP32 WI-FI DHCP DIAGNOSTIC TEST");
  Serial.println("========================================");

  // 1. Cau hinh che do Station mot lan duy nhat khi khoi dong
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true); // De driver ESP-IDF tu dong giu ket noi
  WiFi.setSleep(false);        // Tat Modem Sleep de duy tri transceiver luon hoat dong
  WiFi.setTxPower(WIFI_POWER_19_5dBm);

  // 2. Dang ky Wi-Fi Event Handler truoc khi bat dau ket noi
  setupWiFiEvents();

  // 3. Chi goi WiFi.begin() duy nhat mot lan sau khi khoi dong
  Serial.printf("\n[WIFI] Goi WiFi.begin() toi SSID: '%s'...\n", WIFI_SSID);
  connectStartTime = millis();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void loop() {
  unsigned long now = millis();

  // Moi 5 giay in WiFi.status(), WiFi.localIP() va trang thai ket noi
  if (now - lastStatusPrint >= 5000) {
    lastStatusPrint = now;
    unsigned long elapsedSec = (now - connectStartTime) / 1000;

    Serial.printf("[T+%lus] Status: %-32s | IP: %-15s | L2: %s | GOT_IP: %s\n",
                  elapsedSec,
                  getWiFiStatusName(WiFi.status()),
                  WiFi.localIP().toString().c_str(),
                  isConnectedL2 ? "YES" : "NO",
                  hasGotIP ? "YES" : "NO");
  }
}
