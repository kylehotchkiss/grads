var Grads = require("./library/grads.js");

var me = new Grads(37.34, -79.22, 300, "rap");

me.fetch( me.build("ugrd", true) );
