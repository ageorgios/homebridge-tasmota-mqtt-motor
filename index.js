var request = require('request');
var rp = require('request-promise-native');
var mqtt = require("mqtt");
var ci = require('correcting-interval')
var Service, Characteristic;

module.exports = function(homebridge){
        Service = homebridge.hap.Service;
        Characteristic = homebridge.hap.Characteristic;
        homebridge.registerAccessory('homebridge-tasmota-mqtt-motor', 'TasmotaMotorMQTT', TasmotaMotorMQTT);
}


function TasmotaMotorMQTT(log, config){

    var finalUpdateTimer = 0
    var ensuring = 0
    var intervalhandle = 0

    this.log = log; // log file
    this.name = config["name"]; 
    this.hostname = config["hostname"];
    this.durationUp = config["secondsUp"];
    this.durationDown = config["secondsDown"];
    this.mqttUrl = config["mqttUrl"] || "localhost";
    this.mqttUsername = config["mqttUsername"] || "";
    this.mqttPassword = config["mqttPassword"] || "";
    this.topicStatusGetUP = config["topicStatusGetUP"];
    this.topicStatusGetDOWN = config["topicStatusGetDOWN"];

    this.lastPosition = 0; // Last known position, (0-100%)
    this.currentPositionState = 2; // 2 = Stopped , 1=Moving Up , 0=Moving Down.
    this.currentTargetPosition = 0; //  Target Position, (0-100%)

    var url = 'http://' + this.hostname + '/cm?cmnd=setoption14%201'
    this.log("Ensuring Tasmota Interlocking:  " + url);                    
    rp({uri: url, json: true, timeout: 10000})
    .then((json)=> {
        this.log("Interlocking result: " + JSON.stringify(json));
    })
    .catch((error)=> {
        this.ensuring++
        this.log("Error communicating to: " + url, error);
        this.log("ERROR CONFIGURING HOMEKIT DEVICE" + this.name); 
    })

    var url = 'http://' + this.hostname + '/cm?cmnd=setoption13%201'
    this.log("Ensuring Tasmota Touch Switch:  " + url);                    
    rp({uri: url, json: true, timeout: 10000})
    .then((json)=> {
        this.log("Touch Switch result: " + JSON.stringify(json));
    })
    .catch((error)=> {
        this.ensuring++
        this.log("Error communicating to: " + url, error);
        this.log("ERROR CONFIGURING HOMEKIT DEVICE" + this.name); 
    })

    var url = 'http://' + this.hostname + '/cm?cmnd=backlog%20setoption0%200;PowerOnState%200'
    this.log("Ensuring Powered Off on Restart:  " + url);                    
    rp({uri: url, json: true, timeout: 10000})
    .then((json)=> {
        this.log("Powered Off on Restart result: " + JSON.stringify(json));
    })
    .catch((error)=> {
        this.ensuring++
        this.log("Error communicating to: " + url, error);
        this.log("ERROR CONFIGURING HOMEKIT DEVICE" + this.name); 
    })

    var pulsetimeUP = 12, pulsetimeDOWN = 12
    if (this.durationUp < 12) pulsetimeUP = this.durationUp * 10; else pulsetimeUP = this.durationUp + 100
    if (this.durationDown < 12) pulsetimeDOWN = this.durationDown * 10; else pulsetimeDOWN = this.durationDown + 100
    var url = 'http://' + this.hostname + '/cm?cmnd=backlog%20pulsetime1%20' + pulsetimeUP + ';pulsetime2%20' + pulsetimeDOWN
    this.log("Ensuring PulseTime:  " + url);                    
    rp({uri: url, json: true, timeout: 10000})
    .then((json)=> {
        this.log("PulseTime result: " + JSON.stringify(json));
    })
    .catch((error)=> {
        this.ensuring++
        this.log("Error communicating to: " + url, error);
        this.log("ERROR CONFIGURING HOMEKIT DEVICE " + this.name + " IT WILL NOT RESPOND TO ACTIONS"); 
    })
    
    this.infoService = new Service.AccessoryInformation();
    this.infoService
        .setCharacteristic(Characteristic.Manufacturer, "Sonoff")
        .setCharacteristic(Characteristic.Model, "Sonoff T1 Motor")
        .setCharacteristic(Characteristic.SerialNumber, "Version 1.0.0");
    
    this.service = new Service.Window(this.name);
    this.service
            .getCharacteristic(Characteristic.CurrentPosition)
            .on('get', this.getCurrentPosition.bind(this));
    this.service
            .getCharacteristic(Characteristic.PositionState)
            .on('get', this.getPositionState.bind(this));
    this.service
            .getCharacteristic(Characteristic.TargetPosition)
            .on('get', this.getTargetPosition.bind(this))
            .on('set', this.setTargetPosition.bind(this));
            
    this.client_Id = 'Homebridge_TasmotaMotorMQTT_' + Math.random().toString(16).substr(2, 8);
    this.mqttOptions = {
      keepalive: 10,
      clientId: this.client_Id,
      protocol: 'MQTT',
      protocolVersion: 4,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
      will: {
        topic: 'WillMsg',
        payload: 'Connection Closed abnormally..!',
        qos: 0,
        retain: false
      },
      username: config["username"],
      password: config["password"],
      rejectUnauthorized: false
    };
            
    this.client = mqtt.connect(this.mqttUrl, this.mqttOptions);
    var that = this;
    this.client.on('error', function() {
      that.log('Error event on MQTT');
    });
    this.client.on('connect', function(error) {
        if (error)
        that.log("Connected to MQTT at ",this.mqttUrl);
        setTimeout(function() {that.client.subscribe(that.topicStatusGetUP)},1000)
        setTimeout(function() {that.client.subscribe(that.topicStatusGetDOWN)},1000)
    });
    this.client.on('message', function(topic, message) {
      that.log(topic + " message received = " + message);
      if (message == "ON") {
         that.currentPositionState = (topic == that.topicStatusGetUP ? 1 : 0)
         var dur = (topic == that.topicStatusGetUP ? that.durationUp : that.durationDown)
         that.service.setCharacteristic(Characteristic.PositionState, that.currentPositionState);
         // that.log("setCharacteristic PositionState = " + that.currentPositionState);
         that.intervalhandle = ci.setCorrectingInterval(function() {
           (topic == that.topicStatusGetUP ? that.lastPosition++ : that.lastPosition--)
            if (that.lastPosition >= 100) that.lastPosition = 100
            if (that.lastPosition <= 0) that.lastPosition = 0
            // that.log("time passed: Setting CurrentPosition " + that.lastPosition)
            that.currentTargetPosition = that.lastPosition
            that.service.getCharacteristic(Characteristic.TargetPosition).updateValue(that.currentTargetPosition);
            that.service.setCharacteristic(Characteristic.CurrentPosition, that.lastPosition);
         }, dur*10);
      }
      if (message == "OFF") { 
        ci.clearCorrectingInterval(that.intervalhandle); 
        that.intervalhandle = 0; 
        if (that.currentTargetPosition >= 95) that.currentTargetPosition = 100
        if (that.currentTargetPosition <= 5) that.currentTargetPosition = 0
        that.lastPosition = that.currentTargetPosition
        that.log("lastPosition = " + that.lastPosition + " PositionState = " + that.currentPositionState + " currentTargetPosition = " + that.currentTargetPosition);
        that.service.setCharacteristic(Characteristic.CurrentPosition, that.lastPosition);
        that.service.getCharacteristic(Characteristic.TargetPosition).updateValue(that.currentTargetPosition);
        that.currentPositionState = 2;
        that.service.setCharacteristic(Characteristic.PositionState, that.currentPositionState);
      }
    });
}

