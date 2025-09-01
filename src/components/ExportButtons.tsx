import React from "react";
import Papa from "@/utils/simplePapa";
import * as XLSX from "xlsx";
import { useDataStore } from "@/store/dataStore";
import { generateCQLSchema } from "@/utils/normalization";

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
            const records: any[] = Object.values(normalizedData.records);
            const cassandraRecords = records.map((record: any) => ({
                trainer_id: record.trainer_id,
                pokemon_id: record.pokemon_id,
                species: record.species,
                level: record.level,
                ability: record.ability,
                moves: record.moves,
                primary_type: record.primary_type,
                secondary_type: record.secondary_type,
                timestamp: record.timestamp,
                ttl: record.ttl,
            }));
            const csv = Papa.unparse(cassandraRecords);
            downloadFile(csv, `nosql_for_cassandra_copy_${baseFileName}.csv`, "text/csv");
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

    const handleDownloadCQL = () => {
        if (selectedDbType !== "nosql" || !normalizedData) return;
        const cql = generateCQLSchema(normalizedData);
        downloadFile(cql, `roster_by_trainer_schema_${baseFileName}.cql`, "text/plain");
    };

    return (
        <div className="space-x-2 mt-4">
            <button className="px-4 py-2 border rounded" onClick={handleDownloadJson}>Download JSON</button>
            <button className="px-4 py-2 border rounded" onClick={handleDownloadExcel}>Download Excel</button>
            <button className="px-4 py-2 border rounded" onClick={handleDownloadCSV}>Download CSV</button>
            {selectedDbType === "nosql" && (
                <button className="px-4 py-2 border rounded" onClick={handleDownloadCQL}>Download CQL</button>
            )}
        </div>
    );
};
