import { useEffect, useState } from "react";
import { CodeEditor } from "./components/CodeEditor";
import { SimulatorView } from "./components/SimulatorView";
import { UAIbotView } from "./components/UAIbotView";
import { Mission1Layout } from "./components/mission1/Mission1Layout";
import { Mission2Layout } from "./components/mission2/Mission2Layout";
import { TeachingStage } from "./components/TeachingStage";
import { runPython } from "./lib/pythonRunner";
import type { RobotCommand } from "./lib/pythonRunner";
// import { buildProgram } from "./lib/programBuilder"; // No longer needed
import type { RobotPrimitive } from "./lib/programTypes";
import { MISSIONS, type Mission } from "./missions";

const CODE_STORAGE_KEY = "simverse_nova_code_v1";
const CHALLENGE_CODE_STORAGE_KEY = "simverse_nova_challenge_code_v1";
const PROGRESS_STORAGE_KEY = "simverse_nova_progress_v1";
const TRAINING_PROGRESS_STORAGE_KEY = "simverse_nova_training_progress_v1";
const ROVER_CONFIG_STORAGE_KEY = "simverse_rover_config";

import { RoverMovementRewardStage, type MovementConfig } from "./rover/RoverMovementRewardStage";

import { RoverGarage } from "./rover/RoverGarage";

import { SolarSystemHome } from "./home/SolarSystemHome";

const USE_UAIBOT_VIEW = true;

type CodeMap = Record<string, string>;
type ProgressMap = Record<string, boolean>;

function loadCodeMap(key: string): CodeMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as CodeMap) : {};
  } catch {
    return {};
  }
}

function loadProgressMap(key: string): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

type LastSuccessfulRun = {
  missionId: string;
  path: { x: number; y: number }[];
};

type ActiveStage = "missions" | "playing" | "teaching" | "rewardMovement" | "garage";

interface RoverConfig {
  movement: MovementConfig;
}