TasmotaMotorMQTT.prototype.getCurrentPosition = function(callback) {
    this.log("Requested CurrentPosition: %s", this.lastPosition);
    callback(null, this.lastPosition);
}

TasmotaMotorMQTT.prototype.getPositionState = function(callback) {
    this.log("Requested PositionState: %s", this.currentPositionState);
    callback(null, this.currentPositionState);
}

TasmotaMotorMQTT.prototype.getTargetPosition = function(callback) {
    this.log("Requested TargetPosition: %s", this.currentTargetPosition);
    callback(null, this.currentTargetPosition);
}

TasmotaMotorMQTT.prototype.setTargetPosition = function(pos, callback) {
  
  this.log("Setting target position to %s", pos);
  if (this.ensuring < 4) {
    this.log("Did not ensure that Tasmota Options are set. Please make homebridge available when Tasmota is already POWERED ON");
    callback("Did not ensure that Tasmota Options are set.");
    return false;
  }

  if (this.currentPositionState != 2) {
    this.log("Blinds are moving. You need to wait. I will do nothing.");
    callback();
    return false;
  }
  
  if (this.lastPosition == pos) {
    this.log("Current position already matches target position. There is nothing to do.");
    callback();
    return true;
  }

  this.currentTargetPosition = pos;
  var duration;
  var move = (this.currentTargetPosition > this.lastPosition);
  if (move) {
    duration = (this.currentTargetPosition - this.lastPosition) / 100 ;
    duration = duration * this.durationUp
  } else {
    duration = (this.lastPosition - this.currentTargetPosition) / 100;
    duration = duration * this.durationDown
  }

  // this.log("Duration: %s s", duration.toFixed(1));

  var that = this
  this.httpRequest(move, duration, function(err) {
    if(err) return callback(err);
    that.state_homekit_command = 0
    that.log(move ? "Moving up " + duration.toFixed(1) + "s" : "Moving down " + duration.toFixed(1) + "s");
    callback()
  });

  return true;
}

TasmotaMotorMQTT.prototype.httpRequest = function(move, duration, callback){
  var url, pulsetime, delay = 2
  if (duration < 12) { 
    duration = duration * 10;
    if (duration > 2) delay = duration
  }
  else {
    delay = duration * 10
    duration = duration + 100
  }
  if (move) {
      if (this.durationUp < 12) pulsetime = this.durationUp * 10; else pulsetime = this.durationUp + 100
  }
  else {
      if (this.durationDown < 12) pulsetime = this.durationDown * 10; else pulsetime = this.durationDown + 100
  }
  var m = move ? 2 : 1
  url = 'http://' + this.hostname + '/cm?cmnd=backlog%20pulsetime'+m+'%20'+duration.toFixed(0)+';power'+m+'%20on;delay%20'+delay.toFixed(0)+';pulsetime'+m+'%20'+pulsetime.toFixed(0)
  this.log("Sonoff link for moving blinds:  " + url);                    
  request.get({ url: url,  }, function(err, response, body) {
    if (!err && response && response.statusCode == 200) {
      return callback(null);
    } else {
      this.log("Error communicating to: " + url, err);
      return callback(err);
    }
  }.bind(this));
}

TasmotaMotorMQTT.prototype.getServices = function() {
  return [this.infoService, this.service];
}