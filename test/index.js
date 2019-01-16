const MoleHole = require('../out/index.js').MoleHole;

const devices = MoleHole.getDevices(5);
devices.then(console.log);
