var express = require('express');
var querystring = require('querystring');
var request = require('request');
var cryptojs = require("crypto-js");
var debug = require('debug')('timeli-signon');

const TIMELI_VERSION = 3;
const TIMELI_DOMAIN  = "demo.timeli.io";

const URL_PREFIX     = 'http://'+process.env.SDK_REST_URL;
debug("[INFO] connection to metadata app uses url prefix: "+URL_PREFIX);
const AUTH_TOKEN     = "/api/auth/token";

const REQ_GET        = 'GET';
const REQ_POST       = 'POST';
const REQ_DELETE     = 'DELETE';
const REQ_PUT        = 'PUT';

var router = express.Router();
var token_cache = [];


router.post('/tenant/join', function(req,res,next) {
    var params = req.body;
    get_token(function (res1) {
        if (res1.token) {
            var token = res1.token;
            do_request(REQ_GET, token, TIMELI_DOMAIN, '/api/tenants/all', '', function (res1) {
                if (res1.data) {
                    var tenant = res1.data.find(function (t) {
                        return t.domains[0] == params.domain;
                    })
                    if (tenant) {
                        var tenant_id=tenant.id;
                        do_request(REQ_GET, token, TIMELI_DOMAIN, '/api/groups/all', '', function (res1) {
                            if (res1.error) {
                                debug("[ERROR] join tenant request failed (GET /api/groups/all failed) with error: "+res1.error+")");
                                res.status(404).end();
                                return;
                            }
                            if (res1.data) {
                                var group = res1.data.find(function (t) {
                                    return (t.tenantId == tenant_id) && (t.roles[0] == 'Viewer');
                                });
                                if (group) {
                                    var group_id = group.id;
                                    add_new_user(params, function(res1) {
                                        if (res1.error) {
                                            debug("[ERROR] join tenant request failed (add user failed)");
                                            res.json(res1);
                                            return;
                                        }
                                        var body = querystring.stringify({
                                            username:params.username,
                                            group:group_id
                                        });
                                        do_request(REQ_POST, token, params.domain, '/api/group/requests', body, function (res1) {
                                            res.status(200).json(res1);
                                        });
                                    });
                                } else {
                                    res.status(200).json({status:'fail', message:'group not found'});
                                }
                            }
                        });
                    } else {
                        debug("[ERROR] join tenant request failed (tenant not found)");
                        res.status(200).json({status:'fail',message:'tenant not found'});
                    }
                }
                else {
                    res.status(404).end();
                }
            });
        }
        else {
            debug("[ERROR] join tenant request failed (get_token failed)");
            res.status(404).end();
        }
    });
});

router.post('/user/verify_password/:username', function(req,res,next) {
    var body = querystring.stringify(req.body);
    var username = req.params.username;
    get_token(function (res1) {
        if (res1.token) {
            var token = res1.token;
            do_request(REQ_POST, token, TIMELI_DOMAIN, '/api/users/'+username+'/verify', body, function (res1) {
                if ((res1.statusCode == 401) || (res1.statusCode == 404)) {
                    res.status(200).json({status:'fail', message:res1.message});
                    return;
                }
                else if (res1.statusCode == 200) {
                    res.status(200).json({status:'pass', message:res1.message});
                    return;
                }
                res.status(404).end();
            });
        }
        else {
            debug("[ERROR] check password failed (get_token failed)");
            res.status(404).end();
        }
    });
});

router.post('/user/check_password', function(req,res,next) {
    var body = querystring.stringify(req.body);
    get_token(function (res1) {
        if (res1.token) {
            var token = res1.token;
            do_request(REQ_PUT, token, TIMELI_DOMAIN, '/api/users/acceptable/password', body, function (res1) {
                if (res1.statusCode == 200) {
                    res.status(200).json({acceptable:true, message:res1.message});
                    return;
                }
                else if (res1.statusCode == 400) {
                    res.status(200).json({acceptable:false, message:res1.message});
                    return;
                }
                res.status(204).json({});
            });
        }
        else {
            debug("[ERROR] check password failed (get_token failed)");
            res.status(204).json({});
        }
    });
});

router.get('/tenant/available', function(req,res,next) {
    var name = req.query.name ? req.query.name+".timeli.io" : null;
    if (!name) {
        res.status(204).json({});
        return;
    }
    get_token(function (res1) {
        if (res1.token) {
            var token = res1.token;
            do_request(REQ_GET, token, TIMELI_DOMAIN, '/api/tenants/all', '', function (res1) {
                if (res1.data) {
                    var used = res1.data.some(function(t) {
                        return t.domains[0] == name;
                    });
                    if (used)
                        res.status(204).json({});
                    else
                        res.status(200).json({});
                }
                else
                    res.status(204).json({});
            });
        }
        else {
            debug("[ERROR] get all tenants failed (get_token failed)");
            res.status(204).json({});
        }
    });
});

