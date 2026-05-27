import React, { useState, useEffect } from 'react';
import Brazil from '@svg-maps/brazil';
import { database } from '../../services/database';

const hasMapCoordinates = (project: any) => (
    Number.isFinite(Number(project.location?.coordinates?.svgX)) &&
    Number.isFinite(Number(project.location?.coordinates?.svgY))
);

type ProjectDotMapProps = {
    ownedOnly?: boolean;
};

export default function ProjectDotMap({ ownedOnly = false }: ProjectDotMapProps) {
    const [projects, setProjects] = useState<any[]>([]);
    
    useEffect(() => {
        const load = async () => {
            const data = await database.getRawMarketProjects({ ownedOnly });
            setProjects((data || []).filter(hasMapCoordinates));
        };
        load();
    }, [ownedOnly]);

    return (
        <div className="w-full h-full relative bg-gray-50 overflow-hidden flex items-center justify-center">
            <div className="w-full max-w-lg">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox={Brazil.viewBox}
                    className="w-full h-full drop-shadow-sm"
                    role="img"
                    aria-label="Mapa estático de localização dos projetos"
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
                            <title>{project.name}</title>
                            <circle
                                cx={project.location?.coordinates?.svgX || 0}
                                cy={project.location?.coordinates?.svgY || 0}
                                r="7"
                                className="fill-emerald-200"
                            />
                            <circle
                                cx={project.location?.coordinates?.svgX || 0}
                                cy={project.location?.coordinates?.svgY || 0}
                                r="3.5"
                                className="fill-emerald-600 stroke-white stroke-[1.5px]"
                            />
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    );
}
