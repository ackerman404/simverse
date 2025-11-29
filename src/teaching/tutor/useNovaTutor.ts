import { useEffect, useState } from "react";
import type {
    TutorStage,
    TutorContext,
    TutorResponse,
} from "./novaTutorTypes";
import { requestNovaTutorMock } from "./mockNovaTutorBackend";

interface UseNovaTutorParams {
    stage: TutorStage;
    context: TutorContext | null;
}

interface UseNovaTutorResult {
    loading: boolean;
    response: TutorResponse | null;
    error: string | null;
    refresh: () => void;
}

export function useNovaTutor(
    params: UseNovaTutorParams
): UseNovaTutorResult {
    const { stage, context } = params;
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<TutorResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState(0);

    useEffect(() => {
        if (!context) {
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        requestNovaTutorMock(stage, context)
            .then((res) => {
                if (!cancelled) {
                    setResponse(res);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err?.message ?? "Failed to load tutor response");
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [stage, context, refreshToken]);

    return {
        loading,
        response,
        error,
        refresh: () => setRefreshToken((v) => v + 1),
    };
}
