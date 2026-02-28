import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/middleware/verifyAuth';   
import { NextResponse } from 'next/server';

export async function GET(req, context) {
   const { id } = await context.params; 
  const productId = Number(id);

  if (!productId) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
  }

  const user = verifyAuth(req);         
  const isAdmin = user?.role === 'admin';

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        brand: true,
        images: true,
        displayImages: true,
        specifications: true,
        reviews: {
          include: { user: { select: { FullName: true } } },
        },
        variants: {
          include: {
            images: true,
            attributeMapping: {
              include: {
                value: { include: { attribute: true } },
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    /* ─── Visibility guard ───
       If the product is NOT approved and the requester is
       not an admin, hide it. You can choose 403 or 404. Here we
       return 404 to avoid leaking existence. */
    if (!product.isApproved && !isAdmin) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const seller = await prisma.user.findUnique({
      where: { UserID: product.sellerId },
      select: { FullName: true },
    });

    const relatedProducts = await prisma.product.findMany({
      where: {
        brandId: product.brandId,
        isActive: true,
        isApproved: true,
        NOT: { id: productId },
      },
      take: 10,
      select: { id: true, title: true },
    });

    const normalize = (s) => s.toLowerCase().replace(/\s+/g, '');
    let primaryAttribute = null;
    const attrSet = new Set();

    for (const v of product.variants) {
      for (const m of v.attributeMapping) attrSet.add(normalize(m.value.attribute.name));
    }
    if (attrSet.has('storage')) primaryAttribute = 'storage';
    else if (attrSet.has('size')) primaryAttribute = 'size';

    const grouped = {};
    if (primaryAttribute) {
      for (const v of product.variants) {
        const m = v.attributeMapping.find(
          (m) => normalize(m.value.attribute.name) === primaryAttribute
        );
        if (!m) continue;
        const key = normalize(m.value.value);
        if (!grouped[key])
          grouped[key] = { display: m.value.value.trim(), variants: [] };
        grouped[key].variants.push(v);
      }
    }
    const attributeValues = Object.values(grouped).map((g) => g.display);

    return NextResponse.json({
      product,
      sellerName: seller?.FullName ?? 'Unknown Seller',
      brand: {
        name: product.brand?.name ?? 'No Brand',
        imageUrl: product.brand?.imageUrl ?? null,
      },
      relatedProducts,
      variantData: {
        primaryAttribute,
        attributeValues,
        groupedVariants: grouped,
      },
    });
  } catch (err) {
    console.error('Error fetching product:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
