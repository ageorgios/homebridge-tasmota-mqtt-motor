# homebridge-tasmota-mqtt-motor

This is a plugin for [homebridge](https://github.com/nfarina/homebridge)
Needs MQTT Server and Tasmota v5.12.0 and up

## Example config

```json
    {
      "accessory": "TasmotaMotorMQTT",
      "name": "Window",
      "hostname": "sonoff-7442",
      "secondsDown": 20,
      "secondsUp": 20,
      "topicStatusGetUP" : "stat/sonoff-7442/POWER2",
      "topicStatusGetDOWN" : "stat/sonoff-7442/POWER1"
    },
```