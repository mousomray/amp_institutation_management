export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import FormData from "form-data";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    console.log("PROXY AUTH HEADER:", authHeader);

    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const webFormData = await req.formData();

    const nodeFormData = new FormData();
    for (const [key, value] of webFormData.entries()) {
      nodeFormData.append(key, value as any);
    }

    const backendRes = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/institution/create-student`,
      nodeFormData,
      {
        headers: {
          ...nodeFormData.getHeaders(),
          Authorization: authHeader, // 🔥 DO NOT MODIFY
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        validateStatus: () => true,
      }
    );

    return NextResponse.json(backendRes.data, {
      status: backendRes.status,
    });
  } catch (error: any) {
    console.error("Proxy error:", error.message);
    return NextResponse.json({ message: "Proxy error" }, { status: 500 });
  }
}
