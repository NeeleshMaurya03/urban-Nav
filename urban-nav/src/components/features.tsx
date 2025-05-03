"use client";
import { useState, useRef, ComponentPropsWithoutRef, useEffect } from "react";
import { DotLottiePlayer } from "@dotlottie/react-player";
import { animate, motion, useMotionTemplate, useMotionValue, ValueAnimationTransition } from "framer-motion";

const tabs = [
  {
    icon: "/assets/lottie/vroom.lottie",
    title: "Real-Time Traffic Monitoring",
    description: "Continuously ingests live traffic feeds (camera, sensor, GPS) to predict flow, forecast congestion, allocate resources, and dynamically adjust signals.",
    backgroundPositionX: 0,
    backgroundPositionY: 0,
    backgroundSizeX: 150,
    lottieSize: 140,
    keyFeatures: [
      "Live traffic feed integration",
      "Predictive congestion modeling",
      "Dynamic signal adjustment",
      "Resource allocation optimization"
    ],
    type: "video-counter"
  },
  {
    icon: "/assets/lottie/error.lottie",
    title: "Incident Detection & Management",
    description: "Leverages computer vision to spot collisions, wrong-way drivers, overspeeding, and road blockages with automated emergency response.",
    backgroundPositionX: 98,
    backgroundPositionY: 100,
    backgroundSizeX: 235,
    lottieSize: 150,
    keyFeatures: [
      "Computer vision collision detection",
      "Automated emergency alerts",
      "Instant traffic rerouting",
      "Real-time incident reporting"
    ],
    type: "placeholder"
  },
  {
    icon: "/assets/lottie/plate.lottie",
    title: "Automatic Number Plate Recognition (ANPR)",
    description: "High-accuracy license-plate capture for tolling, restricted zones, and security enforcement.",
    backgroundPositionX: 50,
    backgroundPositionY: 50,
    backgroundSizeX: 160,
    lottieSize: 160,
    keyFeatures: [
      "Permitted vehicle classification",
      "Region-based access control",
      "Real-time violation detection",
      "Comprehensive audit logs"
    ],
    type: "anpr"
  },
  {
    icon: "/assets/lottie/stars.lottie",
    title: "Helmet-Compliance Enforcement",
    description: "AI-powered monitoring system for two-wheeler safety compliance and violation management.",
    backgroundPositionX: 75,
    backgroundPositionY: 75,
    backgroundSizeX: 140,
    lottieSize: 130,
    keyFeatures: [
      "Real-time helmet detection",
      "Automated violation alerts",
      "Standardized reporting",
      "Compliance analytics"
    ],
    type: "helmet"
  },
  {
    icon: "/assets/lottie/trafficlight.lottie",
    title: "Traffic-Light Management Dashboard",
    description: "Centralized control interface for signal optimization and emergency management.",
    backgroundPositionX: 100,
    backgroundPositionY: 100,
    backgroundSizeX: 120,
    lottieSize: 150,
    keyFeatures: [
      "Intersection health monitoring",
      "Manual signal override",
      "Emergency vehicle prioritization",
      "Peak event simulations"
    ],
    type: "simulation"
  }
];

type TabType = typeof tabs[number];
type FeatureTabProps = TabType & ComponentPropsWithoutRef<"div"> & { 
  selected: boolean; 
  expanded: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
};

