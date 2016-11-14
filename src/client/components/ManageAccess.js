import React, { Component, PropTypes } from 'react'
import { push } from 'react-router-redux'
var Modal = require('react-modal')

const USER_TYPE_NEW        = 'new'
const USER_TYPE_EXISTING   = 'existing'
const TENANT_ACTION_CREATE = "create"
const TENANT_ACTION_JOIN   = "join"

const loadinggif = require('../assets/loader-new.gif')

//import {} from '../../actions/user/user'

class ManageAccess extends Component {

    constructor(props) {
        super(props)
        this.state = {
            requests : [
                {name:'V Raghavan', time: new Date(), email:"vijay@gmail.com"},
                {name:'K Nordstrom', time: new Date(), email:"keith.n@timeli.io"}
            ],
            users: [
                {name:'Vijaya R', email:"vijay.ra@gmail.com", roles:"Viewer"},
                {name:'Keith N', email:"keith@timeli.io", roles:"Viewer"}
            ]
        }
        if (this.props.location.query.user) {

        }
    }

    denyRequest(email) {
        let s= this.state
        let requests = s.requests;
        requests = requests.filter((v) => {
            return (v.email != email)
        })
        s.requests = requests
        this.setState({...s})
    }

    grantRequest(email) {
        let s= this.state
        let requests = s.requests;
        let sel = requests.find((v) => {
            return v.email == email
        })

        if (sel) {
            s.popup = {
                type: 'grant',
                name: sel.name,
                email:sel.email,
                role: {
                    'viewer' :true
                }
            }
        }
        //s.requests = requests
        this.setState({...s})
    }

    changeRoles(email) {
        let s= this.state
        let users = s.users;
        let sel = users.find((v) => {
            return v.email == email
        })

        if (sel) {
            console.log(sel.roles)
            s.popup = {
                type: 'changerole',
                name: sel.name,
                email:sel.email,
                role: {
                    'viewer':true,
                    'writer':sel.roles.match(/Writer/i) ? true : false,
                    'assetadmin': sel.roles.match(/Asset/i) ? true : false
                }
            }
            console.log(JSON.stringify(s.popup.role))
        }
        //s.requests = requests
        this.setState({...s})
    }

    revokeUser(email) {
        let s= this.state
        let users = s.users;
        users = users.filter((v) => {
            return (v.email != email)
        })
        s.users = users
        this.setState({...s})
    }

    showGrant(email) {
        return (<a onClick={this.grantRequest.bind(this, email)}>Grant</a>)
    }

    showDeny(email) {
        return (<a onClick={this.denyRequest.bind(this, email)}>Deny</a>)
    }

    showChangeRoles(email) {
        return (<a onClick={this.changeRoles.bind(this, email)}>Change Roles</a>)
    }

    showRevoke(email) {
        return (<a onClick={this.revokeUser.bind(this, email)}>Revoke</a>)
    }

    showRequests() {
        let r = this.state.requests
        let requests = r.map( (v,i) => {
            return (<tr key={i}><td>{v.name}</td><td>{v.time.toISOString().replace(/\..*Z$/,'')}</td><td>{v.email}</td><td>{this.showGrant(v.email)}</td><td>{this.showDeny(v.email)}</td></tr>)
        })
        return requests
    }

    showUsers() {
        let r = this.state.users
        let users = r.map( (v,i) => {
            return (<tr key={i}><td>{v.name}</td><td>{v.email}</td><td>{v.roles}</td><td>{this.showChangeRoles(v.email)}</td><td>{this.showRevoke(v.email)}</td></tr>)
        })
        return users
    }

    closePopupAndGrant() {
        let s = this.state
        let requests = s.requests
        for (let i=0; i<requests.length; i++) {
            if (requests[i].email == s.popup.email) {
                requests.splice(i,1)
                break
            }
        }
        s.requests = requests
        s.users.push({
            name:s.popup.name,
            email:s.popup.email,
            roles:(s.popup.role.writer? "Writer" :"Viewer") + (s.popup.role.assetadmin? ",Asset Admin" : "")
        })
        s.popup = false
        this.setState({...s})
    }

