import React from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useDataStore } from "@/store/dataStore";

export const ExportButtons: React.FC = () => {
    const { normalizedData, fileName, selectedDbType } = useDataStore();
    if (!normalizedData) return null;
    const baseFileName = fileName?.replace(/\.[^/.]+$/, "") || "data";

    const downloadFile = (content: BlobPart, filename: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    const handleDownloadJson = () => {
        const dataStr = JSON.stringify(normalizedData, null, 2);
        downloadFile(dataStr, `normalized_${selectedDbType}_${baseFileName}.json`, "application/json");
    };

    const handleDownloadCSV = () => {
        if (selectedDbType === "relational" && normalizedData.tables) {
            Object.entries(normalizedData.tables).forEach(([tableName, table]: any) => {
                if (table.data && table.data.length > 0) {
                    const csv = Papa.unparse(table.data);
                    downloadFile(csv, `${tableName}_${baseFileName}.csv`, "text/csv");
                }
            });
        } else if (selectedDbType === "document" && normalizedData.documents) {
            const csv = Papa.unparse(normalizedData.documents);
            downloadFile(csv, `documents_${baseFileName}.csv`, "text/csv");
        } else if (selectedDbType === "nosql" && normalizedData.records) {
            const records = Object.values(normalizedData.records);
            const csv = Papa.unparse(records);
            downloadFile(csv, `nosql_${baseFileName}.csv`, "text/csv");
        }
    };

    const handleDownloadExcel = () => {
        const workbook = XLSX.utils.book_new();
        if (selectedDbType === "relational" && normalizedData.tables) {
            Object.entries(normalizedData.tables).forEach(([tableName, table]: any) => {
                if (table.data && table.data.length > 0) {
                    const worksheet = XLSX.utils.json_to_sheet(table.data);
                    XLSX.utils.book_append_sheet(workbook, worksheet, tableName);
                }
            });
        } else if (selectedDbType === "document" && normalizedData.documents) {
            const worksheet = XLSX.utils.json_to_sheet(normalizedData.documents);
            XLSX.utils.book_append_sheet(workbook, worksheet, "Documents");
        } else if (selectedDbType === "nosql" && normalizedData.records) {
            const records = Object.values(normalizedData.records);
            const worksheet = XLSX.utils.json_to_sheet(records);
            XLSX.utils.book_append_sheet(workbook, worksheet, "Records");
        }
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        downloadFile(excelBuffer, `normalized_${selectedDbType}_${baseFileName}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    };

    return (
        <div className="space-x-2 mt-4">
            <button className="px-4 py-2 border rounded" onClick={handleDownloadJson}>Download JSON</button>
            <button className="px-4 py-2 border rounded" onClick={handleDownloadExcel}>Download Excel</button>
            <button className="px-4 py-2 border rounded" onClick={handleDownloadCSV}>Download CSV</button>
        </div>
    );
};
