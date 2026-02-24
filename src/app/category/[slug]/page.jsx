'use client';
import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, X, SlidersHorizontal } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Navbar from '@/app/components/Navbar/Navbar';
import CategoryNav from '@/app/components/Categories/Categories';
import { Range } from 'react-range';
import ProductGrid from '@/app/components/ProductCard/ProductCard';
import { useSearchParams } from 'next/navigation';

export default function CategoryPage() {
  const searchParams = useSearchParams();
  const highlightedProductId = searchParams.get('product');
  const pathname = usePathname();
  const [slug, setSlug] = useState('');
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('Featured');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const MIN = 0;
  const [MAX, setMAX] = useState(1000000);
  const [values, setValues] = useState([MIN, MAX]);
  const STEP = 1000;

  const visibleBrands = showAll ? brands : brands.slice(0, 7);

  useEffect(() => {
    setValues(prev => {
      const [min] = prev;
      return [min, MAX];
    });
  }, [MAX]);

  useEffect(() => {
    if (pathname.startsWith('/category/')) {
      const slugValue = pathname.split('/category/')[1];
      setSlug(decodeURIComponent(slugValue));
    }
  }, [pathname]);

  useEffect(() => {
    if (slug) fetchProducts(slug);
  }, [slug]);

  const getParsedFilterValues = () => {
    const excludedKeys = ['getItToday', 'getItTomorrow', 'getIt2Days'];

    return Object.keys(selectedFilters)
      .filter((k) => selectedFilters[k] && !excludedKeys.includes(k))
      .map((k) => {
        if (k.startsWith('brand:')) return k.split(':')[1];
        if (k.startsWith('attr:')) return k.split(':')[2];
        if (k.startsWith('spec:')) return k.split(':')[2];
        return k;
      });
  };

  const fetchProducts = async (
    slug,
    filters = [],
    page = 1,
    sort = 'Featured',
    priceRange = [MIN, MAX]
  ) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/categories/${slug}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page,
          sort,
          minPrice: priceRange[0],
          maxPrice: priceRange[1],
          filters,
        }),
      });

      const data = await res.json();

      let fetchedProducts = Array.isArray(data.products) ? data.products : [];

      // 🔥 Move selected product to top
      if (highlightedProductId) {
        fetchedProducts = [
          ...fetchedProducts.filter(p => String(p.id) === String(highlightedProductId)),
          ...fetchedProducts.filter(p => String(p.id) !== String(highlightedProductId)),
        ];
      }

      setProducts(fetchedProducts);
      setMAX(data.maxPrice);
      setBrands(data.brands || []);
      setAttributes(data.attributes || []);
      setTotalResults(data.totalProducts || 0);

    } catch (error) {
      console.error('❌ Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const safeValues = Array.isArray(values) && values.length === 2 && values.every(v => typeof v === 'number')
    ? values
    : [MIN, MAX];

  const handleFilterChange = (key) => {
    const updated = { ...selectedFilters, [key]: !selectedFilters[key] };
    setSelectedFilters(updated);
    fetchProducts(slug, getParsedFilterValues(), currentPage, sortBy, values);
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    fetchProducts(slug, getParsedFilterValues(), currentPage, newSort, values);
  };

  const handlePriceGo = () => {
    fetchProducts(slug, getParsedFilterValues(), currentPage, sortBy, values);
  };

  useEffect(() => {
    if (showMobileFilters) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }

    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [showMobileFilters]);



  return (
    <>
      <div className='overflow-x-hidden'>
        <Navbar />
        <div className='w-full hidden md:block'>
          <CategoryNav />
        </div>

        <div className="min-h-screen bg-white overflow-x-hidden w-[99vw]">
          {/* Header */}
          <div className="bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <div className="text-xs md:text-md font-semibold text-gray-700 truncate flex flex-wrap items-center gap-2">
              <span>SHOWING {totalResults} ITEMS</span>
              <span className="hidden md:inline text-yellow-600">FOR {slug.toUpperCase()}</span>
            </div>

            {/* Sort + Filter container */}
            <div className="flex items-center ml-auto gap-3">
              {/* Sort By */}
              <div className="flex items-center text-sm">
                <span className="text-gray-700 mr-1 text-xs md:text-md truncate">SORT BY -</span>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="uppercase text-xs md:text-md font-semibold text-gray-800 bg-white border border-gray-300 rounded-md md:px-4 py-2"
                >
                  <option value="Featured">FEATURED</option>
                  <option value="PriceLowToHigh">PRICE: LOW TO HIGH</option>
                  <option value="PriceHighToLow">PRICE: HIGH TO LOW</option>
                  <option value="Customer Rating">CUSTOMER RATING</option>
                  <option value="Newest Arrivals">NEWEST ARRIVALS</option>
                </select>
              </div>

              {/* Filter Toggle on Mobile */}
              <div className="md:hidden">
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-800 border px-3 py-2 rounded-lg"
                >
                  <SlidersHorizontal className="w-5 h-5 text-blue-500 stroke-[2.5]" />

                </button>
              </div>
            </div>
          </div>


          <div className="flex">
            {/* Sidebar */}
            <div className="hidden md:block w-64 bg-white border-r border-gray-200 p-4">
              {/* Delivery Day */}
              <h3 className="font-semibold text-md text-gray-900 mb-3 uppercase">Delivery Day</h3>
              {['getItToday', 'getItTomorrow', 'getIt2Days'].map((key) => (
                <label key={key} className="flex items-center text-sm mb-2">
                  <input
                    type="checkbox"
                    checked={selectedFilters[key] || false}
                    onChange={() => handleFilterChange(key)}
                    className="w-4 h-4 mr-3 accent-orange-500"
                  />
                  <span className="text-gray-700 uppercase">{key.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}

              {/* Brands */}
              <h3 className="font-semibold text-md text-gray-900 mt-6 mb-3 uppercase">Brands</h3>
              {visibleBrands.map((brand) => {
                const key = `brand:${brand.name.toLowerCase()}`;
                return (
                  <label key={key} className="flex items-center text-sm mb-2">
                    <input
                      type="checkbox"
                      checked={selectedFilters[key] || false}
                      onChange={() => handleFilterChange(key)}
                      className="w-4 h-4 mr-3 accent-orange-500"
                    />
                    <span
                      className={`uppercase ${selectedFilters[key] ? 'text-blue-600' : 'text-gray-700'}`}
                    >
                      {brand.name}
                    </span>
                  </label>
                );
              })}
              {brands.length > 7 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-blue-600 text-sm mt-2 flex items-center"
                >
                  {showAll ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" />
                      See Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-1" />
                      See More
                    </>
                  )}
                </button>
              )}

              {/* Price Filter */}
              <div className="mt-8">
                <h3 className="font-semibold text-md text-gray-900 mb-3 uppercase">Price</h3>
                <Range
                  step={STEP}
                  min={MIN}
                  max={MAX}
                  values={safeValues}
                  onChange={setValues}
                  renderTrack={({ props, children }) => (
                    <div
                      ref={props.ref}
                      onMouseDown={props.onMouseDown}
                      onTouchStart={props.onTouchStart}
                      className="h-2 bg-gray-200 rounded-full relative"
                    >
                      <div
                        className="absolute h-2 bg-teal-500 rounded-full"
                        style={{
                          left: `${((values[0] - MIN) / (MAX - MIN)) * 100}%`,
                          width: `${((values[1] - values[0]) / (MAX - MIN)) * 100}%`,
                        }}
                      />
                      {children}
                    </div>
                  )}
                  renderThumb={(renderProps, index) => {
                    const { key, ...restProps } = renderProps.props;
                    return (
                      <div
                        key={key ?? `thumb-${index}`}
                        {...restProps}
                        className="w-4 h-4 bg-teal-500 rounded-full shadow-md border-2 border-white"
                      />
                    );
                  }}
                />
                <div className="flex justify-between text-sm mt-4">
                  <span>Min: ₹{values[0]}</span>
                  <span>Max: ₹{values[1]}</span>
                </div>
                <button
                  onClick={handlePriceGo}
                  className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-1 rounded text-sm font-medium border border-gray-300"
                >
                  GO
                </button>
              </div>

              {/* Attributes */}
              {/* Attributes */}
              {products.length > 0 && attributes.map((attr) => (
                <div key={attr.name} className="mt-6">
                  <h3 className="font-semibold text-md text-gray-900 mb-3 uppercase">{attr.name}</h3>
                  {attr.values.map((value) => {
                    const key = `attr:${attr.name.toLowerCase()}:${value.toLowerCase()}`;
                    return (
                      <label key={key} className="flex items-center text-sm mb-2">
                        <input
                          type="checkbox"
                          checked={selectedFilters[key] || false}
                          onChange={() => handleFilterChange(key)}
                          className="w-4 h-4 mr-3 accent-orange-500"
                        />
                        <span
                          className={`uppercase ${selectedFilters[key] ? 'text-blue-600' : 'text-gray-700'}`}
                        >
                          {value}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ))}





            </div>

            {/* Mobile sidebar*/}
            {showMobileFilters && (
              <div className="fixed inset-0 top-[12%] z-50 bg-white w-full h-full p-4 overflow-y-scroll md:hidden">
                {/* Close Button */}
                <div className="flex items-center justify-between py-3 mb-4 border-b border-gray-500">
                  <h2 className="text-lg font-semibold text-gray-800 uppercase">Filters</h2>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="text-gray-600 text-2xl font-bold"
                    aria-label="Close Filters"
                  >
                    ×
                  </button>
                </div>

                {/* Sidebar content same as desktop */}
                <div>
                  <h3 className="font-semibold text-md text-gray-900 mb-3 uppercase">Delivery Day</h3>
                  {['getItToday', 'getItTomorrow', 'getIt2Days'].map((key) => (
                    <label key={key} className="flex items-center text-sm mb-2">
                      <input
                        type="checkbox"
                        checked={selectedFilters[key] || false}
                        onChange={() => handleFilterChange(key)}
                        className="w-4 h-4 mr-3 accent-orange-500"
                      />
                      <span className="text-gray-700 uppercase">{key.replace(/([A-Z])/g, ' $1')}</span>
                    </label>
                  ))}

                  {/* Brands */}
                  <h3 className="font-semibold text-md text-gray-900 mt-6 mb-3 uppercase">Brands</h3>
                  {visibleBrands.map((brand) => {
                    const key = `brand:${brand.name.toLowerCase()}`;
                    return (
                      <label key={key} className="flex items-center text-sm mb-2">
                        <input
                          type="checkbox"
                          checked={selectedFilters[key] || false}
                          onChange={() => handleFilterChange(key)}
                          className="w-4 h-4 mr-3 accent-orange-500"
                        />
                        <span
                          className={`uppercase ${selectedFilters[key] ? 'text-blue-600' : 'text-gray-700'}`}
                        >
                          {brand.name}
                        </span>
                      </label>
                    );
                  })}
                  {brands.length > 7 && (
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="text-blue-600 text-sm mt-2 flex items-center"
                    >
                      {showAll ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" />
                          See Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" />
                          See More
                        </>
                      )}
                    </button>
                  )}

                  {/* Price Filter */}
                  <div className="mt-8">
                    <h3 className="font-semibold text-md text-gray-900 mb-3 uppercase">Price</h3>
                    <Range
                      step={STEP}
                      min={MIN}
                      max={MAX}
                      values={values}
                      onChange={setValues}
                      renderTrack={({ props, children }) => (
                        <div
                          ref={props.ref}
                          onMouseDown={props.onMouseDown}
                          onTouchStart={props.onTouchStart}
                          className="h-2 bg-gray-200 rounded-full relative"
                        >
                          <div
                            className="absolute h-2 bg-teal-500 rounded-full"
                            style={{
                              left: `${((values[0] - MIN) / (MAX - MIN)) * 100}%`,
                              width: `${((values[1] - values[0]) / (MAX - MIN)) * 100}%`,
                            }}
                          />
                          {children}
                        </div>
                      )}
                      renderThumb={({ props }) => (
                        <div
                          {...props}
                          className="w-4 h-4 bg-teal-500 rounded-full shadow-md border-2 border-white"
                        />
                      )}
                    />
                    <div className="flex justify-between text-sm mt-4">
                      <span>Min: ₹{values[0]}</span>
                      <span>Max: ₹{values[1]}</span>
                    </div>
                    <button
                      onClick={handlePriceGo}
                      className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-1 rounded text-sm font-medium border border-gray-300"
                    >
                      GO
                    </button>
                  </div>

                  {/* Attributes */}
                  {products.length > 0 && attributes.map((attr) => (
                    <div key={attr.name} className="mt-6">
                      <h3 className="font-semibold text-md text-gray-900 mb-3 uppercase">{attr.name}</h3>
                      {attr.values.map((value) => {
                        const key = `attr:${attr.name.toLowerCase()}:${value.toLowerCase()}`;
                        return (
                          <label key={key} className="flex items-center text-sm mb-2">
                            <input
                              type="checkbox"
                              checked={selectedFilters[key] || false}
                              onChange={() => handleFilterChange(key)}
                              className="w-4 h-4 mr-3 accent-orange-500"
                            />
                            <span
                              className={`uppercase ${selectedFilters[key] ? 'text-blue-600' : 'text-gray-700'}`}
                            >
                              {value}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ))}



                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 bg-white w-full p-6">
              <h2 className="text-md md:text-lg font-semibold text-gray-900 mb-1 uppercase">Results</h2>
              <p className="text-xs md:text-sm text-gray-600 uppercase mb-4">
                Check each product page for other buying options.
              </p>

              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : products?.length === 0 ? (
                <div className="flex justify-center items-center h-40">
                  <p className="text-blue-500 text-md md:text-xl font-semibold uppercase">No products found.</p>
                </div>
              ) : (
                <ProductGrid products={products} />
              )}


              {/* Pagination */}
              {products?.length > 0 && (
                <div className="mt-10 flex justify-center gap-4">
                  <button
                    onClick={() => {
                      if (currentPage > 1) {
                        const newPage = currentPage - 1;
                        setCurrentPage(newPage);
                        fetchProducts(slug, getParsedFilterValues(), newPage, sortBy, values);
                      }
                    }}
                    disabled={currentPage === 1}
                    className={`px-5 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${currentPage === 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-100 text-gray-800 border-gray-300'
                      }`}
                  >
                    ← PREVIOUS
                  </button>

                  <span className="text-gray-700 text-sm font-semibold">PAGE {currentPage}</span>

                  <button
                    onClick={() => {
                      const newPage = currentPage + 1;
                      setCurrentPage(newPage);
                      fetchProducts(slug, getParsedFilterValues(), newPage, sortBy, values);
                    }}
                    className="px-5 py-2 rounded-lg border text-sm font-medium bg-white hover:bg-gray-100 text-gray-800 border-gray-300"
                  >
                    NEXT →
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
