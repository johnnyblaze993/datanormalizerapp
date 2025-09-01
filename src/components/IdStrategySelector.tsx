import React from "react";
import { ID_STRATEGIES } from "@/utils/normalization";

interface IdStrategySelectorProps {
    selectedStrategy: string;
    onStrategyChange: (strategy: string) => void;
}

export const IdStrategySelector: React.FC<IdStrategySelectorProps> = ({ selectedStrategy, onStrategyChange }) => (
    <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">ID Generation Strategy</label>
        <div className="grid grid-cols-1 gap-3">
            {Object.entries(ID_STRATEGIES).map(([key, strategy]) => (
                <div
                    key={key}
                    className={`relative p-3 border rounded-lg cursor-pointer transition-all duration-200 ${selectedStrategy === key ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                    onClick={() => onStrategyChange(key)}
                >
                    <div className="font-medium text-gray-900">{strategy.label}</div>
                    <div className="text-sm text-gray-500">{strategy.description}</div>
                    <div className="text-xs text-gray-400 mt-1">Example: {strategy.example}</div>
                </div>
            ))}
        </div>
    </div>
);
