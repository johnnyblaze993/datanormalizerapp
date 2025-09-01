import { useDataStore } from "@/store/dataStore";

export function useDataPreview() {
	const { normalizedData, selectedDbType } = useDataStore();
	if (!normalizedData) return null;
        switch (selectedDbType) {
                case "relational":
                        return normalizedData.tables?.fact_main_data?.data || [];
                case "document":
                        return normalizedData.documents || [];
                case "nosql":
                        return Object.values(normalizedData.records || {});
                default:
                        return [];
        }
}
