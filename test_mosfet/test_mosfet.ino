
#define SOIL_SENSOR_PIN 34
#define PUMP_PIN 26

void setup() {
  Serial.begin(115200);

  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, LOW); // Mặc định tắt bơm

  Serial.println("ESP32 - MOSFET PUMP TEST");
  Serial.println("Nhap ON de bat bom");
  Serial.println("Nhap OFF de tat bom");
}

void loop() {
  int rawValue = analogRead(SOIL_SENSOR_PIN);
  float voltage = rawValue * 3.3 / 4095.0;

  Serial.print("Raw: ");
  Serial.print(rawValue);
  Serial.print(" | Voltage: ");
  Serial.print(voltage, 3);
  Serial.println(" V");

  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    command.toUpperCase();

    if (command == "ON") {
      digitalWrite(PUMP_PIN, HIGH);
      Serial.println("PUMP: ON");
    }
    else if (command == "OFF") {
      digitalWrite(PUMP_PIN, LOW);
      Serial.println("PUMP: OFF");
    }
  }

  delay(500);
}
