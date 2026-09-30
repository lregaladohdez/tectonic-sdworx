"use client";

import { useEffect, useRef } from "react";

/*
 * Pastel gradient background.
 *
 * A fixed, full-viewport WebGL canvas that sits behind the page (negative
 * z-index, no pointer events). It paints soft pastel "blobs" over the paper:
 * three of them trail the pointer with different lags (sky is quickest, lilac
 * the laziest) and a fourth pink one roams on its own so the page still
 * breathes when the pointer is idle or absent (touch). No dots or texture, so
 * text stays readable on top of it.
 *
 * Colours are read from the CSS tokens in globals.css, so this follows the
 * palette in docs/STYLE.md. When WebGL is unavailable nothing is drawn and the
 * plain paper stays. With `prefers-reduced-motion` a single static frame is
 * rendered.
 */

const MAX_DPR = 2;

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_dpr;
uniform float u_time;
uniform vec2 u_p0;
uniform vec2 u_p1;
uniform vec2 u_p2;
uniform vec2 u_p3;
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;

float blob(vec2 p, vec2 c, float sigma) {
  vec2 d = p - c;
  return exp(-dot(d, d) / (2.0 * sigma * sigma));
}

void main() {
  vec2 px = gl_FragCoord.xy / u_dpr;
  float breathe = 1.0 + 0.05 * sin(u_time * 0.6);

  // Trailing blobs are wider but weaker, so they mostly tint the lead one.
  float f0 = blob(px, u_p0, 240.0 * breathe);
  float f1 = 0.8 * blob(px, u_p1, 340.0);
  float f2 = 0.6 * blob(px, u_p2, 440.0);
  float f3 = 0.7 * blob(px, u_p3, 300.0);
  float sum = f0 + f1 + f2 + f3;
  vec3 tint = (u_c0 * f0 + u_c1 * f1 + u_c2 * f2 + u_c3 * f3) / max(sum, 1e-4);
  tint = mix(tint, tint * tint, 0.35); // deepen without greying, so it reads on paper

  float alpha = 0.7 * smoothstep(0.0, 1.0, clamp(sum, 0.0, 1.0));
  gl_FragColor = vec4(tint, alpha);
}
`;

function hexToRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function token(name: string, fallback: [number, number, number]) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name);
  return hexToRgb(value, fallback);
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("ShaderBackground:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function ShaderBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("ShaderBackground:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uRes = u("u_res");
    const uDpr = u("u_dpr");
    const uTime = u("u_time");
    const uP = [u("u_p0"), u("u_p1"), u("u_p2"), u("u_p3")];

    gl.uniform3fv(u("u_c0"), token("--color-sky", [0.62, 0.82, 1]));
    gl.uniform3fv(u("u_c1"), token("--color-mint", [0.5, 0.89, 0.77]));
    gl.uniform3fv(u("u_c2"), token("--color-lilac", [0.79, 0.72, 1]));
    gl.uniform3fv(u("u_c3"), token("--color-pink", [1, 0.7, 0.78]));

    document.documentElement.dataset.shader = "on";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Pointer target and the three trailing blobs, in CSS px with y up.
    const target = { x: 0, y: 0 };
    const blobs = [
      { x: 0, y: 0, k: 2.4 },
      { x: 0, y: 0, k: 1.1 },
      { x: 0, y: 0, k: 0.55 },
    ];
    let seeded = false;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, width, height);
      gl.uniform1f(uDpr, dpr);
      if (!seeded) {
        target.x = width * 0.6;
        target.y = height * 0.55;
        for (const b of blobs) {
          b.x = target.x;
          b.y = target.y;
        }
        seeded = true;
      }
    };

    const onPointer = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = height - e.clientY;
    };

    let frame = 0;
    let last = performance.now();
    const start = last;

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const t = (now - start) / 1000;
      const animate = !reduceMotion.matches;

      blobs.forEach((b, i) => {
        // Exponential lag toward the pointer, plus a slow drift so the
        // trailing blobs never sit exactly on top of each other.
        const ease = animate ? 1 - Math.exp(-dt * b.k) : 1;
        b.x += (target.x - b.x) * ease;
        b.y += (target.y - b.y) * ease;
        const drift = animate ? 28 * (i + 1) : 0;
        const dx = Math.sin(t * 0.21 + i * 2.1) * drift;
        const dy = Math.cos(t * 0.17 + i * 1.3) * drift;
        gl.uniform2f(uP[i], b.x + dx, b.y + dy);
      });

      // The roaming blob ignores the pointer and wanders the viewport.
      const rt = animate ? t : 0;
      gl.uniform2f(
        uP[3],
        width * (0.5 + 0.38 * Math.sin(rt * 0.061 + 0.8)),
        height * (0.5 + 0.34 * Math.cos(rt * 0.047)),
      );

      gl.uniform1f(uTime, animate ? t : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const loop = (now: number) => {
      draw(now);
      frame = requestAnimationFrame(loop);
    };

    const startLoop = () => {
      cancelAnimationFrame(frame);
      last = performance.now();
      if (reduceMotion.matches) {
        draw(last);
      } else {
        frame = requestAnimationFrame(loop);
      }
    };

    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(frame);
      else startLoop();
    };

    resize();
    startLoop();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    reduceMotion.addEventListener("change", startLoop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      reduceMotion.removeEventListener("change", startLoop);
      delete document.documentElement.dataset.shader;
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
}
