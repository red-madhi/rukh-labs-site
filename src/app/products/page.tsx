import type { Metadata } from "next";
import { StructuredData } from "@/components/seo/structured-data";
import { ProductCard } from "@/components/sections/product-card";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { labProduct, products } from "@/lib/products";
import { createPageMetadata, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Products",
  description:
    "Explore Rukh Labs software: Glass Squares OS, a Linux desktop OS, and Farzin, an Android chess training app.",
  path: "/products",
  image: {
    url: "/opengraph-image",
    width: 1200,
    height: 630,
    alt: "Rukh Labs products",
  },
});

export default function ProductsPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${siteConfig.url}/products#collection`,
    name: "Rukh Labs products",
    url: `${siteConfig.url}/products`,
    description:
      "Rukh Labs software including Glass Squares OS and Farzin.",
    isPartOf: { "@id": `${siteConfig.url}/#website` },
    publisher: { "@id": `${siteConfig.url}/#organization` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "SoftwareApplication",
          name: product.name,
          url: `${siteConfig.url}${product.href}`,
          description: product.shortDescription,
        },
      })),
    },
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <PageHeader
        eyebrow="Products"
        title="Software built with sharper standards."
        description="Explore Glass Squares OS, Farzin, and future software from Rukh Labs."
      />
      <Section>
        <Container>
          <div className="grid gap-5 lg:grid-cols-3">
            {[...products, labProduct].map((product, index) => (
              <Reveal key={product.slug} delay={index * 0.06}>
                <ProductCard
                  product={product}
                  cta={
                    product.slug === "lab"
                      ? "Follow the Changelog"
                      : product.slug === "farzin"
                        ? "Explore Farzin"
                        : `View ${product.name}`
                  }
                />
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
