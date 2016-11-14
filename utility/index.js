/**
 * Created by pupboss on 3/11/16.
 */
'use strict';

var config = require('../config');
var model = require('./db');
var room_schedule_parser_v2 = require('../parser/room_schedule_v2');
var constant = require('../agent/constant');
var moment = require('moment');
var async = require('async');
var request = require('request');

var hex_map = {
  '00000': '0',
  '00001': '1',
  '00010': '2',
  '00011': '3',
  '00100': '4',
  '00101': '5',
  '00110': '6',
  '00111': '7',
  '01000': '8',
  '01001': '9',
  '01010': 'a',
  '01011': 'b',
  '01100': 'c',
  '01101': 'd',
  '01110': 'e',
  '01111': 'f',
  '10000': 'g',
  '10001': 'h',
  '10010': 'i',
  '10011': 'j',
  '10100': 'k',
  '10101': 'l',
  '10110': 'm',
  '10111': 'n',
  '11000': 'o',
  '11001': 'p',
  '11010': 'q',
  '11011': 'r',
  '11100': 's',
  '11101': 't',
  '11110': 'u',
  '11111': 'v'
};

var crypto = require('crypto'),
  algorithm = 'aes-256-ctr',
  password = config.secret_key;

function encrypt(text){
  var cipher = crypto.createCipher(algorithm, password);
  var crypted = cipher.update(text, 'utf8', 'hex');
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text){
  var decipher = crypto.createDecipher(algorithm, password);
  var dec = decipher.update(text, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

function parse_hex(binary_str) {
  var result = '';

  for (var i = 0; i < binary_str.length / 5; i++) {
    var temp_str = binary_str.substring(i * 5, (i + 1) * 5);
    result += hex_map[temp_str];
  }
  return result;
}

Date.prototype.addDay = function (num) {

  this.setDate(this.getDate() + parseInt(num));
  return this;
};

function capture_a_building(building, callback) {
  var date = new Date();
  var week_day = date.getDay();
  week_day = week_day == 0 ? 7 : week_day;

  var start_date = moment(config.first_week_monday).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
  var days = moment().diff(start_date, 'days');
  var week = Math.ceil(days / 7);

  room_schedule_parser_v2(config.admin.user_id, config.admin.password, building.location_id, building.building_id, week, week_day, 'teacher/teachresource/roomschedule_week.jsdo', function (err, result) {
    if (err != null) {
      console.log(building.location_id, building.building_id);
      var f_url = 'http://api.smsbao.com/sms?u=' + config.class_admin.sms_user_name + '&p=' + crypto.createHash('md5').update(config.class_admin.sms_password).digest('hex') + '&m=' + config.class_admin.phone + '&c=' + building.building_name + '短信发送失败,因为教务处网站过于卡顿,请手动发送';
      request(f_url, function (error, response, body) {

      });
      callback(null, building);
      return;
    }
    var str = '';
    for (var i = 0; i < 5; i++) {
      for (var j = 0; j < result.results.length; j++) {
        var arr = result.results[j].status;
        str = str + arr[i];
      }
    }
    var url = 'http://api.smsbao.com/sms?u=' + config.class_admin.sms_user_name + '&p=' + crypto.createHash('md5').update(config.class_admin.sms_password).digest('hex') + '&m=' + building.building_phone + '&c=' + parse_hex(str);
    request(url, function (error, response, body) {

    });
    callback(null, null);
  })
}

function send_sms_with_buildings(docs) {
  async.mapLimit(docs, 1, function (doc, callback) {
    capture_a_building(doc, callback);
  }, function (err, results) {
  });
}

var send_sms = function () {
  model.building_model.find({auto_send: '1'}, function (error, docs) {
    if(error || docs.length < 1){
    } else {
      send_sms_with_buildings(docs);
    }
  })
};

module.exports = {
  encrypt: encrypt,
  decrypt: decrypt,
  parse_hex: parse_hex,
  send_sms: send_sms
};
