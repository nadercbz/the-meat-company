/* Rauch im Hero: ein kleiner WebGL Shader (fbm mit Domain Warping) in halber
   Auflösung, darüber aufsteigende Glut auf einem 2D Canvas. Läuft nur, solange
   der Hero sichtbar ist. Fällt ohne WebGL auf den CSS Verlauf zurück. */
(function () {
  "use strict";

  var FRAG = [
    "precision mediump float;",
    "uniform vec2 r; uniform float t; uniform vec2 m; uniform float fade;",
    "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
    "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
    "return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}",
    "float fbm(vec2 p){float v=0.,a=.5;mat2 R=mat2(.8,.6,-.6,.8);",
    "for(int i=0;i<5;i++){v+=a*n(p);p=R*p*2.03;a*=.5;}return v;}",
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/r;",
    "  vec2 p=(gl_FragCoord.xy-.5*r)/r.y;",
    "  float T=t*.6;",
    "  vec2 q=vec2(fbm(p*1.4+vec2(0.,-T*.10)),fbm(p*1.4+vec2(5.2,1.3)-vec2(0.,T*.08)));",
    "  vec2 w=vec2(fbm(p*1.8+q*2.2+vec2(1.7,9.2)+vec2(m.x*.25,-T*.14)),fbm(p*1.8+q*2.2+vec2(8.3,2.8)-vec2(0.,T*.11)));",
    "  float s=fbm(p*2.+w*1.6);",
    "  float rise=smoothstep(1.15,-.25,uv.y);",
    "  float smoke=smoothstep(.42,1.,s)*(.25+.75*rise);",
    "  vec3 col=vec3(.043,.039,.035);",
    "  col+=vec3(.32,.29,.26)*smoke*.34;",
    "  vec2 g=(p-vec2(m.x*.05,-.42))*vec2(.85,1.35);",
    "  float glow=exp(-2.6*dot(g,g)*2.2);",
    "  col+=vec3(.78,.34,.14)*glow*(.30+.35*s);",
    "  col+=vec3(1.,.55,.25)*smoke*glow*.55;",
    "  float vig=smoothstep(1.25,.25,length(p*vec2(.75,1.)));",
    "  col*=mix(.45,1.,vig);",
    "  col=mix(vec3(.043,.039,.035),col,fade);",
    "  gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");

  var VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";

  function Smoke(canvas, opts) {
    this.c = canvas;
    this.scale = (opts && opts.scale) || 0.5;
    this.mouse = [0, 0];
    this.target = [0, 0];
    this.fade = 0;
    this.running = false;
    this.ok = this.init();
  }

  Smoke.prototype.init = function () {
    var gl = this.c.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return false;
    this.gl = gl;
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    var pr = gl.createProgram();
    gl.attachShader(pr, vs);
    gl.attachShader(pr, fs);
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
    gl.useProgram(pr);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {
      r: gl.getUniformLocation(pr, "r"),
      t: gl.getUniformLocation(pr, "t"),
      m: gl.getUniformLocation(pr, "m"),
      fade: gl.getUniformLocation(pr, "fade")
    };
    this.resize();
    return true;
  };

  Smoke.prototype.resize = function () {
    if (!this.gl) return;
    var w = Math.max(2, Math.round(this.c.clientWidth * this.scale));
    var h = Math.max(2, Math.round(this.c.clientHeight * this.scale));
    if (this.c.width !== w || this.c.height !== h) {
      this.c.width = w;
      this.c.height = h;
      this.gl.viewport(0, 0, w, h);
    }
  };

  Smoke.prototype.pointer = function (x, y) {
    this.target[0] = x * 2 - 1;
    this.target[1] = y * 2 - 1;
  };

  Smoke.prototype.frame = function (time) {
    if (!this.running) return;
    var gl = this.gl;
    this.mouse[0] += (this.target[0] - this.mouse[0]) * 0.04;
    this.mouse[1] += (this.target[1] - this.mouse[1]) * 0.04;
    this.fade = Math.min(1, this.fade + 0.012);
    gl.uniform2f(this.u.r, this.c.width, this.c.height);
    gl.uniform1f(this.u.t, time / 1000);
    gl.uniform2f(this.u.m, this.mouse[0], this.mouse[1]);
    gl.uniform1f(this.u.fade, this.fade);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.raf = requestAnimationFrame(this.frame.bind(this));
  };

  Smoke.prototype.start = function () {
    if (!this.ok || this.running) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.frame.bind(this));
  };

  Smoke.prototype.stop = function () {
    this.running = false;
    cancelAnimationFrame(this.raf);
  };

  /* Glut: wenige warme Funken, die flackernd nach oben steigen */
  function Embers(canvas, count) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.n = count;
    this.p = [];
    this.running = false;
    this.resize();
    for (var i = 0; i < this.n; i++) this.p.push(this.spawn(true));
  }

  Embers.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.w = this.c.clientWidth;
    this.h = this.c.clientHeight;
    this.c.width = this.w * dpr;
    this.c.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  Embers.prototype.spawn = function (anywhere) {
    var cx = this.w * 0.5;
    return {
      x: cx + (Math.random() - 0.5) * this.w * 0.55,
      y: anywhere ? Math.random() * this.h : this.h * (0.75 + Math.random() * 0.3),
      vx: (Math.random() - 0.5) * 0.25,
      vy: -(0.25 + Math.random() * 0.75),
      r: 0.6 + Math.random() * 1.8,
      life: 0,
      max: 260 + Math.random() * 380,
      f: Math.random() * 6.28
    };
  };

  Embers.prototype.frame = function () {
    if (!this.running) return;
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < this.p.length; i++) {
      var e = this.p[i];
      e.life++;
      e.f += 0.08;
      e.x += e.vx + Math.sin(e.f * 0.5) * 0.25;
      e.y += e.vy;
      var k = e.life / e.max;
      var a = Math.sin(Math.min(1, k) * Math.PI) * (0.55 + 0.45 * Math.sin(e.f * 2.3));
      if (k >= 1 || e.y < -10) { this.p[i] = this.spawn(false); continue; }
      var g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 4);
      g.addColorStop(0, "rgba(255,200,140," + (a * 0.95).toFixed(3) + ")");
      g.addColorStop(0.35, "rgba(255,120,50," + (a * 0.45).toFixed(3) + ")");
      g.addColorStop(1, "rgba(255,80,20,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * 4, 0, 6.283);
      ctx.fill();
    }
    this.raf = requestAnimationFrame(this.frame.bind(this));
  };

  Embers.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.frame.bind(this));
  };

  Embers.prototype.stop = function () {
    this.running = false;
    cancelAnimationFrame(this.raf);
  };

  window.TMCSmoke = Smoke;
  window.TMCEmbers = Embers;
})();
