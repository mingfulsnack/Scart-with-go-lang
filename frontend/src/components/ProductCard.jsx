import React from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

function ProductCard({ product }) {
  const { addToCart, loading } = useCart()

  const handleAddToCart = (instance = 'cart') => {
    addToCart(product.id, instance, '1')
  }

  const formatPrice = (price) => {
    return `$${price.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")}`
  }

  return (
    <div className="col-sm-6 col-md-4 col-lg-3 mb-4">
      <article className="product">
        <div className="product-body">
          <div className="product-figure">
            <Link to={`/product/${encodeURIComponent(product.slug)}`}>
              <img 
                src={product.image} 
                alt={product.name}
                className="img-fluid"
              />
            </Link>
          </div>
          
          <h5 className="product-title">
            <Link to={`/product/${encodeURIComponent(product.slug)}`}>
              {product.name}
            </Link>
          </h5>
          
          <button 
            onClick={() => handleAddToCart('cart')}
            className="btn btn-secondary btn-sm add-to-cart-list w-100 mb-2"
            disabled={loading}
          >
            <i className="fa fa-cart-plus"></i> Add to cart
          </button>
          
          <div className="product-price-wrap">
            <div className="product-price">{formatPrice(product.price)}</div>
          </div>
        </div>
        
        <div className="product-button-wrap">
          <div className="product-button">
            <button 
              className="btn btn-outline-danger btn-sm w-100"
              onClick={() => handleAddToCart('wishlist')}
              disabled={loading}
              title="Add to Wishlist"
            >
              <i className="fas fa-heart"></i>
            </button>
          </div>
          
          <div className="product-button">
            <button 
              className="btn btn-outline-info btn-sm w-100"
              onClick={() => handleAddToCart('compare')}
              disabled={loading}
              title="Add to Compare"
            >
              <i className="fa fa-exchange"></i>
            </button>
          </div>
        </div>
      </article>
    </div>
  )
}

export default ProductCard 