var expect    = require("chai").expect;
var request   = require("request");
var mongojs   = require("mongojs");
var DBPATH    = process.env.DB_PATH || "services.local";
var db        = mongojs(DBPATH, ["users", "tenants"]);

const USERNAME  = "mochatest";
const USERNAME2 = "mochatest2";
const PASSWORD  = "!mochatestQWERTY123";
const FULLNAME  = "Mocha Test";
const EMAIL     = "test@mochatest.com";
const TENANT    = "mochatest";
const NAME      = "Test Company";
const DESCRIPTION = "This is a test company";
const REDIRECT  = "http://localhost";

describe("Signon API tests", function() {

    before(function(done) {
        db.users.remove({username:{$in:[USERNAME,USERNAME2]}});
        db.tenants.remove({domains:[TENANT+".timeli.io"]},true);
        done();
    });

    describe("testing check password", function() {

        it("checks password strength inadequate", function (done) {
            var form = {
                password: 'test',
            }
            var url = 'http://localhost:3000/api/user/check_password';
            request.post({url: url, form: form}, function (err, httpResponse, body) {
                if (err) {
                    throw err;
                }
                body = JSON.parse(body);
                expect(body.acceptable).to.be.false;
                done();
            });
        });

        it("checks password strength adequate", function (done) {
            var form = {
                password: '!1234QWERTYggsgsgs',
            }
            var url = 'http://localhost:3000/api/user/check_password';

            request.post({url: url, form: form}, function (err, httpResponse, body) {
                if (err) {
                    throw err;
                }
                body = JSON.parse(body);
                expect(body.acceptable).to.be.true;
                done();
            });
        });
    });

    describe("testing tenant available", function() {
        it("checks tenant name availability", function (done) {
            var url = 'http://localhost:3000/api/tenant/available?name=mochatest&n='+Math.random();
            request.get({url: url}, function (err, httpResponse, body) {
                if (err) {
                    throw err;
                }
                expect(httpResponse.statusCode).to.equal(200);
                done();
            });
        });
    });

    describe("testing user available", function() {
        it("checks user name availability", function (done) {
            var url = 'http://localhost:3000/api/user/available?name=mochatest&n='+Math.random();
            request.get({url: url}, function (err, httpResponse, body) {
                if (err) {
                    throw err;
                }
                expect(httpResponse.statusCode).to.equal(200);
                done();
            });
        });
    });

    describe("testing create new tenant", function() {
        it("creates a new tenant", function (done) {
            var form = {
                username: USERNAME,
                password: PASSWORD,
                fullname: FULLNAME,
                email: EMAIL,
                name: NAME,
                description: DESCRIPTION,
                domains: TENANT + '.timeli.io',
                redirect_uri: REDIRECT
            }
            var url = 'http://localhost:3000/api/tenant/new';
            request.post({url: url, form: form}, function (err, httpResponse, body) {
                if (err) {
                    throw err;
                }
                body = JSON.parse(body);
                expect(body).to.not.have.property('error');
                expect(body).to.have.property('client_id');
                expect(body).to.have.property('client_secret');
                expect(body).to.have.property('domain');
                expect(body).to.have.property('redirect_uri');
                expect(body.domain).to.equal(TENANT + '.timeli.io');
                expect(body.redirect_uri).to.equal(REDIRECT);
                done();
            });
        });
    });

    describe("testing verify password", function() {
        it("verifies username and password to be correct", function (done) {
            var form = {
                password: PASSWORD
            }
            var url = 'http://localhost:3000/api/user/verify_password/'+USERNAME;
            request.post({url: url, form: form}, function (err, httpResponse, body) {
                if (err) {
                    throw err;
                }
                body = JSON.parse(body);
                expect(body.status).to.equal('pass');
                done();
            });
        });
        it("verifies username and password to be incorrect", function (done) {
            var form = {
                password: PASSWORD+"Z"
            }
            var url = 'http://localhost:3000/api/user/verify_password/'+USERNAME;
            request.post({url: url, form: form}, function (err, httpResponse, body) {
                if (err) {
                    throw err;
                }
                body = JSON.parse(body);
                expect(body.status).to.equal('fail');
                done();
            });
        });
    });

    describe("testing join tenant", function() {
        it("creates a request to join an existing tenant", function (done) {
            var form = {
                username: USERNAME2,
                password: PASSWORD,
                fullname: FULLNAME,
                email: EMAIL,
                domain: TENANT + '.timeli.io'
            }
            var url = 'http://localhost:3000/api/tenant/join';
            request.post({url: url, form: form}, function (err, httpResponse, body) {
                if (err) {
                    throw err;
                }
                body = JSON.parse(body);
                expect(body).to.not.have.property('error');
                expect(body).to.not.have.property('status');
                expect(body.statusCode).to.equal(201);
                done();
            });
        });
    });
});