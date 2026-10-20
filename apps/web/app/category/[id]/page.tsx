import { categories, getCategory } from "@ctp/catalog";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryHub } from "@/components/CategoryHub";

export const dynamicParams = false;

export function generateStaticParams() {
  return categories.map((c) => ({ id: c.id }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: getCategory(id)?.name.en ?? "Category" };
}

export default async function CategoryPage({ params }: Props) {
  const { id } = await params;
  if (!getCategory(id)) notFound();
  return <CategoryHub id={id} />;
}
