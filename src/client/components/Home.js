import React, { Component } from 'react'
import ManageAccess from './ManageAccess'

class Home extends Component {

  render() {
    return(
      <div className="wrapper">
        <header id="header">
            <div className="container">
                <div className="logo"><a href="#"><img src="images/logo_img.png" height={50} width={86} alt /></a></div>
            </div>
        </header>
        <div className="main_content">
          <div className="container">
            <div className="section">
                <ManageAccess location={this.props.location}/>
            </div>
          </div>
        </div>
        <footer id="footer" />
      </div>
    )
  }
}

export default Home
