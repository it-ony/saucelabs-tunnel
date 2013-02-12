var http = require("http"),
    Tunnel = require("..").Tunnel,
    flow = require("flow.js").flow,
    expect = require('chai').expect;

describe("Tunnel", function () {

    it("it should throw an error if username or password is blank", function () {

        var count = 0;

        try {
            new Tunnel({
                username: "foo"
            });
        } catch (e) {
            count++;
        }

        try {
            new Tunnel({
                password: "foo"
            });
        } catch (e) {
            count++;
        }

        expect(count).to.eql(2);

    });

    it("should create a tunnel instance with default parameters", function () {
        var tunnel = new Tunnel({
            username: "foo",
            password: "bar"
        });

        expect(tunnel).to.exist;
        expect(tunnel.saucelabs).to.exist;

        expect(tunnel.saucelabs.options.username).to.eql("foo");
        expect(tunnel.saucelabs.options.password).to.eql("bar");

    });

    it.skip("connect with invalid credentials should invoke callback with error", function (done) {
        var tunnel = new Tunnel({
            username: "it-ony/saucelabs-tunnel",
            password: "test"
        });

        tunnel.connect(function (err) {
            if (err) {
                // test ok
                done();
            } else {
                done(true);
            }
        });

    });

    it.skip("connect with valid credentials should callback without error", function (done) {

        var username = process.env["SAUCE_USERNAME"],
            password = process.env["SAUCE_ACCESS_KEY"];

        var tunnel = new Tunnel({
            username: username,
            password: password
        });

        flow()
            .seq(function (cb) {
                tunnel.connect(cb);
            })
            .seq(function (cb) {
                http.get("http://ondemand.saucelabs.com/", function (res) {
                    cb(res.statusCode != 200);
                })
                .on('error', function () {
                    cb(true);
                });
            })
            .seq(function (cb) {
                tunnel.disconnect(cb);
            })
            .exec(done);

    });


});