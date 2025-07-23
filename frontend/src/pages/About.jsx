import React from 'react'
import { Link } from 'react-router-dom'

function About() {
  return (
    <div className="container py-5">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/" className="text-decoration-none">Home</Link>
          </li>
          <li className="breadcrumb-item active">About</li>
        </ol>
      </nav>

      {/* Page Header */}
      <div className="row mb-5">
        <div className="col-12 text-center">
          <h1 className="display-4 fw-bold mb-4">About GP247 CMS</h1>
          <p className="lead">Your premier e-commerce solution</p>
        </div>
      </div>

      <div className="row">
        {/* Main Content */}
        <div className="col-lg-8">
          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">Our Story</h2>
            <p className="mb-4">
              GP247 CMS is a powerful and flexible e-commerce platform designed to meet the needs of modern online businesses. 
              Built with cutting-edge technology and user-friendly interfaces, our platform empowers merchants to create 
              stunning online stores with ease.
            </p>
            <p className="mb-4">
              Since our inception, we have been committed to providing innovative solutions that help businesses grow 
              and succeed in the digital marketplace. Our platform combines robust functionality with elegant design, 
              making it the perfect choice for businesses of all sizes.
            </p>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">Why Choose GP247?</h2>
            <div className="row">
              <div className="col-md-6 mb-3">
                <div className="d-flex">
                  <div className="flex-shrink-0">
                    <i className="fas fa-check-circle text-success fa-lg"></i>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h5>Easy to Use</h5>
                    <p className="text-muted">Intuitive interface that makes managing your store simple and efficient.</p>
                  </div>
                </div>
              </div>
              <div className="col-md-6 mb-3">
                <div className="d-flex">
                  <div className="flex-shrink-0">
                    <i className="fas fa-rocket text-primary fa-lg"></i>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h5>Fast Performance</h5>
                    <p className="text-muted">Optimized for speed to ensure your customers have the best experience.</p>
                  </div>
                </div>
              </div>
              <div className="col-md-6 mb-3">
                <div className="d-flex">
                  <div className="flex-shrink-0">
                    <i className="fas fa-shield-alt text-info fa-lg"></i>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h5>Secure</h5>
                    <p className="text-muted">Built with security in mind to protect your business and customers.</p>
                  </div>
                </div>
              </div>
              <div className="col-md-6 mb-3">
                <div className="d-flex">
                  <div className="flex-shrink-0">
                    <i className="fas fa-mobile-alt text-warning fa-lg"></i>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h5>Mobile Responsive</h5>
                    <p className="text-muted">Looks great on all devices, from desktop to mobile.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">Our Mission</h2>
            <p className="mb-4">
              Our mission is to democratize e-commerce by providing powerful, affordable, and easy-to-use tools 
              that enable businesses to succeed online. We believe that every business, regardless of size, 
              should have access to professional-grade e-commerce solutions.
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Contact Information</h5>
              <div className="contact-info">
                <div className="contact-item mb-3">
                  <i className="fas fa-map-marker-alt me-2 text-primary"></i>
                  <span>Address: 123st - abc - xyz</span>
                </div>
                <div className="contact-item mb-3">
                  <i className="fas fa-phone me-2 text-primary"></i>
                  <a href="tel:0987654321" className="text-decoration-none">
                    Hotline: 0987654321
                  </a>
                </div>
                <div className="contact-item mb-3">
                  <i className="fas fa-envelope me-2 text-primary"></i>
                  <a href="mailto:admin@gp247.local" className="text-decoration-none">
                    Email: admin@gp247.local
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="card mt-4">
            <div className="card-body">
              <h5 className="card-title">Quick Links</h5>
              <ul className="list-unstyled">
                <li className="mb-2">
                  <Link to="/product" className="text-decoration-none">
                    Browse Products
                  </Link>
                </li>
                <li className="mb-2">
                  <Link to="/news" className="text-decoration-none">
                    Latest News
                  </Link>
                </li>
                <li className="mb-2">
                  <a 
                    href="https://gp247.net" 
                    className="text-decoration-none"
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    GP247 Official Website
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default About 