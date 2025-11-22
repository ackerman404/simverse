import React from "react";

interface RoverBlueprintStripProps {
    movementOnline: boolean;
}

interface SystemStatus {
    name: string;
    status: "online" | "offline" | "locked";
    icon: string;
}

export function RoverBlueprintStrip({ movementOnline }: RoverBlueprintStripProps) {
    const systems: SystemStatus[] = [
        { name: "Chassis", status: "online", icon: "🏗️" },
        { name: "Movement", status: movementOnline ? "online" : "offline", icon: "⚙️" },
        { name: "Sensors", status: "locked", icon: "📡" },
        { name: "AI Core", status: "locked", icon: "🧠" },
    ];

    return (
        <div className="w-full bg-slate-950 border-b border-slate-800 px-6 py-3 flex items-center gap-6 overflow-x-auto">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Prototype R-0 Blueprint
            </div>

            <div className="flex items-center gap-4 flex-1">
                {systems.map((sys) => (
                    <div
                        key={sys.name}
                        className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all
              ${sys.status === "online"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : sys.status === "offline"
                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse"
                                    : "bg-slate-900 border-slate-800 text-slate-600"
                            }
            `}
                    >
                        <span className="text-base">{sys.icon}</span>
                        <span>{sys.name}</span>
                        <span className="ml-1 text-[0.65rem] uppercase opacity-70">
                            {sys.status}
                        </span>
                    </div>
                ))}
            </div>

            <div className="text-xs text-slate-600 font-mono">
                SYS_CHECK: <span className={movementOnline ? "text-emerald-400" : "text-amber-400"}>
                    {movementOnline ? "ALL_SYSTEMS_GO" : "WAITING_FOR_INPUT"}
                </span>
            </div>
        </div>
    );
}