const FeatureTab = ({ selected, expanded, type, title, icon, description, keyFeatures, onClick }: FeatureTabProps) => {
  const tabRef = useRef<HTMLDivElement>(null);
  const dotLottieRef = useRef<any>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Mask animation
  const xPercentage = useMotionValue(0);
  const yPercentage = useMotionValue(0);
  const maskImage = useMotionTemplate`radial-gradient(80px 80px at ${xPercentage}% ${yPercentage}%, black, transparent)`;

  useEffect(() => {
    if (!tabRef.current || !selected) return;
    const { height, width } = tabRef.current.getBoundingClientRect();
    const circumference = height * 2 + width * 2;
    const times = [
      0,
      width / circumference,
      (width + height) / circumference,
      (width * 2 + height) / circumference,
      1,
    ];
    const options: ValueAnimationTransition = { times, duration: 5, repeat: Infinity, repeatType: "loop", ease: "linear" };
    animate(xPercentage, [0, 100, 100, 0, 0], options);
    animate(yPercentage, [0, 0, 100, 100, 0], options);
  }, [selected]);

  const handleCardMouseEnter = () => {
    setIsHovered(true);
    dotLottieRef.current?.play();
  };
  const handleCardMouseLeave = () => {
    setIsHovered(false);
    dotLottieRef.current?.pause();
  };
  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const tag = (e.target as HTMLElement).tagName;
    if (!["INPUT", "BUTTON", "VIDEO", "PRE"].includes(tag)) {
      dotLottieRef.current?.seek(0);
      dotLottieRef.current?.play();
      onClick?.(e as React.MouseEvent<HTMLDivElement>);
    }
  };
  

  return (
    <div
      ref={tabRef}
      className={`relative bg-card rounded-xl p-4 transition-all cursor-pointer ${
        expanded ? "col-span-2" : ""
      } ${selected ? "ring-1 ring-primary" : "ring-1 ring-muted"} hover:bg-muted/30`}
      onClick={handleCardClick}
      onMouseEnter={handleCardMouseEnter}
      onMouseLeave={handleCardMouseLeave}
    >
      {selected && (
        <motion.div
          style={{ maskImage }}
          className="absolute inset-0 -m-px border border-primary rounded-xl"
        />
      )}
      <div className="flex items-start gap-4">
        <DotLottiePlayer
          src={icon}
          loop
          autoplay={false}
          lottieRef={dotLottieRef}
          style={{
            width: expanded ? tabs.find((t) => t.icon === icon)?.lottieSize : 70,
            height: expanded ? tabs.find((t) => t.icon === icon)?.lottieSize : 70,
          }}
        />
        <div className="flex-1">
          <h3
            className={`font-semibold mb-2 ${expanded ? "text-xl" : "text-lg"}`}
          >
            {title}
          </h3>
          {expanded && (
            <p className="text-muted-foreground mb-4">{description}</p>
          )}
          {expanded && (
            <div className="space-y-4">
              {type === "video-counter" && <VideoCounter />}
              {type === "anpr" && <ImageDetector mode="anpr" />}
              {type === "helmet" && <ImageDetector mode="helmet" />}
              {type === "simulation" && <SimulationRunner />}
              {type === "placeholder" && <p>Feature coming soon.</p>}
            </div>
          )}
        </div>
      </div>
      {expanded && (
        <div className="mt-6 border-t border-muted pt-4">
          <h4 className="text-sm font-medium mb-2">Key Features:</h4>
          <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
            {keyFeatures.map((feature, idx) => (
              <li key={idx}>{feature}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

function VideoCounter() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [counts, setCounts] = useState({ car: 0, bus: 0 });
  const [processing, setProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const handleFileUpload = async (file: File) => {
    const ws = new WebSocket('ws://localhost:5000/ws/vehicle-count');
    setSocket(ws);
    setProcessing(true);

    ws.onopen = () => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          ws.send(reader.result);
        }
      };
      reader.readAsArrayBuffer(file);
    };

    ws.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        // Handle count updates
        const data = JSON.parse(event.data);
        setCounts(data.counts);
      } else {
        // Handle video frame
        const blob = new Blob([event.data], { type: 'image/jpeg' });
        const imageBitmap = await createImageBitmap(blob);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        
        if (ctx && canvas) {
          canvas.width = imageBitmap.width;
          canvas.height = imageBitmap.height;
          ctx.drawImage(imageBitmap, 0, 0);
          animationRef.current = requestAnimationFrame(() => {});
        }
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setProcessing(false);
    };
  };

  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [socket]);

  return (
    <div onClick={(e) => e.stopPropagation()} className="space-y-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <label className="flex-1 relative cursor-pointer">
            <input 
              type="file" 
              accept="video/*" 
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) { // Add null check
                  handleFileUpload(file);
                }
              }}
              className="absolute opacity-0 w-0 h-0"
              disabled={processing}
            />
            <div className="px-4 py-2 bg-primary/20 rounded-lg border border-primary/30 hover:bg-primary/30 transition-colors">
              {processing ? "Processing..." : "Select Video File"}
            </div>
          </label>
        </div>
      </div>
      
      <div className="relative bg-black/30 backdrop-blur-lg rounded-xl overflow-hidden border border-white/20">
        <canvas 
          ref={canvasRef}
          className="w-full aspect-video bg-gray-800"
        />
        <div className="absolute bottom-4 left-4 bg-black/50 p-3 rounded-lg text-white">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-green-400">
              <div className="text-2xl font-bold">{counts.car}</div>
              <div className="text-sm">Cars</div>
            </div>
            <div className="text-blue-400">
              <div className="text-2xl font-bold">{counts.bus}</div>
              <div className="text-sm">Buses</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageDetector({ mode }: { mode: "anpr" | "helmet" }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const upload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const form = new FormData(); 
      form.append("file", file);
      const res = await fetch("http://localhost:5000/detect-helmet-plate", { method: "POST", body: form });
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className="space-y-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <label className="flex-1 relative cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={e => {
                e.stopPropagation();
                setFile(e.target.files?.[0] || null);
              }}
              className="absolute opacity-0 w-0 h-0"
              id="image-upload"
            />
            <div className="px-4 py-2 bg-primary/20 rounded-lg border border-primary/30 hover:bg-primary/30 transition-colors">
              {file ? file.name : "Select Image File"}
            </div>
          </label>
          <button
            onClick={(e) => {
              e.stopPropagation();
              upload();
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            disabled={loading}
          >
            {loading ? "Processing..." : mode === "anpr" ? "Detect Plates" : "Check Helmets"}
          </button>
        </div>
      </div>
      {result && (
        <div className="bg-black/30 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <pre className="text-sm text-white/80 whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function SimulationRunner() {
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/run-simulation");
      const data = await res.json(); 
      setMsg(data.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className="space-y-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            run();
          }} 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors w-full"
          disabled={loading}
        >
          {loading ? "Running Simulation..." : "Start Traffic Simulation"}
        </button>
      </div>
      {msg && (
        <div className="bg-black/30 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <p className="text-green-400">{msg}</p>
        </div>
      )}
    </div>
  );
}

export function Features() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [expandedTab, setExpandedTab] = useState<number | null>(null);
  const backgroundPositionX = useMotionValue(tabs[0].backgroundPositionX);
  const backgroundPositionY = useMotionValue(tabs[0].backgroundPositionY);
  const backgroundSizeX = useMotionValue(tabs[0].backgroundSizeX);

  const handleSelectTab = (index: number, e?: React.MouseEvent<HTMLDivElement>) => {
    setSelectedTab(index);
    setExpandedTab(expandedTab === index ? null : index);
    const options: ValueAnimationTransition = { duration: 2, ease: "easeInOut" };
    animate(backgroundSizeX, [backgroundSizeX.get(), tabs[index].backgroundSizeX], options);
    animate(backgroundPositionX, [backgroundPositionX.get(), tabs[index].backgroundPositionX], options);
    animate(backgroundPositionY, [backgroundPositionY.get(), tabs[index].backgroundPositionY], options);
  };

  return (
    <section id ="features" className="py-20 md:py-24">
      <div className="container mx-auto">
        <h2 className="text-5xl md:text-6xl font-medium text-center mb-8">Urban Nav: AI Traffic Management</h2>
        <div className="grid lg:grid-cols-2 gap-6">
          {tabs.map((tab, idx) => (
            <FeatureTab
              key={idx}
              {...tab}
              selected={selectedTab === idx}
              expanded={expandedTab === idx}
              onClick={(e) => handleSelectTab(idx, e)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}