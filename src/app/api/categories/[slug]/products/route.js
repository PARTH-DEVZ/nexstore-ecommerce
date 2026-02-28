import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req, context) {
  try {
    const { slug } = await context.params ;
    const body = await req.json();

    const {
      page = 1,
      sort = 'Featured',
      minPrice = 0,
      maxPrice = 1000000,
      filters = [],
      product: highlightProductId,
    } = body;

    const pageSize = 12;
    const parsedFilters = Array.isArray(filters) ? filters : [];

    const category = await prisma.categories.findFirst({
     where: { Slug: slug?.toLowerCase() },
    });

    if (!category) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    const maxPriceInCategory = await prisma.product.aggregate({
      where: {
        categoryId: category.CategoryID,
        isActive: true,
        isApproved: true,
      },
      _max: {
        price: true,
      },
    });

    const maxPriceLimit = maxPriceInCategory._max.price
      ? Number(maxPriceInCategory._max.price) + 10000
      : 1000000;

    const brandFilters = await prisma.brand.findMany({
      where: {
        name: { in: parsedFilters },
      },
      select: { name: true },
    });

    const matchedBrandNames = brandFilters.map(b => b.name);
    const nonBrandFilters = parsedFilters.filter(f => !matchedBrandNames.includes(f));

    const baseWhere = {
      categoryId: category.CategoryID,
      isActive: true,
      isApproved: true,
      price: {
        gte: +minPrice,
        lte: +maxPrice,
      },
    };

    if (matchedBrandNames.length > 0) {
      baseWhere.brand = {
        name: { in: matchedBrandNames },
      };
    }

    const applyNonBrandFilters = nonBrandFilters.length > 0;

    const productWhere = {
      ...baseWhere,
      ...(applyNonBrandFilters && {
        OR: [
          {
            variants: {
              some: {
                attributeMapping: {
                  some: {
                    value: {
                      value: { in: nonBrandFilters },
                    },
                  },
                },
              },
            },
          },
          {
            specifications: {
              some: {
                value: { in: nonBrandFilters },
              },
            },
          },
        ],
      }),
    };

    const totalProducts = await prisma.product.count({
      where: {
        ...productWhere,
        ...(highlightProductId && {
          NOT: { id: Number(highlightProductId) },
        }),
      },
    });

    const regularProducts = await prisma.product.findMany({
      where: {
        ...productWhere,
        ...(highlightProductId && {
          NOT: { id: Number(highlightProductId) },
        }),
      },
      select: {
        id: true,
        name: true,
        price: true,
        discountPercent: true,
        stockAvailable: true,
        images: {
          take: 1,
          select: { imageUrl: true },
        },
        category: { select: { Slug: true } },
        reviews: {
          select: {
            rating: true,
          },
        },
        variants: {
          take: 1,
          select: {
            id: true,
            additionalPrice: true,
            images: {
              take: 1,
              select: { imageUrl: true },
            },
          },
        },
        _count: {
          select: {
            reviews: true,
            variants: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy:
        sort === 'PriceLowToHigh'
          ? { price: 'asc' }
          : sort === 'PriceHighToLow'
            ? { price: 'desc' }
            : { createdAt: 'desc' },
    });

    let highlightedProduct = null;
    if (highlightProductId) {
      highlightedProduct = await prisma.product.findUnique({
        where: { id: Number(highlightProductId) },
        select: {
          id: true,
          name: true,
          price: true,
          discountPercent: true,
          stockAvailable: true,
          images: {
            take: 1,
            select: { imageUrl: true },
          },
          category: { select: { Slug: true } },
          reviews: {
            select: {
              rating: true,
            },
          },
          variants: {
            take: 1,
            select: {
              id: true,
              additionalPrice: true,
              images: {
                take: 1,
                select: { imageUrl: true },
              },
            },
          },
          _count: {
            select: {
              reviews: true,
              variants: true,
            },
          },
        },
      });
    }

    const products = highlightedProduct
      ? [highlightedProduct, ...regularProducts]
      : regularProducts;

    const brands = await prisma.brand.findMany({
      where: {
        products: {
          some: {
            categoryId: category.CategoryID,
            isActive: true,
            isApproved: true,
          },
        },
      },
      select: { name: true },
      distinct: ['name'],
    });


    const attrRows = await prisma.variantAttributeValue.findMany({
      where: {
        mappings: {
          some: {
            variant: {
              product: {
                categoryId: category.CategoryID,
                isActive: true,
                isApproved: true,
              },
            },
          },
        },
      },
      select: {
        value: true,
        attribute: { select: { name: true } },
      },
    });

    const dedup = new Map();

    for (const { value, attribute } of attrRows) {
      const attrName = attribute.name.trim().toLowerCase();
      const valNormalized = value.replace(/\s+/g, '').toLowerCase();

      if (!dedup.has(attrName)) dedup.set(attrName, new Map());

      const existing = dedup.get(attrName);
      if (!existing.has(valNormalized)) {
        existing.set(valNormalized, value);
      }
    }

    const attributes = Array.from(dedup, ([name, set]) => ({
      name,
      values: Array.from(set.values()),
    }));

    return NextResponse.json({
      totalProducts: highlightedProduct ? totalProducts + 1 : totalProducts,
      products,
      brands,
      attributes,
      maxPrice: maxPriceLimit,
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
