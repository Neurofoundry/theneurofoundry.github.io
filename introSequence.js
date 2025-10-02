
(function() {
  const container = document.getElementById("introContainer");
  container.innerHTML = `
    <video id="introVid" autoplay muted playsinline>
      <source src="architect_flash_at_4.2.mp4" type="video/mp4" />
    </video>
    <div id="introOverlay">
      <img src="brain.png" id="brainImg" />
      <svg id="brainNodesSVG" width="420" height="420"></svg>
    </div>
  `;

  const nodeCount = 14;
  const nodeColors = Array(nodeCount).fill("#ff7d5a");
  const svg = container.querySelector("#brainNodesSVG");

  function animateNodes(t) {
    svg.innerHTML = '';
    for (let i = 0; i < nodeCount; ++i) {
      let theta = (i / nodeCount) * 2 * Math.PI + Math.sin(t * 1.2 + i) * 0.5;
      let rad = 140 + Math.sin(t * 1.8 + i * 1.7) * 38;
      let x = 210 + Math.cos(theta) * rad * 0.7 + Math.sin(t * 2.4 + i) * 18;
      let y = 210 + Math.sin(theta) * rad * 0.9 + Math.cos(t * 1.6 + i * 1.3) * 14;
      let node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      node.setAttribute("cx", x);
      node.setAttribute("cy", y);
      node.setAttribute("r", 7);
      node.setAttribute("fill", nodeColors[i]);
      node.setAttribute("opacity", "0.8");
      node.setAttribute("filter", "url(#glow)");
      svg.appendChild(node);
    }
    svg.innerHTML += \`
      <defs>
        <filter id="glow" x="-40%" y="-40%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>\`;
  }

  function loop() {
    let t = performance.now() / 1000;
    animateNodes(t);
    requestAnimationFrame(loop);
  }

  loop();

  const vid = container.querySelector("#introVid");
  vid.addEventListener("timeupdate", () => {
    if (vid.currentTime >= 4.35) {
      vid.style.display = "none";
      container.querySelector("#introOverlay").style.display = "flex";
    }
  });

  setTimeout(() => {
    container.querySelector("#introOverlay").style.opacity = 0;
    setTimeout(() => container.remove(), 700);
  }, 12000);
})();
