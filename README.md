# homebridge-tasmota-mqtt-motor

This is a plugin for [homebridge](https://github.com/nfarina/homebridge) to interface with [Tasmota Firmware](https://github.com/arendst/Sonoff-Tasmota) 

Uses HTTP for sending commands and MQTT for listening for button presses and updating state

Switch2 is used for going UP, Switch1 is used for going DOWN

Before starting homebridge, sonoff has to be online to ensure some tasmota options (with http), else it doesnt accept commands.

## Requirements

A Sonoff with Tasmota firmware (like a Sonoff T1 2CH) v5.11+


Homebridge Server

MQTT Server

Configure Tasmota to connect to the MQTT server

Tasmota + Homebridge + MQTT should be on the same LAN

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