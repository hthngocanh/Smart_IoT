
#define SOIL_SENSOR_PIN 34

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);

  Serial.println("===== SMART PLANT IOT =====");
  Serial.println("Soil Moisture Sensor Test");
}

void loop() {
  int rawValue = analogRead(SOIL_SENSOR_PIN);
  float voltage = rawValue * 3.3 / 4095.0;

  Serial.print("Raw Value: ");
  Serial.print(rawValue);

  Serial.print(" | Voltage: ");
  Serial.print(voltage, 3);

  Serial.println(" V");

  delay(1000);
}
