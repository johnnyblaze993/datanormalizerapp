import React from "react";

interface DataPreviewProps {
    data: any[];
    title: string;
    previewMode: "table" | "json";
    onPreviewModeChange: (mode: "table" | "json") => void;
}

export const DataPreview: React.FC<DataPreviewProps> = ({ data, title, previewMode, onPreviewModeChange }) => {
    if (!data) return null;
    const renderTableView = (tableData: any[]) => {
        if (!Array.isArray(tableData) || tableData.length === 0) {
            return <div className="text-gray-500">No data to display</div>;
        }
        const headers = Object.keys(tableData[0]);
        const displayData = tableData.slice(0, 100);
        return (
            <div className="overflow-x-auto max-h-96 border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            {headers.map((header) => (
                                <th key={header} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {displayData.map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                {headers.map((header) => (
                                    <td key={header} className="px-4 py-2 text-sm text-gray-900 border-b">{String(row[header] || "")}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };
    const renderJsonView = () => (
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg max-h-96 overflow-auto">
            <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
    return (
        <div className="bg-white border rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                <div className="flex rounded-md shadow-sm">
                    <button onClick={() => onPreviewModeChange("table")} className={`px-3 py-1 text-sm font-medium rounded-l-md border ${previewMode === "table" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"}`}>Table</button>
                    <button onClick={() => onPreviewModeChange("json")} className={`px-3 py-1 text-sm font-medium rounded-r-md border-t border-r border-b ${previewMode === "json" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"}`}>JSON</button>
                </div>
            </div>
            <div className="p-4">
                {previewMode === "table" ? renderTableView(data) : renderJsonView()}
                {Array.isArray(data) && data.length > 100 && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <span className="text-sm text-blue-700">Showing first 100 rows of {data.length} total rows</span>
                    </div>
                )}
            </div>
        </div>
    );
};
