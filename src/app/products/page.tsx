import type { Metadata } from "next";
import { ProductCard } from "@/components/sections/product-card";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { labProduct, products } from "@/lib/products";
import { createPageMetadata } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Products",
  description:
    "Products from Rukh Labs: Glass Squares OS, Farzin, and future lab projects.",
  path: "/products",
});

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Products"
        title="Products from Rukh Labs"
        description="Clean tools for people who are done accepting bloated software."
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
