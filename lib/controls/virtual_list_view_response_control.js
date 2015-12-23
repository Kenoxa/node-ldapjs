var assert = require('assert-plus');
var util = require('util');

var asn1 = require('asn1');

var Control = require('./control');

var CODES = require('../errors/codes');


///--- Globals

var BerReader = asn1.BerReader;
var BerWriter = asn1.BerWriter;

var VALID_CODES = [
  CODES.LDAP_SUCCESS,
  CODES.LDAP_OPERATIONS_ERROR,
  CODES.LDAP_PROTOCOL_ERROR,
  CODES.LDAP_TIME_LIMIT_EXCEEDED,
  CODES.LDAP_STRONG_AUTH_REQUIRED,
  CODES.LDAP_ADMIN_LIMIT_EXCEEDED,
  CODES.LDAP_NO_SUCH_ATTRIBUTE,
  CODES.LDAP_INAPPROPRIATE_MATCHING,
  CODES.LDAP_INSUFFICIENT_ACCESS_RIGHTS,
  CODES.LDAP_SORT_CONTROL_MISSING,
  CODES.LDAP_OFFSET_RANGE_ERROR,
  CODES.LDAP_BUSY,
  CODES.LDAP_UNWILLING_TO_PERFORM,
  CODES.LDAP_OTHER
];

///--- API

function VirtualListViewResponseControl(options) {
  assert.optionalObject(options);
  options = options || {};
  options.type = VirtualListViewResponseControl.OID;
  options.criticality = false;

  if (options.value) {
    if (Buffer.isBuffer(options.value)) {
      this.parse(options.value);
    } else if (typeof (options.value) === 'object') {
      if (VALID_CODES.indexOf(options.value.result) === -1) {
        throw new Error('Invalid result code: ' + options.value.result);
      }
      this._value = options.value;
    } else {
      throw new TypeError('options.value must be a Buffer or Object');
    }
    options.value = null;
  }
  Control.call(this, options);
}
util.inherits(VirtualListViewResponseControl, Control);
Object.defineProperties(VirtualListViewResponseControl.prototype, {
  value: {
    get: function () { return this._value || {}; },
    configurable: false
  }
});
module.exports = VirtualListViewResponseControl;


VirtualListViewResponseControl.prototype.parse = function parse(buffer) {
  assert.ok(buffer);
  var ber = new BerReader(buffer);
  if (!ber.readSequence()) {
    return false;
  }
  this._value = {};
  this._value.targetOffset = ber.readInt();
  this._value.contentCount = ber.readInt();
  this._value.result = ber.readEnumeration();
  if (ber.peek() === asn1.Ber.OctetString) {
    this._value.contextID = ber.readString(asn1.Ber.OctetString, true);
  }
  if (!this._value.contextID) {
    this._value.contextID = new Buffer(0);
  }
  return true;
};


VirtualListViewResponseControl.prototype._toBer = function (ber) {
  assert.ok(ber);
  if (!this._value) {
    return;
  }
  var writer = new BerWriter();
  writer.startSequence();
  writer.writeInt(+this._value.targetOffset || 0);
  writer.writeInt(+this._value.contentCount || 0);
  writer.writeEnumeration(+this._value.result || 0)
  if (this._value.contextID && this._value.contextID.length) {
    writer.writeBuffer(this._value.contextID, asn1.Ber.OctetString);
  }
  writer.endSequence();
  ber.writeBuffer(writer.buffer, 0x04);
};


VirtualListViewResponseControl.prototype._json = function (obj) {
  obj.controlValue = this.value;
  return obj;
};


VirtualListViewResponseControl.OID = '2.16.840.1.113730.3.4.10';
