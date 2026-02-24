'use client'
import React, { useState } from 'react';
import { Star, StarHalf } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';


const ProductCard = ({ products = [] }) => {
  const router = useRouter();
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="w-4 h-4 fill-orange-400 text-orange-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <StarHalf key="half" className="w-4 h-4 fill-orange-400 text-orange-400" />
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
      );
    }

    return stars;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const getProductImage = (product) => {
    const productImage = product.images?.[0]?.imageUrl;
    const variantImage = product.variants?.[0]?.images?.[0]?.imageUrl;
    return productImage || variantImage || '/placeholder.jpg'; // fallback to placeholder if none found
  };

  const getDiscountedPrice = (price, discountPercent) => {
    if (!discountPercent || discountPercent <= 0) return price;
    return Math.round(price * (1 - discountPercent / 100));
  };

  const getTwoDaysLaterDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 2); // Add 2 days

    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }); // Example: "Thu, 11 Jul"
  };


  const getAverageRating = (reviews = []) => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / reviews.length;
  };

  const [successId, setSuccessId] = useState(null);
  const [errorId, setErrorId] = useState(null);


  async function handleAddToCart(e, variantId) {
    e.stopPropagation();

    try {
      const res = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ variantId, quantity: 1 }),
      });

      // 401 → go sign‑in
      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (res.status === 400) {
        toast.error("MAX QTY REACHED")
      }

      // non‑OK (4xx / 5xx) → treat as failure
      if (!res.ok) throw new Error((await res.json()).error || 'Request failed');

      // ✅ success animation
      setSuccessId(variantId);
      setTimeout(() => setSuccessId(null), 1500);
    } catch (err) {
      console.error('Add‑to‑cart error:', err);

      // ❌ failure animation
      setErrorId(variantId);
      setTimeout(() => setErrorId(null), 1200);

      // (optional) toast / alert
      // toast.error(err.message || 'Could not add to cart');
    }
  }




  return (
    <div className="space-y-4">
      {products.map((product, index) => {
        const avgRating = getAverageRating(product.reviews || []);
        const reviewCount = product._count?.reviews || 0;

        return (
          <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden w-full">
            {/* Desktop Layout */}
            <div className="hidden lg:block">
              <div className="p-4">
                <div className="flex items-center mb-3">
                  <span className="text-xs text-gray-500 mr-2">Sponsored</span>
                  <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">i</span>
                  </div>
                </div>

                <div className="flex gap-4 cursor-pointer " onClick={() => router.push(`/products/${product.id}`)}>
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      className="w-80 h-80 object-contain"
                    />
                  </div>


                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 mb-2 line-clamp-2  cursor-pointer uppercase" onClick={() => router.push(`/products/${product.id}`)}>
                      {product.name}
                    </h3>

                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center">
                        {renderStars(avgRating)}
                      </div>
                      <span className="text-sm text-blue-600 hover:underline cursor-pointer">
                        {reviewCount}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 mb-3">
                      {product.purchaseCount || 500}+ bought in past month
                    </div>

                    {product.stockAvailable && (
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-2xl font-medium text-gray-900">
                          {
                            formatPrice(
                              Number(
                                getDiscountedPrice(
                                  Number(product.price ?? 0),
                                  Number(product.discountPercent ?? 0)
                                )
                              ) +
                              Number(product.variants?.[0]?.additionalPrice ?? 0)
                            )
                          }
                        </span>

                        <span className="text-sm text-gray-500">
                          M.R.P:{' '}
                          <span className="line-through">
                            {formatPrice(
                              Number(product.mrp || product.price) +
                              Number(product.variants?.[0]?.additionalPrice ?? 0)
                            )}
                          </span>
                        </span>



                        <span className="text-sm text-gray-900">
                          ({Math.round(product.discountPercent || 0)}% off)
                        </span>
                      </div>
                    )}
                    {!product.stockAvailable && (
                      <div className="text-base font-medium text-red-600 mb-3 uppercase">
                        Currently unavailable
                      </div>
                    )}


                    <div className="text-sm text-gray-600 mb-3 uppercase">
                      Save extra with No Cost EMI
                    </div>

                    <div className="text-xs text-gray-600 mb-2">
                      Buy for {formatPrice(getDiscountedPrice(product.price, product.discountPercent))} with Amazon Pay
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium uppercase">
                        prime
                      </div>
                    </div>

                    <div className="text-sm mb-2">
                      <span className="font-medium">FREE delivery</span> {getTwoDaysLaterDate()}

                    </div>


                    <div className="text-sm text-gray-600 mb-4">
                      Service: Installation
                    </div>
                    <button
                      disabled={!product.stockAvailable}
                      onClick={(e) => handleAddToCart(e, product.variants?.[0]?.id)}
                      className={`px-12 py-2 text-sm font-medium uppercase rounded-sm transition-transform duration-300
    ${!product.stockAvailable
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : successId === product.variants?.[0]?.id
                            ? 'bg-blue-500 text-white scale-95'
                            : errorId === product.variants?.[0]?.id
                              ? 'bg-red-500 text-white scale-95'
                              : 'bg-yellow-400 hover:bg-yellow-500 text-black'
                        }`}
                    >
                      {!product.stockAvailable
                        ? 'Currently unavailable'
                        : successId === product.variants?.[0]?.id
                          ? '✓ Added to cart'
                          : errorId === product.variants?.[0]?.id
                            ? '✕ Failed'
                            : 'Add to cart'}
                    </button>






                    {product._count.variants > 0 && (
                      <div className="text-sm text-blue-600 hover:underline cursor-pointer">
                        +{product._count.variants - 1} other colors/patterns
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Layout */}
            <div className="block lg:hidden">
              <div className="p-3">
                <div className="flex items-center mb-2">
                  <span className="text-xs text-gray-500">Sponsored</span>
                </div>

                <div className="flex cursor-pointer gap-3" onClick={() => router.push(`/products/${product.id}`)}>
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      className="w-40 h-40 object-contain"
                    />
                  </div>

                  <div className="flex-1 min-w-0"
                  >
                    <h3 className="text-sm font-medium text-gray-900 mb-1 cursor-pointer line-clamp-3 uppercase" onClick={() => router.push(`/products/${product.id}`)}>
                      {product.name}
                    </h3>

                    <div className="flex items-center gap-1 mb-1">
                      <div className="flex items-center">
                        {renderStars(avgRating)}
                      </div>
                      <span className="text-xs text-blue-600">
                        ({reviewCount})
                      </span>
                    </div>

                    <div className="text-xs text-gray-600 mb-2">
                      {product.purchaseCount || 500}+ bought in past month
                    </div>

                    {product.stockAvailable ? (
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-lg font-medium text-gray-900">
                          {formatPrice(
                            getDiscountedPrice(product.price, product.discountPercent) +
                            Number(product.variants?.[0]?.additionalPrice ?? 0)
                          )}
                        </span>

                        <span className="text-sm text-gray-500">
                          M.R.P:{' '}
                          <span className="line-through">
                            {formatPrice(
                              Number(product.mrp ?? product.price) +
                              Number(product.variants?.[0]?.additionalPrice ?? 0)
                            )}
                          </span>
                        </span>

                        <span className="text-xs text-gray-900">
                          ({Math.round(product.discountPercent || 0)}% off)
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm text-red-600 font-semibold mb-2 uppercase">
                        Currently unavailable
                      </div>
                    )}



                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                        prime
                      </div>
                    </div>

                    <div className="text-xs mb-1">
                      <span className="font-medium">FREE delivery</span> {getTwoDaysLaterDate()}
                    </div>


                    <div className="text-xs text-gray-600 mb-3">
                      Service: Installation
                    </div>

                    <div className="text-xs text-blue-600 hover:underline cursor-pointer mb-3">
                      +{product.otherOptions || 0} other colors/patterns
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex justify-center items-center">
                  <button
                    disabled={!product.stockAvailable}
                    onClick={(e) => handleAddToCart(e, product.variants?.[0]?.id)}
                    className={`w-full py-2 text-sm font-medium uppercase rounded-sm transition-transform duration-300 md:w-[80%]
      ${!product.stockAvailable
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : successId === product.variants?.[0]?.id
                          ? 'bg-blue-500 text-white scale-95'
                          : errorId === product.variants?.[0]?.id
                            ? 'bg-red-500 text-white scale-95'
                            : 'bg-yellow-400 hover:bg-yellow-500 text-black'
                      }`}
                  >
                    {!product.stockAvailable
                      ? 'Currently unavailable'
                      : successId === product.variants?.[0]?.id
                        ? '✓ Added to cart'
                        : errorId === product.variants?.[0]?.id
                          ? '✕ Failed to add'
                          : 'Add to cart'}
                  </button>

                </div>


              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ✅ ProductGrid wrapper - receives products from parent
const ProductGrid = ({ products = [] }) => {
  return (
    <div className="xl:w-[80%] md:p-4">
      <ProductCard products={products} />
    </div>
  );
};

export default ProductGrid;
