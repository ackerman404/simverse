import { useEffect, useState } from "react";
import { CodeEditor } from "./components/CodeEditor";
import { SimulatorView } from "./components/SimulatorView";
import { UAIbotView } from "./components/UAIbotView";
import { Mission1Layout } from "./components/mission1/Mission1Layout";
import { extractCommands, type RobotCommand } from "./lib/pythonRunner";
import { buildProgram } from "./lib/programBuilder";
import type { RobotPrimitive } from "./lib/programTypes";
import { MISSIONS, type Mission } from "./missions";

const CODE_STORAGE_KEY = "simverse_nova_code_v1";
const PROGRESS_STORAGE_KEY = "simverse_nova_progress_v1";

const USE_UAIBOT_VIEW = true;

type CodeMap = Record<string, string>;
type ProgressMap = Record<string, boolean>;

function loadCodeMap(): CodeMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CODE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CodeMap) : {};
  } catch {
    return {};
  }
}

function loadProgressMap(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

function App() {
  const [currentMissionId, setCurrentMissionId] = useState(MISSIONS[0].id);
  const [code, setCode] = useState(MISSIONS[0].defaultCode);
  const [status, setStatus] = useState<string>("");
  const [commands, setCommands] = useState<RobotCommand[]>([]);
  const [program, setProgram] = useState<RobotPrimitive[]>([]);
  const [runId, setRunId] = useState(0);

  const [codeByMission, setCodeByMission] = useState<CodeMap>({});
  const [completedMissions, setCompletedMissions] = useState<ProgressMap>({});
  const [lastRunSuccess, setLastRunSuccess] = useState<boolean | null>(null);

  const currentMission: Mission =
    MISSIONS.find((m) => m.id === currentMissionId) ?? MISSIONS[0];

  const completedCount = Object.values(completedMissions).filter(Boolean).length;
  const progressPercent =
    MISSIONS.length === 0
      ? 0
      : Math.min(
        100,
        (completedCount / Math.max(1, MISSIONS.length)) * 100
      );

  // Load saved code + progress on first mount
  useEffect(() => {
    const savedCode = loadCodeMap();
    const savedProgress = loadProgressMap();
    setCodeByMission(savedCode);
    setCompletedMissions(savedProgress);

    const initialMission = MISSIONS[0];
    const initialCode = savedCode[initialMission.id] ?? initialMission.defaultCode;
    setCurrentMissionId(initialMission.id);
    setCode(initialCode);
  }, []);

  // Update code for current mission + persist
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setCodeByMission((prev) => {
      const updated: CodeMap = { ...prev, [currentMissionId]: newCode };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(CODE_STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleSelectMission = (id: string) => {
    const mission = MISSIONS.find((m) => m.id === id);
    if (!mission) return;

    setCurrentMissionId(id);
    const saved = codeByMission[id] ?? mission.defaultCode;
    setCode(saved);
    setCommands([]);
    setProgram([]);
    setRunId((prev) => prev + 1);
    setStatus("");
    setLastRunSuccess(null);
  };

  const handleRun = () => {
    const cmds = extractCommands(code);
    console.log("Parsed commands:", cmds);

    setLastRunSuccess(null);

    if (cmds.length === 0) {
      setStatus(
        "No valid commands found. Use move_forward(), turn_left(), turn_right()."
      );
      setCommands([]);
      setProgram([]);
      return;
    }

    const prog = buildProgram(cmds);
    console.log("Built program:", prog);

    setCommands(cmds);
    setProgram(prog);
    setRunId((prev) => prev + 1);
    setStatus(
      `Running simulation... Tracking Nova on ${currentMission.planet}.`
    );
  };

  const handleReset = () => {
    setCommands([]);
    setProgram([]);
    setRunId((prev) => prev + 1);
    setStatus("Mission reset. Nova is back at the landing site.");
    setLastRunSuccess(null);
  };

  const handleResetToStarter = () => {
    const starter = currentMission.defaultCode;
    setCode(starter);

    setCodeByMission((prev) => {
      const updated: CodeMap = { ...prev, [currentMission.id]: starter };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(CODE_STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });

    setCommands([]);
    setProgram([]);
    setRunId((prev) => prev + 1);

    setStatus("Starter code restored for this mission.");
    setLastRunSuccess(null);
  };

  const handleResult = (success: boolean) => {
    if (commands.length === 0) return;
    setLastRunSuccess(success);

    if (success) {
      setStatus(
        `✅ Mission complete! Nova reached the beacon for ${currentMission.shortName}.`
      );
      setCompletedMissions((prev) => {
        const updated: ProgressMap = { ...prev, [currentMission.id]: true };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            PROGRESS_STORAGE_KEY,
            JSON.stringify(updated)
          );
        }
        return updated;
      });
    } else {
      setStatus(
        "🛰️ Nova missed the beacon. Adjust your route and try the mission again."
      );
    }
  };

  if (currentMissionId === "exo1-m1") {
    return (
      <Mission1Layout
        mission={currentMission}
        code={code}
        onCodeChange={handleCodeChange}
        onRun={handleRun}
        onReset={handleReset}
        status={status}
        lastRunSuccess={lastRunSuccess}
        program={program}
        runId={runId}
        commands={commands}
        onResult={handleResult}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Simverse: Nova Missions</h1>
          <p className="text-xs text-slate-400">
            Off-world rover programming for future explorers
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm text-emerald-400 font-medium">
            Planet {currentMission.planet} · {currentMission.shortName}
          </span>
          <span className="text-[0.7rem] text-slate-400">
            {completedCount}/{MISSIONS.length} missions complete
          </span>
        </div>
      </header>

      {/* Mission tabs */}
      <div className="px-6 pt-3 flex flex-wrap gap-2">
        {MISSIONS.map((m) => {
          const active = m.id === currentMissionId;
          const completed = completedMissions[m.id];

          let classes =
            "px-3 py-1 rounded-full text-xs border flex items-center gap-1 transition-colors ";
          if (active) {
            classes +=
              "bg-emerald-500 text-slate-900 border-emerald-400 shadow-sm shadow-emerald-500/40";
          } else if (completed) {
            classes +=
              "bg-emerald-950/40 text-emerald-200 border-emerald-500/40 hover:bg-emerald-900/40";
          } else {
            classes +=
              "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800";
          }

          return (
            <button
              key={m.id}
              onClick={() => handleSelectMission(m.id)}
              className={classes}
            >
              <span className="inline-flex items-center gap-1">
                {active && <span>🛰️</span>}
                <span>
                  {m.shortName}: {m.title}
                </span>
              </span>
              {completed && !active && <span>⭐</span>}
              {completed && active && <span>⭐</span>}
            </button>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="px-6 pt-2 flex items-center gap-3 text-xs text-slate-400">
        <span>
          Progress:{" "}
          <span className="text-emerald-400 font-medium">
            {completedCount}
          </span>{" "}
          / {MISSIONS.length} missions complete
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <main className="p-6 pt-4 grid grid-cols-2 gap-4 h-[calc(100vh-104px)]">
        <div className="h-full">
          <CodeEditor code={code} onChange={handleCodeChange} />
        </div>

        <div className="h-full flex flex-col border border-slate-800 rounded-lg p-4 bg-slate-950/60">
          {lastRunSuccess && (
            <div className="mb-3 rounded-md border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-xs flex items-center justify-between">
              <div>
                <span className="mr-1">🎉</span>
                <span className="font-semibold text-emerald-300">
                  Mission complete!
                </span>{" "}
                <span className="text-slate-200">
                  Nova reached the beacon for {currentMission.shortName}.
                </span>
              </div>
              <button
                className="ml-3 text-slate-300 hover:text-slate-100"
                onClick={() => setLastRunSuccess(null)}
              >
                ✕
              </button>
            </div>
          )}

          <div className="mb-3">
            <h2 className="text-lg font-semibold">Mission Briefing</h2>
            <p className="text-xs text-slate-400 mt-1 whitespace-pre-line">
              {currentMission.briefing}
            </p>
          </div>

          <h2 className="text-lg font-semibold mb-2">Nova Simulator</h2>

          <div className="mb-3">
            {USE_UAIBOT_VIEW ? (
              <div className="relative">
                {/* Main: 3D surface cam */}
                <UAIbotView
                  world={currentMission.world}
                  program={program}
                  runId={runId}
                />

                {/* Overlay: 2D orbital map as a minimap */}
                <div className="absolute bottom-3 left-3 w-2/5 max-w-xs border border-slate-700 rounded-md bg-slate-900/90 shadow-lg shadow-black/60">
                  <SimulatorView
                    commands={commands}
                    program={program}
                    runId={runId}
                    world={currentMission.world}
                    onResult={handleResult}
                  />
                </div>


                {/* Small legend in the top-right */}
                <div className="absolute top-2 right-3 text-[0.65rem] text-slate-300 bg-slate-900/80 px-2 py-1 rounded-full border border-slate-700 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Surface cam
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    Orbital map
                  </span>
                </div>
              </div>
            ) : (
              // Fallback: only 2D view when UAIbot is off
              <SimulatorView
                commands={commands}
                program={program}
                runId={runId}
                world={currentMission.world}
                onResult={handleResult}
              />
            )}
          </div>


          <div className="flex gap-2 mb-2">
            <button
              className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-sm font-medium"
              onClick={handleRun}
            >
              Run Mission
            </button>
            <button
              className="px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-sm"
              onClick={handleReset}
            >
              Reset
            </button>
            <button
              className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
              onClick={handleResetToStarter}
            >
              Reset to Starter
            </button>
          </div>

          <div className="text-sm text-slate-300 min-h-[1.5rem]">
            {status && <span>{status}</span>}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
