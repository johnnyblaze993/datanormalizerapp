import { NextRequest, NextResponse } from "next/server";
import {
	normalizeForRelational,
	normalizeForDocument,
	normalizeForNoSQL,
} from "@/utils/normalization";

export async function POST(req: NextRequest) {
	const { data, dbType, idStrategy } = await req.json();
	let normalized;
	switch (dbType) {
		case "relational":
			normalized = normalizeForRelational(data, idStrategy);
			break;
		case "document":
			normalized = normalizeForDocument(data, idStrategy);
			break;
		case "nosql":
			normalized = normalizeForNoSQL(data, idStrategy);
			break;
		default:
			return NextResponse.json(
				{ error: "Unknown database type" },
				{ status: 400 }
			);
	}
	return NextResponse.json(normalized);
}
