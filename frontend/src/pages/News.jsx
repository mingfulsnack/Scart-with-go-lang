import React from 'react'
import { Link } from 'react-router-dom'

function News() {
  const newsArticles = [
    {
      id: 1,
      title: "GP247 CMS Launches New E-commerce Features",
      excerpt: "We're excited to announce the latest updates to our platform, bringing you enhanced shopping experiences and improved performance.",
      image: "https://picsum.photos/400/250?random=10",
      date: "2024-01-15",
      author: "GP247 Team"
    },
    {
      id: 2,
      title: "Mobile Shopping Experience Gets Major Upgrade",
      excerpt: "Our mobile-first approach ensures that your customers have the best shopping experience on any device.",
      image: "https://picsum.photos/400/250?random=11",
      date: "2024-01-10",
      author: "Product Team"
    },
    {
      id: 3,
      title: "Security Enhancements for Better Protection",
      excerpt: "Learn about our latest security improvements designed to protect your store and customer data.",
      image: "https://picsum.photos/400/250?random=12",
      date: "2024-01-05",
      author: "Security Team"
    },
    {
      id: 4,
      title: "New Payment Gateway Integration",
      excerpt: "We've added support for more payment methods to help you serve customers worldwide.",
      image: "https://picsum.photos/400/250?random=13",
      date: "2023-12-28",
      author: "Development Team"
    }
  ]

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  return (
    <div className="container py-5">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/" className="text-decoration-none">Home</Link>
          </li>
          <li className="breadcrumb-item active">News</li>
        </ol>
      </nav>

      {/* Page Header */}
      <div className="row mb-5">
        <div className="col-12 text-center">
          <h1 className="display-4 fw-bold mb-4">Latest News</h1>
          <p className="lead">Stay updated with the latest developments and announcements</p>
        </div>
      </div>

      <div className="row">
        {/* Main Content */}
        <div className="col-lg-8">
          {newsArticles.map((article) => (
            <article key={article.id} className="card mb-4">
              <div className="row g-0">
                <div className="col-md-4">
                  <img 
                    src={article.image} 
                    alt={article.title}
                    className="img-fluid rounded-start h-100"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <div className="col-md-8">
                  <div className="card-body">
                    <h5 className="card-title">
                      <a href="#" className="text-decoration-none text-dark">
                        {article.title}
                      </a>
                    </h5>
                    <p className="card-text text-muted">{article.excerpt}</p>
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        <i className="fas fa-calendar me-2"></i>
                        {formatDate(article.date)}
                      </small>
                      <small className="text-muted">
                        <i className="fas fa-user me-2"></i>
                        {article.author}
                      </small>
                    </div>
                    <a href="#" className="btn btn-primary btn-sm mt-3">
                      Read More
                    </a>
                  </div>
                </div>
              </div>
            </article>
          ))}

          {/* Pagination */}
          <nav aria-label="News pagination">
            <ul className="pagination justify-content-center">
              <li className="page-item disabled">
                <a className="page-link" href="#" tabIndex="-1">Previous</a>
              </li>
              <li className="page-item active">
                <a className="page-link" href="#">1</a>
              </li>
              <li className="page-item">
                <a className="page-link" href="#">2</a>
              </li>
              <li className="page-item">
                <a className="page-link" href="#">3</a>
              </li>
              <li className="page-item">
                <a className="page-link" href="#">Next</a>
              </li>
            </ul>
          </nav>
        </div>

        {/* Sidebar */}
        <div className="col-lg-4">
          {/* Recent Posts */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Recent Posts</h5>
            </div>
            <div className="card-body">
              {newsArticles.slice(0, 3).map((article) => (
                <div key={article.id} className="d-flex mb-3">
                  <img 
                    src={article.image} 
                    alt={article.title}
                    className="rounded me-3"
                    style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                  />
                  <div>
                    <h6 className="mb-1">
                      <a href="#" className="text-decoration-none text-dark">
                        {article.title}
                      </a>
                    </h6>
                    <small className="text-muted">{formatDate(article.date)}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Categories</h5>
            </div>
            <div className="card-body">
              <ul className="list-unstyled">
                <li className="mb-2">
                  <a href="#" className="text-decoration-none">
                    Product Updates <span className="badge bg-secondary ms-2">5</span>
                  </a>
                </li>
                <li className="mb-2">
                  <a href="#" className="text-decoration-none">
                    Company News <span className="badge bg-secondary ms-2">3</span>
                  </a>
                </li>
                <li className="mb-2">
                  <a href="#" className="text-decoration-none">
                    Security <span className="badge bg-secondary ms-2">2</span>
                  </a>
                </li>
                <li className="mb-2">
                  <a href="#" className="text-decoration-none">
                    Tutorials <span className="badge bg-secondary ms-2">8</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Newsletter */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Newsletter</h5>
            </div>
            <div className="card-body">
              <p className="card-text">Subscribe to our newsletter to get the latest updates.</p>
              <form>
                <div className="mb-3">
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div> 
  )
}

export default News 