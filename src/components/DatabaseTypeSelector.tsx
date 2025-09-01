import React from "react";

interface DatabaseTypeSelectorProps {
    selectedDbType: string;
    onTypeChange: (type: string) => void;
}

const dbTypes = [
    { value: "relational", label: "Relational (SQL)", description: "MySQL, PostgreSQL, SQLite" },
    { value: "document", label: "Document", description: "MongoDB, CouchDB" },
    { value: "nosql", label: "Key-Value", description: "Redis, DynamoDB" },
];

export const DatabaseTypeSelector: React.FC<DatabaseTypeSelectorProps> = ({ selectedDbType, onTypeChange }) => (
    <div className="space-y-3">
        {dbTypes.map((type) => (
            <div
                key={type.value}
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${selectedDbType === type.value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                onClick={() => onTypeChange(type.value)}
            >
                <div className="font-medium text-gray-900">{type.label}</div>
                <div className="text-sm text-gray-500">{type.description}</div>
            </div>
        ))}
    </div>
);
