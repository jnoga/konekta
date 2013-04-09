/*
Plugin to implement the vCard extension.
http://xmpp.org/extensions/xep-0054.html

Author: Nathan Zorn (nathan.zorn@gmail.com)
CoffeeScript port: Andreas Guth (guth@dbis.rwth-aachen.de)
*/

Strophe.addConnectionPlugin('vcard', {
  _connection: null,

  init: function(conn) {
    this._connection = conn;
    Strophe.addNamespace('VCARD', 'vcard-temp');
  },
  
  get: function(handler_cb, jid, error_cb) {
    var iq = new Strophe.vCardIQ("get", jid);
    return this._connection.sendIQ(iq, handler_cb, error_cb);
  },

  set: function(handler_cb, vCardEl, jid, error_cb) {
    var iq = new Strophe.vCardIQ("set", jid, vCardEl);
    return this._connection.sendIQ(iq, handler_cb, error_cb);
  }
});

Strophe.vCardIQ = function(type, jid, vCardEl) {
  var iq = $iq(jid ? {type: type, to: jid} : {type: type});
  if(type === "get"){iq = iq.c("vCard", {xmlns: Strophe.NS.VCARD});}
  if (vCardEl) { iq.cnode(vCardEl); }
  return iq;
};