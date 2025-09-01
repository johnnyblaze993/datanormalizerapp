// A tiny CSV helper to avoid pulling the full papaparse library in tests.
// It supports the minimal features needed by the app: parsing CSV with
// headers and converting arrays of objects back to CSV strings.

export interface ParseOptions {
    header?: boolean;
    skipEmptyLines?: boolean;
    complete?: (result: { data: any[] }) => void;
}

function parse(csv: string, options: ParseOptions = {}) {
    const lines = csv.split(/\r?\n/);
    if (options.skipEmptyLines) {
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim() === "") lines.splice(i, 1);
        }
    }

    if (!options.header) {
        const data = lines.map((line) => line.split(","));
        options.complete?.({ data });
        return;
    }

    const headerLine = lines.shift() || "";
    const headers = headerLine.split(",");
    const data = lines.map((line) => {
        const values = line.split(",");
        const obj: Record<string, any> = {};
        headers.forEach((h, i) => (obj[h] = values[i] ?? ""));
        return obj;
    });
    options.complete?.({ data });
}

function unparse(data: any[]) {
    if (!Array.isArray(data) || data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const rows = data.map((row) => headers.map((h) => row[h] ?? "").join(","));
    return headers.join(",") + "\n" + rows.join("\n");
}

export default { parse, unparse };

