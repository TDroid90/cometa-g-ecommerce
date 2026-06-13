import { NextResponse } from "next/server";
import { getLayoutSections } from "@/lib/data";

export async function GET() {
  const sections = await getLayoutSections();
  return NextResponse.json({ data: sections });
}
