import React, { useState, useEffect } from 'react';
import Brazil from '@svg-maps/brazil';
import { database } from '../../services/database';

export default function ProjectDotMap() {
    const [projects, setProjects] = useState<any[]>([]);
    
    useEffect(() => {
        const load = async () => {
            const data = await database.getRawMarketProjects();
            setProjects(data);
        };
        load();
    }, []);

    return (
        <div className="w-full h-full relative bg-gray-50 overflow-hidden flex items-center justify-center">
            <div className="w-full max-w-lg">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox={Brazil.viewBox}
                    className="w-full h-full drop-shadow-sm"
                >
                    {/* Render Brazil States */}
                    {Brazil.locations.map((location: any) => (
                        <path
                            key={location.id}
                            d={location.path}
                            id={location.id}
                            name={location.name}
                            className="fill-gray-200 stroke-white stroke-[1px]"
                            style={{ vectorEffect: 'non-scaling-stroke' }}
                        />
                    ))}

                    {/* Render Project Markers (Dots) */}
                    {projects.map((project, i) => (
                        <g key={project.id || i} className="group/marker">
                            {/* Pulse */}
                            <circle
                                cx={project.location?.coordinates?.svgX || 0}
                                cy={project.location?.coordinates?.svgY || 0}
                                r="12"
                                className="fill-primary/20 animate-ping opacity-75"
                            />
                            {/* Core Dot */}
                            <circle
                                cx={project.location?.coordinates?.svgX || 0}
                                cy={project.location?.coordinates?.svgY || 0}
                                r="4"
                                className="fill-primary"
                            />
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    );
}
