import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = process.env.NOTIFICATION_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Missing API token" }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const targetUrl = `http://20.207.122.201/evaluation-service/notifications${
    searchParams.toString() ? "?" + searchParams.toString() : ""
  }`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend API responded with ${response.status}: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch from backend" }, { status: 500 });
  }
}
