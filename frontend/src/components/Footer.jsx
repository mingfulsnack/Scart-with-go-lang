import React, { useState } from 'react'
import { Link } from 'react-router-dom'

function Footer() {
  const [email, setEmail] = useState('')

  const handleSubscribe = (e) => {
    e.preventDefault()
    if (email.trim()) {
      // Handle email subscription
      alert('Thank you for subscribing!')
      setEmail('')
    }
  }

  return (
    <footer className="footer">
      <div className="container">
        <div className="row g-4">
          {/* Brand and Description */}
          <div className="col-lg-3 col-md-6">
            <Link to="/">
              <img 
                src="https://demo.s-cart.org/GP247/Core/logo/logo.png" 
                alt="GP247 CMS" 
                className="mb-3"
                style={{ maxHeight: '60px' }}
              />
            </Link>
            <p className="text-light">Demo GP247 CMS</p>
            <p className="text-light">E-commerce platform built with modern technologies.</p>
            
            {/* Social Links */}
            <div className="social-links mt-3">
              <a href="https://www.facebook.com/GP247.official/" className="text-light me-3" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-facebook fa-lg"></i>
              </a>
              <a href="#" className="text-light me-3">
                <i className="fab fa-twitter fa-lg"></i>
              </a>
              <a href="#" className="text-light me-3">
                <i className="fab fa-instagram fa-lg"></i>
              </a>
              <a href="https://www.youtube.com/channel/UCR8kitefby3N6KvvawQVqdg/videos" className="text-light" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-youtube fa-lg"></i>
              </a>
            </div>
          </div>

          {/* Contact Info */}
          <div className="col-lg-3 col-md-6">
            <h5 className="text-white mb-3">About us</h5>
            <div className="contact-info">
              <div className="contact-item mb-3">
                <i className="fas fa-map-marker-alt me-2"></i>
                <span>Address: 123st - abc - xyz</span>
              </div>
              <div className="contact-item mb-3">
                <i className="fas fa-phone me-2"></i>
                <a href="tel:0987654321" className="text-light text-decoration-none">
                  Hotline: 0987654321
                </a>
              </div>
              <div className="contact-item mb-3">
                <i className="fas fa-envelope me-2"></i>
                <a href="mailto:admin@gp247.local" className="text-light text-decoration-none">
                  Email: admin@gp247.local
                </a>
              </div>
            </div>

            {/* Newsletter */}
            <form onSubmit={handleSubscribe} className="mt-3">
              <div className="input-group">
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button className="btn btn-primary" type="submit">
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </form>
          </div>

          {/* Useful Links */}
          <div className="col-lg-3 col-md-6">
            <h5 className="text-white mb-3">Useful Links</h5>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link to="/about" className="text-light text-decoration-none">
                  Terms of Use
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/about" className="text-light text-decoration-none">
                  Privacy Policy
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/news" className="text-light text-decoration-none">
                  News
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/product" className="text-light text-decoration-none">
                  All Products
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="col-lg-3 col-md-6">
            <h5 className="text-white mb-3">Quick Links</h5>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link to="/cart" className="text-light text-decoration-none">
                  Shopping Cart
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/wishlist" className="text-light text-decoration-none">
                  Wishlist
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/compare" className="text-light text-decoration-none">
                  Compare Products
                </Link>
              </li>
              <li className="mb-2">
                <a 
                  href="https://gp247.net" 
                  className="text-light text-decoration-none"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  GP247 Website
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <hr className="my-4" />
        <div className="row align-items-center">
          <div className="col-md-6">
            <p className="mb-0 text-light">
              © {new Date().getFullYear()} Demo GP247 CMS. All rights reserved.
            </p>
          </div>
          <div className="col-md-6 text-md-end">
            <a 
              href="https://www.facebook.com/GP247.official/" 
              className="text-light text-decoration-none me-3"
              target="_blank" 
              rel="noopener noreferrer"
            >
              Fanpage FB
            </a>
            <a 
              href="https://gp247.net" 
              className="text-light text-decoration-none"
              target="_blank" 
              rel="noopener noreferrer"
            >
              Core laravel admin for all systems
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer 