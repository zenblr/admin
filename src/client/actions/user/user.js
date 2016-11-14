import 'whatwg-fetch'
import { push } from 'react-router-redux'
import cookie from 'react-cookie'

export function createNewTenant(props, cb) {
    let postdata = {
        username: props.username,
        password: props.password,
        fullname: props.fullname,
        email: props.email,
        name: props.companyname,
        description: props.description ? props.description : '-',
        domains: props.subdomain + '.timeli.io',
        redirect_uri: props.uri ? props.uri : 'http://localhost'
    }
    let url = '/api/tenant/new'

    let body = [];
    Object.keys(postdata).map((key,i) => {
        body.push(encodeURIComponent(key) + "=" + encodeURIComponent(postdata[key]))
    })
    body = body.join('&')
    let headers = {
        'Accept': 'application/json',
        'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'
    }
    fetch(url, {
        method:"POST",
        headers:headers,
        body:body
    })
    .then(res => {
        res.json().then(v => {
            if (v.client_id) {
                cb ({
                    status:'pass',
                    details: v
                })
            } else {
                cb ({
                    status:'fail',
                    message: v.error ? v.error : (v.message ? v.message : 'attempt to create new tenant failed')
                })
            }
        })
        //res.json().then(v => {cb(v)})
    })
}

export function isSubdomainAvailable(name, cb) {
    let url = '/api/tenant/available?name='+name

    //add cache breaker
    let n = Math.random()
    url += '&n='+n

    let headers = {
        'Accept': 'application/json',
    }
    fetch(url, {
        method:"GET",
        headers:headers
    })
    .then(res => {
        if (res.status == 200) {
            cb({available:true})
            return
        }
        else if (res.status == 204) {
            cb({available:false})
            return
        }
        cb({available:false, message:"connection to server failed. could not check subdomain availability."})
    })
}

export function isUsernameAvailable(name, cb) {
    let url = '/api/user/available?name='+name

    //add cache breaker
    let n = Math.random()
    url += '&n='+n

    let headers = {
        'Accept': 'application/json'
    }
    fetch(url, {
        method:"GET",
        headers:headers
    })
    .then(res => {
        if (res.status == 200) {
            cb({available:true})
            return
        }
        else if (res.status == 204) {
            cb({available:false})
            return
        }
        cb({available:false, message:"connection to server failed. could not check username availability."})
    })
}

export function checkPassword(password, cb) {
    let postdata = {
        password: password
    }
    let url = '/api/user/check_password'
    let body = [];
    Object.keys(postdata).map((key,i) => {
        body.push(encodeURIComponent(key) + "=" + encodeURIComponent(postdata[key]))
    })
    body = body.join('&')

    let headers = {
        'Accept': 'application/json',
        'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'
    }
    fetch(url, {
        method:"POST",
        headers:headers,
        body:body
    })
    .then(res => {
        if (res.status == 200) {
            res.json().then(v => {
                cb(v)
            })
        }
        else
            cb({acceptable:false, message:"connection to server failed. could not check password strength."})

    })
}

export function verifyUserPassword(username, password, cb) {
    let postdata = {
        password: password
    }
    let url = '/api/user/verify_password/'+username
    let body = [];
    Object.keys(postdata).map((key,i) => {
        body.push(encodeURIComponent(key) + "=" + encodeURIComponent(postdata[key]))
    })
    body = body.join('&')


    let headers = {
        'Accept': 'application/json',
        'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'
    }
    fetch(url, {
        method:"POST",
        headers:headers,
        body:body
    })
    .then(res => {
        if (res.status == 200) {
            res.json().then(v => {
                cb(v)
            })
        }
        else
            cb({status:'fail', message:"connection to server failed. could not verify correctness of password."})

    })
}

export function sendJoinRequest(props, cb) {
    let postdata = {
        username: props.username,
        password: props.password,
        fullname: props.fullname,
        email: props.email,
        domain:props.tenant_name
    }
    let url = '/api/tenant/join'

    let body = [];
    Object.keys(postdata).map((key,i) => {
        body.push(encodeURIComponent(key) + "=" + encodeURIComponent(postdata[key]))
    })
    body = body.join('&')
    let headers = {
        'Accept': 'application/json',
        'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'
    }
    fetch(url, {
        method:"POST",
        headers:headers,
        body:body
    })
    .then(res => {
        res.json().then(v => {
            if (v.statusCode && (v.statusCode == 201)) {
                cb ({status:'pass'})
            } else {
                cb ( {
                 status:'fail',
                 message: v.error ? v.error : (v.message ? v.message : 'join request was not successful')
                } )
            }
        })
    })
}