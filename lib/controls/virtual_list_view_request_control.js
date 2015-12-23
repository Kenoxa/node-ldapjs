var assert = require('assert-plus');
var util = require('util');

var asn1 = require('asn1');

var Control = require('./control');



///--- Globals

var BerReader = asn1.BerReader;
var BerWriter = asn1.BerWriter;

/*
 * The BER type that will be used for the target element when the target is specified by offset.
 */
var TARGET_TYPE_OFFSET = 0xa0;

/*
 * The BER type that will be used for the target element when the target is specified by an assertion value.
 */
var TARGET_TYPE_GREATER_OR_EQUAL = 0x81;


///--- API

function VirtualListViewRequestControl(options) {
  assert.optionalObject(options);
  options = options || {};
  options.type = VirtualListViewRequestControl.OID;

  if (options.value) {
    if (Buffer.isBuffer(options.value)) {
      this.parse(options.value);
    } else if (typeof (options.value) === 'object') {
      this._value = options.value;
    } else {
      throw new TypeError('options.value must be a Buffer or Object');
    }
    options.value = null;
  }
  Control.call(this, options);
}
util.inherits(VirtualListViewRequestControl, Control);
Object.defineProperties(VirtualListViewRequestControl.prototype, {
  value: {
    get: function () { return this._value || {}; },
    configurable: false
  }
});
module.exports = VirtualListViewRequestControl;


VirtualListViewRequestControl.prototype.parse = function parse(buffer) {
  assert.ok(buffer);
  var ber = new BerReader(buffer);
  if (!ber.readSequence()) {
    return false;
  }
  this._value = {};
  try {
    this._value.beforeCount = ber.readInt();
    this._value.afterCount = ber.readInt();
    if (ber.peek() === TARGET_TYPE_GREATER_OR_EQUAL) {
      this._value.assertionValue = ber.readString(TARGET_TYPE_GREATER_OR_EQUAL, true);
      if (!this._value.assertionValue) {
        this._value.assertionValue = new Buffer(0);
      }
    } else if (ber.peek() === TARGET_TYPE_OFFSET) {
      ber.readSequence(TARGET_TYPE_OFFSET);
      this._value.targetOffset = ber.readInt();
      this._value.contentCount = ber.readInt();
    }
    if (ber.peek() === asn1.Ber.OctetString) {
      this._value.contextID = ber.readString(asn1.Ber.OctetString, true);
    }
    if (!this._value.contextID) {
      this._value.contextID = new Buffer(0);
    }
  } catch (err) {
    console.log(ber.offset, ber.buffer)
    throw err
  }
  return true;
};


VirtualListViewRequestControl.prototype._toBer = function (ber) {
  assert.ok(ber);
  if (!this._value) {
    return;
  }
  var writer = new BerWriter();
  writer.startSequence(0x30);
  writer.writeInt(+this._value.beforeCount || 0);
  writer.writeInt(+this._value.afterCount || 0);
  if (this._value.assertionValue && this._value.assertionValue.length) {
    writer.writeBuffer(this._value.assertionValue, TARGET_TYPE_GREATER_OR_EQUAL);
  } else {
    writer.startSequence(TARGET_TYPE_OFFSET);
    writer.writeInt(+this._value.targetOffset || 1);
    writer.writeInt(+this._value.contentCount || 0);
    writer.endSequence();
  }

  if (this._value.contextID && this._value.contextID.length) {
    writer.writeBuffer(this._value.contextID, asn1.Ber.OctetString);
  } else {
    writer.writeString(''); //writeBuffer rejects zero-length buffers
  }

  writer.endSequence();
  ber.writeBuffer(writer.buffer, 0x04);
};


VirtualListViewRequestControl.prototype._json = function (obj) {
  obj.controlValue = this.value;
  return obj;
};


VirtualListViewRequestControl.OID = '2.16.840.1.113730.3.4.9';
