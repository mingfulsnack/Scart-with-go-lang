import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import api from '../services/api'

function Search() {
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    const searchKeyword = searchParams.get('keyword')
    if (searchKeyword) {
      setKeyword(searchKeyword)
      searchProducts(searchKeyword)
    } else {
      setLoading(false)
    }
  }, [searchParams])

  const searchProducts = async (searchKeyword) => {
    try {
      setLoading(true)
      const response = await api.get(`/search?keyword=${encodeURIComponent(searchKeyword)}`)
      
      if (response.data.success) {
        setProducts(response.data.data)
      }
    } catch (error) {
      console.error('Error searching products:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
          <div className="text-center">
            <i className="fa fa-spinner fa-pulse fa-3x mb-3"></i>
            <p>Searching...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-5">
      {/* Page Header */}
      <div className="row mb-4">
        <div className="col-12">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <Link to="/" className="text-decoration-none">Home</Link>
              </li>
              <li className="breadcrumb-item active">Search Results</li>
            </ol>
          </nav>
          <h1 className="display-4 fw-bold">Search Results</h1>
          {keyword && (
            <p className="text-muted">
              {products.length > 0 
                ? `Found ${products.length} result(s) for "${keyword}"`
                : `No results found for "${keyword}"`
              }
            </p>
          )}
        </div>
      </div>

      {/* Search Results */}
      <div className="row">
        {!keyword ? (
          <div className="col-12 text-center py-5">
            <i className="fas fa-search fa-4x text-muted mb-3"></i>
            <h3 className="text-muted">Enter a search term</h3>
            <p className="text-muted">Use the search box above to find products.</p>
          </div>
        ) : products.length > 0 ? (
          products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <div className="col-12 text-center py-5">
            <i className="fas fa-search fa-4x text-muted mb-3"></i>
            <h3 className="text-muted">No Products Found</h3>
            <p className="text-muted">
              We couldn't find any products matching your search for "{keyword}".
            </p>
            <div className="mt-3">
              <p className="text-muted mb-2">Suggestions:</p>
              <ul className="list-unstyled text-muted">
                <li>• Check your spelling</li>
                <li>• Try different keywords</li>
                <li>• Use more general terms</li>
              </ul>
            </div>
            <Link to="/product" className="btn btn-primary mt-3">
              Browse All Products
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default Search 