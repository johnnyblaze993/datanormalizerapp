"use client";

import React, { useCallback } from "react";
import { useDataStore } from "@/store/dataStore";
import { useNormalize } from "@/hooks/useNormalize";
import { FileUpload } from "@/components/FileUpload";
import { DatabaseTypeSelector } from "@/components/DatabaseTypeSelector";
import { IdStrategySelector } from "@/components/IdStrategySelector";
import { DataPreview } from "@/components/DataPreview";
import { ExportButtons } from "@/components/ExportButtons";
import { useDataPreview } from "@/hooks/useDataPreview";

const DataNormalizerPage = () => {
    const {
        originalData,
        normalizedData,
        selectedDbType,
        selectedIdStrategy,
        fileName,
        isLoading,
        error,
        previewMode,
        updateState,
        reset,
    } = useDataStore();
    const normalizeMutation = useNormalize();

    const handleFileUpload = useCallback((data: any[], name: string) => {
        updateState({ originalData: data, fileName: name, normalizedData: null });
    }, [updateState]);

    const handleNormalize = () => {
        if (!originalData) return;
        normalizeMutation.mutate(
            {
                data: originalData,
                dbType: selectedDbType,
                idStrategy: selectedIdStrategy,
            },
            {
                onSuccess: (result: any) => updateState({ normalizedData: result, error: null }),
                onError: (err: any) => updateState({ error: err.message }),
            }
        );
    };

    const previewData = useDataPreview();
    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold">Data Normalizer</h1>
                <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
                {originalData && (
                    <>
                        <DatabaseTypeSelector
                            selectedDbType={selectedDbType}
                            onTypeChange={(type) => updateState({ selectedDbType: type, normalizedData: null })}
                        />
                        <IdStrategySelector
                            selectedStrategy={selectedIdStrategy}
                            onStrategyChange={(strategy) => updateState({ selectedIdStrategy: strategy, normalizedData: null })}
                        />
                        <button
                            className="px-4 py-2 bg-blue-600 text-white rounded mt-4"
                            onClick={handleNormalize}
                            disabled={isLoading || !originalData}
                        >
                            Normalize Data
                        </button>
                    </>
                )}
                {error && <div className="text-red-600">{error}</div>}
                {originalData && (
                    <DataPreview
                        data={originalData}
                        title="Original Data"
                        previewMode={previewMode}
                        onPreviewModeChange={(mode) => updateState({ previewMode: mode })}
                    />
                )}
                {normalizedData && previewData && (
                    <>
                        <DataPreview
                            data={previewData}
                            title={`Normalized Data (${selectedDbType})`}
                            previewMode={previewMode}
                            onPreviewModeChange={(mode) => updateState({ previewMode: mode })}
                        />
                        <ExportButtons />
                    </>
                )}
            </div>
        </div>
    );
};

export default DataNormalizerPage;