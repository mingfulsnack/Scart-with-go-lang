import React, { useState, useEffect } from 'react'
import ProductCard from '../components/ProductCard'
import { productAPI } from '../services/api'

function Home() {
  const [products, setProducts] = useState([])
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load products using the proper API method
      const productsResponse = await productAPI.getProducts()
      console.log('Products API response:', productsResponse.data)
      
      if (productsResponse.data.success) {
        setProducts(productsResponse.data.data)
      }

      // Note: banners API might not exist, so we'll skip it for now
      // const bannersResponse = await api.get('/banners')
      // if (bannersResponse.data.success) {
      //   setBanners(bannersResponse.data.data)
      // }
      
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <i className="fa fa-spinner fa-pulse fa-3x mb-3"></i>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Hero Banner */}
      {banners.length > 0 && (
        <section className="section">
          <div id="carouselBanners" className="carousel slide" data-bs-ride="carousel">
            <div className="carousel-indicators">
              {banners.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  data-bs-target="#carouselBanners"
                  data-bs-slide-to={index}
                  className={index === 0 ? 'active' : ''}
                ></button>
              ))}
            </div>
            
            <div className="carousel-inner">
              {banners.map((banner, index) => (
                <div key={banner.id} className={`carousel-item ${index === 0 ? 'active' : ''}`}>
                  <img
                    src={banner.image}
                    className="d-block w-100"
                    alt={`Banner ${index + 1}`}
                    style={{ height: '600px', objectFit: 'cover' }}
                  />
                 
                </div>
              ))}
            </div>
            
            <button className="carousel-control-prev" type="button" data-bs-target="#carouselBanners" data-bs-slide="prev">
              <span className="carousel-control-prev-icon"></span>
            </button>
            <button className="carousel-control-next" type="button" data-bs-target="#carouselBanners" data-bs-slide="next">
              <span className="carousel-control-next-icon"></span>
            </button>
          </div>
        </section>
      )}

      {/* Welcome Message */}
      <section className="section">
        <div className="container">
          <div className="row">
            <div className="col-12 text-center mb-5">
              <h3 className="display-6 fw-bold text-primary">Welcome to CMS created by GP247 system</h3>
            </div>
          </div>
        </div>
      </section>

      {/* New Products */}
      <section className="section bg-light">
        <div className="container">
          <div className="row">
            <div className="col-12">
              <h2 className="section-title">New Products</h2>
            </div>
          </div>
          
          <div className="row">
            {products.length > 0 ? (
              products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-12 text-center">
                <p className="text-muted">No products found.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home 