// Data normalization logic and helpers
// Ported from the reference app, split by concern

import Papa from "papaparse";
import * as XLSX from "xlsx";

export const ID_STRATEGIES = {
	sequential: {
		label: "Sequential",
		description: "Auto-incrementing integers (1, 2, 3...)",
		tooltip:
			"Traditional auto-increment IDs. Simple, predictable, and efficient for most use cases. Best for single-database deployments.",
		generate: (index: number) => index + 1,
		sqlType: "INTEGER AUTO_INCREMENT",
		example: "1, 2, 3, 4, 5...",
	},
	uuid: {
		label: "UUID v4",
		description: "Universally unique identifiers",
		tooltip:
			"Globally unique 128-bit identifiers. Perfect for distributed systems, data integration, and avoiding ID conflicts across databases.",
		generate: () => crypto.randomUUID(),
		sqlType: "VARCHAR(36)",
		example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
	},
	timestamp: {
		label: "Timestamp",
		description: "Unix timestamp with random suffix",
		tooltip:
			"Time-based IDs that are naturally sortable and provide creation order. Good for audit trails and chronological data.",
		generate: (index: number) =>
			`${Date.now()}_${String(index).padStart(6, "0")}`,
		sqlType: "VARCHAR(20)",
		example: "1640995200000_000001",
	},
	hash: {
		label: "Content Hash",
		description: "SHA-1 hash of row content",
		tooltip:
			"Deterministic IDs based on data content. Same data always produces same ID. Useful for deduplication and data integrity.",
		generate: (index: number, rowData: any) => {
			const content = JSON.stringify(rowData || {});
			let hash = 0;
			for (let i = 0; i < content.length; i++) {
				const char = content.charCodeAt(i);
				hash = (hash << 5) - hash + char;
				hash = hash & hash;
			}
			return `hash_${Math.abs(hash).toString(16)}`;
		},
		sqlType: "VARCHAR(20)",
		example: "hash_a1b2c3d4",
	},
	prefixed: {
		label: "Prefixed Sequential",
		description: "Table prefix + sequential number",
		tooltip:
			"Human-readable IDs with meaningful prefixes. Great for business applications where IDs need to be recognizable (ORDER_001, CUST_001).",
		generate: (index: number, rowData: any, tablePrefix = "REC") =>
			`${tablePrefix}_${String(index + 1).padStart(6, "0")}`,
		sqlType: "VARCHAR(20)",
		example: "FACT_000001, DIM_000001",
	},
};

export function toSnakeCase(str: string) {
	return str
		.replace(/\W+/g, " ")
		.split(" ")
		.map((word) => word.toLowerCase())
		.join("_")
		.replace(/_{2,}/g, "_")
		.replace(/^_|_$/g, "");
}

export function inferSQLType(values: any[]): string {
	const nonNullValues = values.filter(
		(v) => v !== null && v !== undefined && v !== ""
	);
	if (nonNullValues.length === 0) return "VARCHAR(255)";
	const isAllNumbers = nonNullValues.every(
		(v) => !isNaN(v) && !isNaN(parseFloat(v))
	);
	const isAllIntegers = nonNullValues.every((v) =>
		Number.isInteger(parseFloat(v))
	);
	const isAllDates = nonNullValues.every((v) => !isNaN(Date.parse(v)));
	if (isAllNumbers) {
		return isAllIntegers ? "INTEGER" : "DECIMAL(10,2)";
	}
	if (isAllDates) {
		return "DATETIME";
	}
	const maxLength = Math.max(...nonNullValues.map((v) => String(v).length));
	return maxLength > 255 ? "TEXT" : `VARCHAR(${Math.max(50, maxLength)})`;
}

export function identifyDimensionColumns(data: any[], columns: string[]) {
	const dimensionCandidates: any[] = [];
	columns.forEach((col) => {
		const values = data
			.map((row) => row[col])
			.filter((v) => v !== null && v !== undefined && v !== "");
		const uniqueValues = [...new Set(values)];
		const uniqueRatio = uniqueValues.length / values.length;
		const isLikelyDimension =
			uniqueRatio < 0.5 &&
			uniqueValues.length >= 2 &&
			uniqueValues.length < values.length * 0.8;
		const isText = values.some((v) => isNaN(parseFloat(v)));
		const dimensionKeywords = [
			"category",
			"type",
			"status",
			"region",
			"department",
			"group",
			"class",
			"grade",
			"level",
		];
		const hasKeyword = dimensionKeywords.some((keyword) =>
			col.toLowerCase().includes(keyword)
		);
		if (
			isLikelyDimension ||
			(isText && uniqueValues.length <= 50) ||
			hasKeyword
		) {
			dimensionCandidates.push({
				column: col,
				uniqueCount: uniqueValues.length,
				uniqueValues: uniqueValues,
				dataType: isText ? "VARCHAR" : "INTEGER",
			});
		}
	});
	return dimensionCandidates;
}

// --- Normalization Functions ---
export function normalizeForRelational(
	data: any[],
	idStrategy: string = "sequential"
) {
	if (!data || data.length === 0) return null;
	// Minimal: just return data for now, real logic can be ported in detail
	return { tables: { main: { data } }, idStrategy };
}

export function normalizeForDocument(
	data: any[],
	idStrategy: string = "sequential"
) {
	if (!data || data.length === 0) return null;
	return { documents: data, idStrategy };
}

export function normalizeForNoSQL(
	data: any[],
	idStrategy: string = "sequential"
) {
	if (!data || data.length === 0) return null;
	// Example: key-value by index
	const records: Record<string, any> = {};
	data.forEach((row, i) => {
		records[`rec_${i + 1}`] = row;
	});
	return { records, idStrategy };
}