    closePopupAndChangeRole() {
        let s = this.state
        let users = s.users
        console.log(JSON.stringify(s.popup.role))
        for (let i=0; i<users.length; i++) {
            if (users[i].email == s.popup.email) {
                users[i].roles = (s.popup.role.writer? "Writer" :"Viewer") + (s.popup.role.assetadmin? ",Asset Admin" : "")
                break
            }
        }
        s.users = users
        s.popup = false
        this.setState({...s})
    }

    closePopup() {
        let s = this.state
        s.popup = false
        this.setState({...s})
    }

    setRole(e) {
        let s = this.state
        if (s.popup) {
            if (e.target.checked) {
                s.popup.role[e.target.value] = true
            }
            else {
                s.popup.role[e.target.value] = false
            }
            this.setState({...s})
        }
    }

    showPopup() {
        let s = this.state
        if (!s.popup)
            return ""
        let html = ""
        if (s.popup.type == "grant") {
            html = (
                <div>
                    <div>Approve {s.popup.name}?</div>
                    <div>{s.popup.name} will have the following roles on your tenant</div>
                    <div className="popup">
                        <li className="popup-list"><input type="checkbox" value="viewer" onChange={this.setRole.bind(this)} checked></input><label>Viewer</label></li>
                        <li className="popup-list"><input type="checkbox" value="writer" onChange={this.setRole.bind(this)}></input><label>Writer</label></li>
                        <li className="popup-list"><input type="checkbox" value="assetadmin" onChange={this.setRole.bind(this)}></input><label>Asset Admin</label></li>
                    </div>
                    <div style={{textAlign:"center"}}>
                        <button className="modal-popup-button" onClick={this.closePopupAndGrant.bind(this)}>OK</button>
                        <button className="modal-popup-button" onClick={this.closePopup.bind(this)}>Cancel</button>
                    </div>
                </div>
            )
        }
        else if (s.popup.type == "changerole") {
            html = (
                <div>
                    <div>Change Roles for {s.popup.name}?</div>
                    <div>{s.popup.name} will have the following roles on your tenant</div>
                    <div className="popup">
                        <li className="popup-list"><input type="checkbox" value="viewer" onChange={this.setRole.bind(this)} checked></input><label>Viewer</label></li>
                        <li className="popup-list"><input type="checkbox" value="writer" onChange={this.setRole.bind(this)} checked={s.popup.role.writer}></input><label>Writer</label></li>
                        <li className="popup-list"><input type="checkbox" value="assetadmin" onChange={this.setRole.bind(this)} checked={s.popup.role.assetadmin}></input><label>Asset Admin</label></li>
                    </div>
                    <div style={{textAlign:"center"}}>
                        <button className="modal-popup-button" onClick={this.closePopupAndChangeRole.bind(this)}>OK</button>
                        <button className="modal-popup-button" onClick={this.closePopup.bind(this)}>Cancel</button>
                    </div>
                </div>
            )
        }

        let style = {
            content: {
                width: "40%",
                height: "30%",
                borderStyle: "solid",
                borderColor: "green",
                top: "20%",
                left: "25%"
            }
        }
        return (
            <Modal
                isOpen={true}
                onRequestClose={this.closePopup.bind(this)}
                shouldCloseOnOverlayClick={false}
                style={style}>
                {html}
            </Modal>
        )
    }



        render() {

        let title_requests = "Pending Requests"
        let title_users = "Current Users"

        return (
            <div className="section_form">
                <form>
                    <div style={{paddingBottom:"20px"}}>
                        <div className="popup">
                            <h2 className="text-left">{title_requests}</h2>
                            { (this.state.requests.length > 0) &&
                            <table className="requests-table">
                                <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Time</th>
                                    <th>Email</th>
                                    <th colSpan="2">Action</th>
                                </tr>
                                </thead>
                                <tbody>
                                {this.showRequests()}
                                </tbody>
                            </table> }
                            { (this.state.requests.length == 0) &&
                                <div>No pending requests</div>
                            }
                        </div>

                        <div className="popup">
                            <h2 className="text-left">{title_users}</h2>
                            { (this.state.users.length > 0) &&
                            <table className="users-table">
                                <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Roles</th>
                                    <th colSpan="2">Action</th>
                                </tr>
                                </thead>
                                <tbody>
                                {this.showUsers()}
                                </tbody>
                            </table> }
                            { (this.state.users.length == 0) &&
                            <div>No users</div>
                            }
                        </div>
                    </div>
                </form>
                {this.showPopup()}
            </div>
        )
    }
}

export default ManageAccess