router.get('/user/available', function(req,res,next) {
    var name = req.query.name ? req.query.name : null;
    if (!name) {
        res.status(204).json({});
        return;
    }
    get_token(function (res1) {
        if (res1.token) {
            var token = res1.token;
            do_request(REQ_GET, token, TIMELI_DOMAIN, '/api/users/all', '', function (res1) {
                if (res1.data) {
                    var used = res1.data.some(function(u) {
                        return u.username == name;
                    });
                    if (used)
                        res.status(204).json({});
                    else
                        res.status(200).json({});
                }
                else
                    res.status(404).end();
            });
        }
        else {
            debug("[ERROR] check username failed (get_token failed)");
            res.status(404).end();
        }
    });
});


router.post('/tenant/new', function(req, res, next) {
    var params = req.body;
    add_new_tenant(params, function(res1) {
        if ((res1.error) || (!res1.id)) {
            res.json(res1);
            return;
        }
        var tenant_id     = res1.id,
            redirect_uri  = params.redirect_uri,
            tenant_secret = res1.secret,
            tenant_domain = res1.domains[0];

        update_tenant_redirect(tenant_id, redirect_uri, function(res1) {
            if (res1.error) {
                debug("[ERROR] add new tenant failed (update tenant redirect failed)");
                res.json(res1);
                return;
            }
            add_new_user(params, function(res1) {
                if (res1.error) {
                    debug("[ERROR] add new tenant failed (add new user failed)");
                    res.json(res1);
                    return;
                }
                add_user_to_tenant(tenant_id, params.username, function(res1) {
                    if (res1.error) {
                        debug("[ERROR] add new tenant failed (add user to tenant failed)");
                        res.json(res1);
                        return;
                    }
                    var tenant_params = {
                        grant_type:     "password",
                        client_id:      tenant_id,
                        client_secret:  tenant_secret,
                        username:       params.username,
                        password:       params.password,
                        scope:          "TenantAdmin",
                        redirect_uri:   redirect_uri,
                        domain:         tenant_domain
                    }
                    get_token(tenant_params, function(res1) {
                        if (res1.token) {
                            res.json({
                                client_id:      tenant_id,
                                client_secret:  tenant_secret,
                                domain:         tenant_domain,
                                redirect_uri:   params.redirect_uri
                            });
                        }
                        else {
                            debug("[ERROR] add new tenant failed (could not get token for new tenant)");
                            res.json(res1);
                        }
                    });
                });
            });
        });
    });
});


module.exports = router;

function generate_secret() {
    var btoa = require('btoa');
    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + s4() + s4();
    }
    return btoa(guid()).substring(0,16);
}

function add_user_to_tenant(tenant_id, username, cb) {
    get_token(function (res) {
        if (res.token) {
            var token = res.token;
            var body = querystring.stringify({
                tenant:tenant_id,
                roles:'TenantAdmin'
            });
            do_request(REQ_PUT, token, TIMELI_DOMAIN, '/api/users/'+username+'/tenant', body, function (res) {
                cb(res);
            });
        }
        else {
            cb(res);
        }
    });
}

function set_user_to_admin_group(tenant_id, username, cb) {
    get_token(function (res) {
        if (res.token) {
            var token = res.token;
            do_request(REQ_GET, token, TIMELI_DOMAIN, '/api/groups/all', '', function (res) {
                if (res.error) {
                    cb(res);
                    return;
                }
                var group = null;
                for (var i=0; i<res.data.length; i++) {
                    if ((res.data[i].tenantId == tenant_id) && (res.data[i].roles[0] == 'TenantAdmin')) {
                        group = res.data[i].id;
                        break;
                    }
                };
                if (group == null) {
                    cb({error:'failed to add user to the admin group. group not found.'});
                    return;
                }
                var body = querystring.stringify({
                    ids:group
                });
                do_request(REQ_POST, token, TIMELI_DOMAIN, '/api/users/'+username+'/join', body, function (res) {
                    cb(res);
                });
            });
        }
        else {
            cb(res);
        }
    });
}

function update_tenant_redirect(tenant_id, redirect_uri, cb) {
    get_token(function (res) {
        if (res.token) {
            var body = querystring.stringify({
               url:redirect_uri
            });
            do_request(REQ_PUT, res.token, TIMELI_DOMAIN, '/api/tenants/'+tenant_id+'/redirect', body, function (res) {
                cb(res);
            });
        }
        else {
            cb(res);
        }
    });
}

function add_new_user(params, cb) {
    var body = querystring.stringify({
        username: params.username,
        password: params.password,
        fullname: params.fullname,
        email: params.email
    });
    get_token(function (res) {
        if (res.token) {
            do_request(REQ_POST, res.token, TIMELI_DOMAIN, '/api/users', body, function (res) {
                if (!res.error) {
                    if (!res.id) {
                        if (res.message) {
                            res = {error:res.message};
                        }
                        else {
                            res = {error:"add new user failed"};
                        }
                    }
                }
                cb(res);
            });
        }
        else {
            cb(res);
        }
    });
}