function loadRoverConfig(): RoverConfig {
  if (typeof window === "undefined") return { movement: { color: "#f97316", wheelScale: 1.0 } };
  try {
    const raw = window.localStorage.getItem(ROVER_CONFIG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { movement: { color: "#f97316", wheelScale: 1.0 } };
  } catch {
    return { movement: { color: "#f97316", wheelScale: 1.0 } };
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
  const [challengeCodeByMission, setChallengeCodeByMission] = useState<CodeMap>({});
  const [completedMissions, setCompletedMissions] = useState<ProgressMap>({});
  const [trainingProgress, setTrainingProgress] = useState<ProgressMap>({});
  const [lastRunSuccess, setLastRunSuccess] = useState<boolean | null>(null);
  const [lastSuccessfulRunData, setLastSuccessfulRunData] = useState<LastSuccessfulRun | null>(null);
  const [isChallengeMode, setIsChallengeMode] = useState(false);

  // New state for stages
  const [activeStage, setActiveStage] = useState<ActiveStage>("missions");
  const [roverConfig, setRoverConfig] = useState<RoverConfig>(loadRoverConfig);
  const [rewardSource, setRewardSource] = useState<"unlock" | "garage">("unlock");

  const currentMission: Mission =
    MISSIONS.find((m) => m.id === currentMissionId) ?? MISSIONS[0];

  // ... (existing effects and handlers)
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
    const savedCode = loadCodeMap(CODE_STORAGE_KEY);
    const savedChallengeCode = loadCodeMap(CHALLENGE_CODE_STORAGE_KEY);
    const savedProgress = loadProgressMap(PROGRESS_STORAGE_KEY);
    const savedTraining = loadProgressMap(TRAINING_PROGRESS_STORAGE_KEY);
    setCodeByMission(savedCode);
    setChallengeCodeByMission(savedChallengeCode);
    setCompletedMissions(savedProgress);
    setTrainingProgress(savedTraining);

    const initialMission = MISSIONS[0];
    const initialCode = savedCode[initialMission.id] ?? initialMission.defaultCode;
    setCurrentMissionId(initialMission.id);
    setCode(initialCode);
  }, []);

  // Update code for current mission + persist
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (isChallengeMode) {
      setChallengeCodeByMission((prev) => {
        const updated: CodeMap = { ...prev, [currentMissionId]: newCode };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(CHALLENGE_CODE_STORAGE_KEY, JSON.stringify(updated));
        }
        return updated;
      });
    } else {
      setCodeByMission((prev) => {
        const updated: CodeMap = { ...prev, [currentMissionId]: newCode };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(CODE_STORAGE_KEY, JSON.stringify(updated));
        }
        return updated;
      });
    }
  };

  const handleSelectMission = (id: string) => {
    const mission = MISSIONS.find((m) => m.id === id);
    if (!mission) return;

    setCurrentMissionId(id);
    setIsChallengeMode(false); // Reset challenge mode on mission switch
    const saved = codeByMission[id] ?? mission.defaultCode;
    setCode(saved);
    setCommands([]);
    setProgram([]);
    setRunId((prev) => prev + 1);
    setStatus("");
    setLastRunSuccess(null);
  };

  const handleRun = async () => {
    // Clear previous state
    setLastRunSuccess(null);
    setStatus(`Running simulation... Tracking Nova on ${currentMission.planet}.`);
    setCommands([]); // We don't use commands list for UI anymore with Skulpt, or we could populate it from primitives?
    // Actually, we can't easily get the list of commands *before* running with Skulpt unless we parse it.
    // But we want to run it.

    try {
      // Convert mission world to WorldGeometry
      const worldGeo = {
        obstacles: [] as any[]
      };
      if (currentMission.world.crater) {
        worldGeo.obstacles.push({
          type: "circle",
          x: currentMission.world.crater.x,
          y: currentMission.world.crater.y,
          radius: currentMission.world.crater.rx // approximating ellipse as circle for sensor
        });
      }

      // Run Python code
      // We pass the start pose so the runner knows where the robot is
      // In challenge mode, start pose is same, but goal is different.
      // But runPython doesn't care about goal, only start.
      const startPose = currentMission.world.start;
      const prog = await runPython(code, worldGeo, startPose);

      console.log("Built program:", prog);

      setProgram(prog);
      setRunId((prev) => prev + 1);

      if (prog.length === 0) {
        setStatus("Program finished but produced no movements.");
      }
    } catch (err) {
      console.error("Python error:", err);
      setStatus(`Error: ${err}`);
    }
  };

  const handleReset = () => {
    setCommands([]);
    setProgram([]);
    setRunId((prev) => prev + 1);
    setStatus("Mission reset. Nova is back at the landing site.");
    setLastRunSuccess(null);
  };

  const handleResetToStarter = () => {
    const starter = isChallengeMode
      ? (currentMission.challenge?.starterComments ?? "")
      : currentMission.defaultCode;

    setCode(starter);

    if (isChallengeMode) {
      setChallengeCodeByMission((prev) => {
        const updated: CodeMap = { ...prev, [currentMission.id]: starter };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(CHALLENGE_CODE_STORAGE_KEY, JSON.stringify(updated));
        }
        return updated;
      });
    } else {
      setCodeByMission((prev) => {
        const updated: CodeMap = { ...prev, [currentMission.id]: starter };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(CODE_STORAGE_KEY, JSON.stringify(updated));
        }
        return updated;
      });
    }

    setCommands([]);
    setProgram([]);
    setRunId((prev) => prev + 1);

    setStatus("Starter code restored for this mission.");
    setLastRunSuccess(null);
  };

  const handleResult = (success: boolean, path?: { x: number; y: number }[]) => {
    // if (commands.length === 0) return; // Removed: commands is empty in Skulpt mode
    setLastRunSuccess(success);

    if (success) {
      console.log("App handleResult success. Path:", path);
      setStatus(
        `✅ ${isChallengeMode ? "Challenge" : "Mission"} complete! Nova reached the beacon for ${currentMission.shortName}.`
      );

      if (path && !isChallengeMode) {
        // Only save path for normal mission for replay
        setLastSuccessfulRunData({
          missionId: currentMissionId,
          path: path,
        });
      }

      if (!isChallengeMode) {
        // Training Run Success
        setTrainingProgress((prev) => {
          const updated: ProgressMap = { ...prev, [currentMission.id]: true };
          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              TRAINING_PROGRESS_STORAGE_KEY,
              JSON.stringify(updated)
            );
          }
          return updated;
        });
        setStatus(`✅ Training complete! You've reached the beacon. Proceed to Debrief.`);
      } else {
        // Challenge Mode Success (Mastery)
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
        // We will transition to reward stage via handleDebriefComplete or direct if we skip debrief?
        // Actually, for challenge mode, we might want to show a "Challenge Complete" modal or just status.
        // But the user said: "Challenge success -> Reward unlock".
        // Let's rely on the user clicking "Next" or "Debrief" to trigger the transition?
        // Or auto-transition?
        // The current flow has a "Debrief" button in Mission1Layout.
        // Let's keep it consistent.
      }
    } else {
      setStatus(
        "🛰️ Nova missed the beacon. Adjust your route and try again."
      );
    }
  };

  const handleStartDebrief = () => {
    if (currentMission.teaching && !isChallengeMode) {
      setActiveStage("teaching");
    } else {
      // Skip teaching if not configured or if in Challenge Mode (Mastery)
      handleDebriefComplete();
    }
  };

  const handleDebriefComplete = () => {
    // Transition logic
    if (currentMissionId === "exo1-m1") {
      if (isChallengeMode) {
        // Challenge Complete -> Reward
        setRewardSource("unlock");
        setActiveStage("rewardMovement");
      } else {
        // Training Complete -> Stay in Debrief (which has the "Start Challenge" button)
        // OR go back to Missions?
        // The "Complete Debrief & Continue" button in TeachingStage calls this.
        // If we are in Training mode, and we click that button, what should happen?
        // The user said: "Training success -> Debrief only. No garage part yet."
        // And "At the bottom of Debrief: ... Start Mission Challenge".
        // So the "Complete Debrief" button might be confusing if it exits.
        // But TeachingStage has "Start Mission Challenge" as a separate button now (via onStartChallenge).
        // The "Complete Debrief" button is usually for "I'm done reading".
        // If they click "Complete Debrief" in training, maybe just go back to missions?
        setActiveStage("missions");
        handleReset();
      }
    } else {
      setActiveStage("missions");
      handleReset();
    }
    setLastRunSuccess(null);
  };

  const updateMovementConfig = (config: MovementConfig) => {
    const newConfig = { ...roverConfig, movement: config };
    setRoverConfig(newConfig);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ROVER_CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    }
  };

  const goToGarage = () => {
    setActiveStage("garage");
  };

  const handleStartChallenge = () => {
    if (!currentMission.challenge) return;

    setIsChallengeMode(true);
    const saved = challengeCodeByMission[currentMissionId] ?? currentMission.challenge.starterComments;
    setCode(saved);
    setCommands([]);
    setProgram([]);
    setRunId((prev) => prev + 1);
    setStatus("");
    setLastRunSuccess(null);
    setActiveStage("playing");
  };

  // ... (existing handlers)

  if (activeStage === "teaching" && currentMission.teaching) {
    return (
      <TeachingStage
        config={currentMission.teaching}
        onComplete={handleDebriefComplete}
        lastSuccessfulRun={lastSuccessfulRunData}
        missionId={currentMission.id}
        onStartChallenge={handleStartChallenge}
      />
    );
  }

  if (activeStage === "rewardMovement") {
    return (
      <RoverMovementRewardStage
        movementConfig={roverConfig.movement}
        onUpdateMovement={updateMovementConfig}
        justUnlocked={rewardSource === "unlock"}
        onDone={() => {
          if (rewardSource === "garage") {
            setActiveStage("garage");
          } else {
            setActiveStage("missions");
            handleReset();
          }
        }}
      />
    );
  }

  if (activeStage === "garage") {
    return (
      <RoverGarage
        roverConfig={roverConfig}
        onCustomizeMovement={() => {
          setRewardSource("garage");
          setActiveStage("rewardMovement");
        }}
        onBack={() => setActiveStage("missions")}
      />
    );
  }

  if (activeStage === "missions") {
    return (
      <SolarSystemHome
        missions={MISSIONS}
        completedMissions={completedMissions}
        trainingProgress={trainingProgress}
        onStartMission={(id) => {
          handleSelectMission(id);
          // We need a way to signal that we are "in" a mission view now.
          // Since the original code rendered Mission1Layout directly when currentMissionId was set,
          // we need to introduce a new stage or flag.
          // Actually, the original code had:
          // if (currentMissionId === "exo1-m1") return <Mission1Layout ... />
          // This was at the top level return.
          //
          // To support the new flow:
          // 1. "missions" stage = SolarSystemHome
          // 2. "playing" stage = Mission1Layout (or generic MissionLayout)

          setActiveStage("playing");
        }}
        onOpenGarage={goToGarage}
      />
    );
  }

  // Playing Stage (Mission 1 or others)
  if (activeStage === "playing") {
    // For now, only Mission 1 has a layout. 
    // Future: Generic MissionLayout
    if (currentMissionId === "exo1-m1") {
      return (
        <Mission1Layout
          mission={isChallengeMode && currentMission.challenge ? {
            ...currentMission,
            title: currentMission.challenge.title,
            world: {
              ...currentMission.world,
              goal: currentMission.challenge.beacon
            }
          } : currentMission}
          code={code}
          onCodeChange={handleCodeChange}
          onRun={handleRun}
          onReset={handleResetToStarter} // Use handleResetToStarter to handle different starter codes
          status={status}
          lastRunSuccess={lastRunSuccess}
          program={program}
          runId={runId}
          commands={commands}
          onResult={handleResult}
          onStartDebrief={handleStartDebrief}
          onOpenGarage={goToGarage}
          onBack={() => {
            if (isChallengeMode) {
              // Exit challenge mode
              setIsChallengeMode(false);
              // Restore normal mission code
              const saved = codeByMission[currentMissionId] ?? currentMission.defaultCode;
              setCode(saved);
              setActiveStage("teaching"); // Go back to debrief? Or missions? Debrief seems better flow.
            } else {
              setActiveStage("missions");
            }
          }}
          isChallengeMode={isChallengeMode}
        />
      );
    }

    if (currentMissionId === "sensor_stop") {
      return (
        <Mission2Layout
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
          onStartDebrief={handleStartDebrief}
          onOpenGarage={goToGarage}
          onBack={() => setActiveStage("missions")}
        />
      );
    }

    // Fallback for other missions (placeholder)
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center flex-col gap-4">
        <h1 className="text-2xl">Mission {currentMission.title}</h1>
        <p>Coming soon...</p>
        <button onClick={() => setActiveStage("missions")} className="text-emerald-400 hover:underline">
          Back to Solar System
        </button>
      </div>
    );
  }

  return null; // Should not reach here
}

export default App;
