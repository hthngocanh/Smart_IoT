
#include "DHT.h"

#define DHTPIN 27
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);

  dht.begin();

  Serial.println("Starting DHT11 test...");
  delay(2000);
}

void loop() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("ERROR: Cannot read DHT11!");
  } else {
    Serial.println("========== DHT11 ==========");
    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.println(" *C");

    Serial.print("Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");

    Serial.println("===========================");
  }

  delay(2000);
}