function add_new_tenant(params, cb) {
    if (!(params.name && params.description && params.domains)) {
        cb({error: "missing parameters. cannot add new tenant"});
        return;
    }
    var body = querystring.stringify({
        name: params.name,
        description: params.description,
        secret: generate_secret(),
        domains: params.domains
    });
    get_token(function (res) {
        if (res.token) {
            do_request(REQ_POST, res.token, TIMELI_DOMAIN, '/api/tenants', body, function (res) {
                cb(res);
            });
        }
        else {
            cb(res);
        }
    });
}

function do_request(type, token, domain, url, body, cb) {
    var req = {
        url: URL_PREFIX+url,
        body:body
    }

    req.headers = get_api_headers(token, domain);
    switch(type) {
        case REQ_GET:
            request.get(req, function(err,res,body) {
                process_api_response(err,res,body,cb);
            });
            break;
        case REQ_POST:
            request.post(req,function(err,res,body) {
                process_api_response(err,res,body,cb);
            });
            break;
        case REQ_DELETE:
            request.delete(req,function(err,res,body) {
                process_api_response(err,res,body,cb);
            });
            break;
        case REQ_PUT:
            request.put(req,function(err,res,body) {
                process_api_response(err,res,body,cb);
            });
            break;
        default:
            cb({error:'request type not supported'});
            break;
    }
}

function process_api_response(err, res, body, cb) {
    var body = body || {};
    if (err) {
        cb({error: err, statusCode:404});
    } else {
        var obj = JSON.parse(body);
        obj.statusCode = res.statusCode;
        cb(obj);
    }
}

function get_api_headers(token, domain) {
    return {
        'Accept': "application/json; charset=utf-8",
        'X-Timeli-Version': TIMELI_VERSION,
        'X-Timeli-Domain': domain,
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Origin': "http://localhost",
        'X-Timeli-Auth':get_auth(),
        'Authorization':'Bearer ' + token
    }
}



function get_auth() {
    var d = new Date();
    d.setSeconds(0);
    d.setMilliseconds(0);
    var access_token = d.toISOString();
    var m = access_token.match(/T(.*?):/);
    if (!m) {
        return access_token;
    }
    else {
        var h = parseInt(m[1]);
        if (h > 12) {
            h = h-12;
            if (h < 10) {
                h = '0'+h;
            }
            access_token = access_token.replace(/T(.*?):/, 'T'+h+':');
        }
    }
    access_token = access_token.replace(/Z$/,'+0000|You');
    var rawAESKey = "Your mouth is talking, you might look to that.".substring(0, 16);
    var iv = "I aim to misbehave!".substring(0, 16);
    var key = cryptojs.enc.Utf8.parse(rawAESKey);
    var iv = cryptojs.enc.Utf8.parse(iv);
    var encrypted = cryptojs.AES.encrypt(
        access_token,
        key,
        {
            iv: iv,
            mode: cryptojs.mode.CBC
        }
    );
    var ret = encrypted.ciphertext.toString(cryptojs.enc.Base64);

    return ret;
}

function get_token(params, cb) {
    if (typeof(params) === "function") {
        cb = params;
        params = {
            grant_type:     "password",
            client_id:      "00000000-0000-0000-0000-000000000000",
            client_secret:  "dem0s3cRe7",
            username:       "admin",
            password:       "password",
            scope:          "SysAdmin",
            redirect_uri:   "http://testclient.timeli.io",
            domain:         "demo.timeli.io"
        };
    }
    get_tenant_token(params,cb);
}

function get_tenant_token(params, cb) {

    if (token_cache[params.client_id]) {
        if (token_cache[params.client_id].expires.getTime() > (new Date().getTime() + 60*60*1000)) {
            cb({token: token_cache[params.client_id].token});
            return;
        }
    }

    var post_data = querystring.stringify({
        grant_type: params.grant_type,
        client_id: params.client_id,
        client_secret: params.client_secret,
        username: params.username,
        password: params.password,
        scope: params.scope,
        redirect_uri: params.redirect_uri
    });

    request.post({
        url: URL_PREFIX + AUTH_TOKEN,
        headers: {
            'X-Timeli-Version': TIMELI_VERSION,
            'Accept': "application/json; charset=utf-8",
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Timeli-Domain': params.domain,
            'X-Timeli-Auth':get_auth()
        },
        body: post_data
    }, function(err, res, body) {
        body = body || {};
        if (err) {
            cb({error: 'authentication failed - '+err});
        } else {
            var obj = JSON.parse(body);
            if (!obj.hasOwnProperty('access_token')) {
                cb({error: 'authentication failed. no access token '+body});
            } else {
                token_cache[params.client_id] = {
                    token: obj.access_token,
                    expires: new Date(new Date().getTime() + (obj.expires_in*1000))
                };
                cb({token: obj.access_token});
            }
        }
    });
};
