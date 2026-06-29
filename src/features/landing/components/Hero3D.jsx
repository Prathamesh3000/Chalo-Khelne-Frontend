import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

const COLORS = ["#15A765", "#22c55e", "#0e7a4b", "#3b82f6", "#ffffff"];

function Spheres() {
  const group = useRef();
  const mouse = useRef({ x: 0, y: 0 });

  const data = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 13; i++) {
      arr.push({
        pos: [
          (Math.random() - 0.5) * 11,
          (Math.random() - 0.5) * 7,
          (Math.random() - 0.5) * 5,
        ],
        scale: 0.18 + Math.random() * 0.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        speed: 0.4 + Math.random() * 0.9,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = group.current;
    if (!g) return;
    g.rotation.y = t * 0.05;
    // ease toward cursor for parallax depth
    g.position.x += (mouse.current.x * 1.6 - g.position.x) * 0.04;
    g.position.y += (mouse.current.y * 1.0 - g.position.y) * 0.04;
    for (let i = 0; i < g.children.length; i++) {
      const d = data[i];
      g.children[i].position.y = d.pos[1] + Math.sin(t * d.speed + d.offset) * 0.45;
    }
  });

  return (
    <group ref={group}>
      {data.map((d, i) => (
        <mesh key={i} position={d.pos} scale={d.scale}>
          <sphereGeometry args={[1, 14, 14]} />
          <meshBasicMaterial color={d.color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export default function Hero3D() {
  if (typeof window === "undefined") return null;
  if (window.matchMedia("(pointer: coarse)").matches) return null;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;

  return (
    <Canvas
      className="!absolute inset-0"
      style={{ pointerEvents: "none" }}
      camera={{ position: [0, 0, 8], fov: 50 }}
      dpr={[1, 1.25]}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
    >
      <Spheres />
    </Canvas>
  );
}
