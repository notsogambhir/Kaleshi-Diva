import * as THREE from "three";

export function createTexture(type: string): THREE.Texture {
  const cvs = document.createElement("canvas");
  cvs.width = 512;
  cvs.height = 512;
  const cx = cvs.getContext("2d")!;

  if (type === "grass") {
    // Beautiful stylized grassy gradient base
    const grad = cx.createRadialGradient(256, 256, 0, 256, 256, 362);
    grad.addColorStop(0, "#4caf50");
    grad.addColorStop(1, "#388e3c");
    cx.fillStyle = grad;
    cx.fillRect(0, 0, 512, 512);

    // Fluffy grass tufts overlay
    for (let i = 0; i < 4000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        cx.fillStyle = Math.random() > 0.6 ? "#66bb6a" : "#2e7d32";
        cx.beginPath();
        cx.ellipse(x, y, 3, 8, Math.random() * 0.5, 0, Math.PI * 2);
        cx.fill();
    }
  } else if (type === "water") {
    // Vibrant stylized water
    const grad = cx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, "#00ACC1");
    grad.addColorStop(1, "#0288D1");
    cx.fillStyle = grad;
    cx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1500; i++) {
      cx.fillStyle = Math.random() > 0.5 ? "rgba(79, 195, 247, 0.4)" : "rgba(179, 229, 252, 0.3)";
      const w = Math.random() * 30 + 10,
        h = 3;
      cx.beginPath();
      cx.roundRect(Math.random() * 512, Math.random() * 512, w, h, 2);
      cx.fill();
    }
  } else if (type === "jungle") {
    // Deep mossy jungle floor
    cx.fillStyle = "#1B5E20";
    cx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2000; i++) {
      cx.fillStyle = "#33691E";
      cx.beginPath();
      cx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 6 + 2, 0, Math.PI * 2);
      cx.fill();
    }
    for (let i = 0; i < 1000; i++) {
      cx.fillStyle = "rgba(0, 0, 0, 0.1)";
      cx.beginPath();
      cx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 10 + 5, 0, Math.PI * 2);
      cx.fill();
    }
  } else if (type === "sky_sunset") {
    const grad = cx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, "#000033");
    grad.addColorStop(0.3, "#4a148c");
    grad.addColorStop(0.48, "#d50000");
    grad.addColorStop(0.5, "#ff6f00");
    grad.addColorStop(0.52, "#d50000");
    grad.addColorStop(1, "#000000");
    cx.fillStyle = grad;
    cx.fillRect(0, 0, 512, 512);

    // Stars
    cx.fillStyle = "white";
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 240;
      const r = Math.random() * 1.5;
      cx.globalAlpha = Math.random();
      cx.beginPath();
      cx.arc(x, y, r, 0, Math.PI * 2);
      cx.fill();
    }
    cx.globalAlpha = 1.0;

    // Sun
    cx.shadowColor = "#ffd54f";
    cx.shadowBlur = 40;
    cx.fillStyle = "#ffeb3b";
    cx.beginPath();
    cx.arc(256, 256, 40, 0, Math.PI * 2);
    cx.fill();
    cx.shadowBlur = 0;
  } else if (type === "road_asphalt") {
    // Professional Athletics Running Track (Red with 3 distinct lanes)
    cx.fillStyle = "#C62828"; // Tartan track red/orange
    cx.fillRect(0, 0, 512, 512);

    // Add granular rubber texture
    for (let i = 0; i < 15000; i++) {
      cx.fillStyle = Math.random() > 0.5 ? "rgba(183, 28, 28, 0.6)" : "rgba(229, 57, 53, 0.6)";
      cx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    for (let i = 0; i < 5000; i++) {
      cx.fillStyle = "rgba(0, 0, 0, 0.1)";
      cx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }

    // White Lane Lines (3 lanes, standard thickness, dashed lines usually or solid)
    cx.fillStyle = "rgba(255, 255, 255, 0.9)";
    const laneW = 512 / 3;
    
    // Solid outer/inner lines
    cx.fillRect(4, 0, 8, 512);
    cx.fillRect(512 - 12, 0, 8, 512);

    // Solid inner lane dividers (or dashed, solid is cleaner)
    cx.fillRect(laneW - 4, 0, 8, 512);
    cx.fillRect(laneW * 2 - 4, 0, 8, 512);
    
    // Add numbers or arrows periodically (we can simulate with shapes)
  } else if (type === "road_wood") {
    // Polished Boardwalk
    cx.fillStyle = "#795548";
    cx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 32) {
      // Planks
      cx.fillStyle = "#5D4037"; // Dark gap
      cx.fillRect(0, y, 512, 4);
      cx.fillStyle = "#8D6E63"; // Lighter highlight
      cx.fillRect(0, y + 4, 512, 2);
      
      // Nails
      cx.fillStyle = "#3E2723";
      cx.beginPath(); cx.arc(24, y + 16, 3, 0, Math.PI*2); cx.fill();
      cx.beginPath(); cx.arc(512 - 24, y + 16, 3, 0, Math.PI*2); cx.fill();
    }
    
    // Wood grain
    cx.fillStyle = "rgba(62, 39, 35, 0.15)";
    for (let i = 0; i < 8000; i++) {
        cx.fillRect(Math.random() * 512, Math.random() * 512, 30, 1.5);
    }
  } else if (type === "road_dirt") {
    // Beautiful Jungle Path (Muddy yellow-brown running path)
    const g = cx.createLinearGradient(0, 0, 512, 0);
    g.addColorStop(0, "#4E342E");
    g.addColorStop(0.1, "#6D4C41");
    g.addColorStop(0.9, "#6D4C41");
    g.addColorStop(1, "#4E342E");
    cx.fillStyle = g;
    cx.fillRect(0, 0, 512, 512);

    // Mud spatters and dirt grain
    for (let i = 0; i < 15000; i++) {
      cx.fillStyle = Math.random() > 0.7 ? "rgba(93, 64, 55, 0.7)" : "rgba(121, 85, 72, 0.6)";
      cx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 6, Math.random() * 4);
    }

    // Footprints or worn trail centers
    const laneW = 512 / 3;
    cx.fillStyle = "rgba(0, 0, 0, 0.15)";
    // Worn path markings
    for (let i=0; i<3; i++) {
        cx.fillRect(laneW * i + laneW/2 - 30, 0, 60, 512);
        for(let j=0; j<50; j++) {
             cx.beginPath();
             cx.arc(laneW * i + laneW/2 + (Math.random()-0.5)*40, Math.random() * 512, 5+Math.random()*15, 0, Math.PI*2);
             cx.fill();
        }
    }
  } else if (type === "cobblestone") {
    cx.fillStyle = "#757575";
    cx.fillRect(0, 0, 512, 512);
    cx.strokeStyle = "#424242";
    cx.lineWidth = 4;
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 512,
        y = Math.random() * 512;
      const w = 30 + Math.random() * 40,
        h = 20 + Math.random() * 30;
      cx.fillStyle = Math.random() > 0.5 ? "#9E9E9E" : "#616161";
      cx.fillRect(x, y, w, h);
      cx.strokeRect(x, y, w, h);
    }
  } else if (type === "rose") {
    cx.fillStyle = "#2E7D32";
    cx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2000; i++) {
      cx.fillStyle = "#1B5E20";
      cx.fillRect(Math.random() * 512, Math.random() * 512, 10, 10);
    }
    cx.fillStyle = "#D32F2F";
    for (let i = 0; i < 100; i++) {
      cx.beginPath();
      cx.arc(Math.random() * 512, Math.random() * 512, 15, 0, Math.PI * 2);
      cx.fill();
    }
  } else if (type === "dress") {
    cx.fillStyle = "#FFD700";
    cx.fillRect(0, 0, 512, 512);
    cx.fillStyle = "#F57F17";
    for (let i = 0; i < 100; i++) {
      cx.beginPath();
      cx.arc(Math.random() * 512, Math.random() * 512, 10, 0, Math.PI * 2);
      cx.fill();
    }
  } else if (type === "wood") {
    cx.fillStyle = "#8D6E63";
    cx.fillRect(0, 0, 512, 512);
    cx.fillStyle = "#6D4C41";
    for (let i = 0; i < 512; i += 10) cx.fillRect(i, 0, 2, 512);
  } else if (type === "leaf") {
    cx.fillStyle = "#2E7D32";
    cx.fillRect(0, 0, 512, 512);
    cx.fillStyle = "#1B5E20";
    for (let i = 0; i < 200; i++)
      cx.fillRect(Math.random() * 512, Math.random() * 512, 10, 10);
  }

  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace; // better colors
  tex.generateMipmaps = true;
  return tex;
}

