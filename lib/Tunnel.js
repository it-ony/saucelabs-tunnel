var Saucelabs = require('saucelabs'),
    Path = require('path'),
    flow = require('flow.js').flow,
    ChildProcess = require('child_process'),
    colors = require('colors'),
    Tunnel,
    rTunnelId = /Tunnel\sremote\sVM\sis\sprovisioned\s\((\w+)\)/;

colors.setTheme({
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'green',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
});


/***
 * setup a new Tunnel instance
 *
 * @param {Object} options
 * @param {String} [options.username]
 * @param {String} [options.password]
 * @param {String} [options.hostname=saucelabs.com]
 * @param {String} [options.base_path=/rest/v1/]
 * @param {String} [options.port=443]
 *
 * @constructor
 */
Tunnel = function (options) {
    options = options || {};
    options.java = options.java || "java";

    if (!(options.username && options.password)) {
        throw new Error("username and password needs to be provided");
    }

    this.options = options;
    this.saucelabs = new Saucelabs(options);
};

Tunnel.prototype = {

    connect: function (cb) {
        var self = this,
            args,
            callbackCalled = false,
            callback = function (err) {
                if (!callbackCalled && cb) {
                    cb(err, self);
                }

                callbackCalled = true;
            };

        args = [
            "-jar",
            Path.resolve(Path.join(__dirname, "..", "bin", "Sauce-Connect.jar")),
            this.options.username,
            this.options.password
        ];

        try {
            this.proc = ChildProcess.spawn("java", args);
        } catch (e) {
            console.error(e);
            callback(e);
        }

        this.proc.stdout.on('data', function (data) {
            data = data.toString();

            if (!data.match(/^\[-u,/g)) {
                console.log(data.replace(/[\n\r]/g, ''));
            }

            var tunnelId = rTunnelId.exec(data);
            if (tunnelId) {
                self.tunnelId = tunnelId[1];
            }

            if (data.match(/Connected\! You may start your tests/)) {
                callback();
            }

        });

        this.proc.stderr.on('data', function (data) {
            console.log(data.toString().replace(/[\n\r]/g, '').red);
        });

        this.proc.on('exit', function (code) {
            console.log('=> Sauce Labs Tunnel disconnected ', code);
            callback(true);
        });

    },

    disconnect: function (callback) {

        var self = this;

        flow()
            .seq(function (cb) {
                self.saucelabs.deleteTunnel(self.tunnelId, function () {
                    cb(); // without error
                })
            })
            .seq(function () {
                if (self.proc) {
                    try {
                        // kill java vpn tunnel
                        self.proc.kill()
                    } catch (e) {
                        console.error(e);
                    }
                }
            })
            .exec(callback);
    },

    use: function (work, callback) {

        var self = this,
            workError;

        flow()
            .seq(function (cb) {
                self.connect(cb);
            })
            .seq(function (cb) {
                work(function (err) {
                    workError = err;
                    cb();
                });
            })
            .seq(function (cb) {
                self.disconnect(cb);
            })
            .seq(function () {
                if (workError) {
                    throw workError;
                }
            })
            .exec(callback);
    }

};

module.exports = Tunnel;