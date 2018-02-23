# homebridge-tasmota-motor

This is a plugin for [homebridge](https://github.com/nfarina/homebridge)

## Example config

```json
    {
      "accessory": "TasmotaMotor2",
      "name": "Blanket-Window",
      "hostname": "sonoff-blanket",
      "secondsDown": 5,
      "secondsUp": 5,
      "topicStatusGetUP" : "stat/sonoff-blanket/POWER2",
      "topicStatusGetDOWN" : "stat/sonoff-blanket/POWER1"
    },
```