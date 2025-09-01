import { useMutation } from "@tanstack/react-query";
import axios from "axios";

export function useNormalize() {
	return useMutation({
		mutationFn: async (payload: any) => {
			const { data } = await axios.post("/api/normalize", payload);
			return data;
		},
	});
}
