# homebridge-tasmota-motor

This is a plugin for [homebridge](https://github.com/nfarina/homebridge)

## Example config

```json
    {
      "accessory": "TasmotaMotor2",
      "name": "Window",
      "hostname": "hostname",
      "secondsDown": 5,
      "secondsUp": 5,
      "topicStatusGetUP" : "stat/mqtt-name/POWER2",
      "topicStatusGetDOWN" : "stat/mqtt-name/POWER1"
    },
```