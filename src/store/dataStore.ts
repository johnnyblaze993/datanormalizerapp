import { create } from "zustand";

interface DataStoreState {
	originalData: any[] | null;
	normalizedData: any | null;
	selectedDbType: string;
	selectedIdStrategy: string;
	fileName: string;
	isLoading: boolean;
	error: string | null;
	previewMode: "table" | "json";
	updateState: (updates: Partial<DataStoreState>) => void;
	reset: () => void;
}

export const useDataStore = create<DataStoreState>((set) => ({
	originalData: null,
	normalizedData: null,
	selectedDbType: "relational",
	selectedIdStrategy: "sequential",
	fileName: "",
	isLoading: false,
	error: null,
	previewMode: "table",
	updateState: (updates) => set((state) => ({ ...state, ...updates })),
	reset: () =>
		set((state) => ({
			...state,
			originalData: null,
			normalizedData: null,
			fileName: "",
			error: null,
		})),
}));
